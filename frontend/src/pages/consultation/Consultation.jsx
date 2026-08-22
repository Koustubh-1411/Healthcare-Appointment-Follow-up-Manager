import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopNav from '../../components/TopNav.jsx';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Consultation() {
  const { appointmentId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('Starting camera…');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const pcRef = useRef(null);
  const pollRef = useRef(null);
  const lastSignalRef = useRef(Date.now() - 15000);
  const seenSignalsRef = useRef(new Set());
  const pendingCandidatesRef = useRef([]);
  const activeSessionRef = useRef(null);
  const localStreamRef = useRef(null);
  const startedRef = useRef(false);

  const isPatient = user?.role === 'patient';

  useEffect(() => {
    let active = true;

    async function start() {
      try {
        const initial = await api.chatMessages(appointmentId);
        if (active) setMessages(initial);

        await setupPeer();
      } catch (e) {
        if (active) setError(e.message || 'Unable to start consultation');
      }
    }

    start();

    const chatTimer = setInterval(async () => {
      try {
        const m = await api.chatMessages(appointmentId);
        if (active) setMessages(m);
      } catch {}
    }, 1500);

    return () => {
      active = false;
      clearInterval(chatTimer);
      clearInterval(pollRef.current);
      startedRef.current = false;

      if (pcRef.current) {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.close();
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [appointmentId]);

  async function sendSignal(type, payload) {
    try {
      await api.sendSignal(appointmentId, type, payload);
    } catch (e) {
      console.warn(`Unable to send ${type} signal`, e);
    }
  }

  async function flushCandidates() {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;

    const activeSession = activeSessionRef.current;
    const pending = pendingCandidatesRef.current.splice(0);

    for (const item of pending) {
      if (item.sessionId && activeSession && item.sessionId !== activeSession) continue;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(item.candidate));
      } catch (e) {
        console.warn('Could not add queued ICE candidate', e);
      }
    }
  }

  async function setRemoteDescription(payload, sessionId) {
    const pc = pcRef.current;
    if (!pc) return;

    if (activeSessionRef.current && sessionId !== activeSessionRef.current) return;

    activeSessionRef.current = sessionId;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: payload.type,
        sdp: payload.sdp,
      }));
      await flushCandidates();
    } catch (e) {
      console.warn('Could not set remote description', e);
    }
  }

  async function setupPeer() {
    if (startedRef.current) return;
    startedRef.current = true;

    const peer = new RTCPeerConnection(ICE);
    pcRef.current = peer;

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === 'connected') {
        setConnected(true);
        setStatus('Connected');
      } else if (state === 'connecting') {
        setConnected(false);
        setStatus('Connecting video…');
      } else if (state === 'disconnected') {
        setConnected(false);
        setStatus('Connection interrupted…');
      } else if (state === 'failed') {
        setConnected(false);
        setStatus('Video connection failed — retrying…');
      } else if (state === 'closed') {
        setConnected(false);
        setStatus('Call ended');
      }
    };

    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'failed') {
        setStatus('Network path failed — retrying…');
      }
    };

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;

      const sessionId = activeSessionRef.current;
      // Patient creates the session before sending candidates.
      // Doctor will use the session ID received in the offer.
      sendSignal('candidate', {
        candidate: event.candidate.toJSON(),
        sessionId,
      });
    };

    peer.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (stream && remoteRef.current && remoteRef.current.srcObject !== stream) {
        remoteRef.current.srcObject = stream;
        remoteRef.current.play?.().catch(() => {});
      }
    };

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is unavailable. Use Chrome/Edge on localhost.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      localStreamRef.current = stream;

      if (localRef.current) {
        localRef.current.srcObject = stream;
        localRef.current.play?.().catch(() => {});
      }

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    } catch (e) {
      setStatus('Camera/microphone permission required');
      setError(e.message || 'Please allow camera and microphone access.');
      return;
    }

    // Patient is the single offerer. A fresh session ID prevents stale
    // signals from an earlier consultation from being applied.
    if (isPatient) {
      const sessionId = `${user?.id || 'patient'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      activeSessionRef.current = sessionId;

      const offer = await peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await peer.setLocalDescription(offer);

      await sendSignal('offer', {
        type: offer.type,
        sdp: offer.sdp,
        sessionId,
      });

      setStatus('Calling doctor…');
    } else {
      setStatus('Waiting for patient…');
    }

    pollRef.current = setInterval(readSignals, 400);
    await readSignals();
  }

  async function readSignals() {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      const list = await api.getSignals(appointmentId, lastSignalRef.current);

      // Move the cursor forward using the newest server timestamp, while
      // keeping a local ID set so equal timestamps are never lost.
      for (const signal of list) {
        if (seenSignalsRef.current.has(signal._id)) continue;
        seenSignalsRef.current.add(signal._id);

        const created = new Date(signal.createdAt).getTime();
        if (Number.isFinite(created)) {
          lastSignalRef.current = Math.max(lastSignalRef.current, created - 1);
        }

        const payload = signal.payload || {};
        const sessionId = payload.sessionId;

        if (signal.type === 'offer' && !isPatient) {
          // If multiple offers exist, the newest one wins.
          activeSessionRef.current = sessionId;

          await setRemoteDescription(
            { type: 'offer', sdp: payload.sdp },
            sessionId
          );

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await sendSignal('answer', {
            type: answer.type,
            sdp: answer.sdp,
            sessionId,
          });

          setStatus('Connecting video…');
        } else if (signal.type === 'answer' && isPatient) {
          if (sessionId !== activeSessionRef.current) continue;

          await setRemoteDescription(
            { type: 'answer', sdp: payload.sdp },
            sessionId
          );

          setStatus('Connecting video…');
        } else if (signal.type === 'candidate') {
          if (!payload.candidate) continue;

          // Candidate may arrive before offer/answer. Never discard it.
          if (sessionId && activeSessionRef.current && sessionId !== activeSessionRef.current) {
            continue;
          }

          if (!sessionId || !activeSessionRef.current) {
            pendingCandidatesRef.current.push({ candidate: payload.candidate, sessionId });
            continue;
          }

          if (pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.warn('Could not add ICE candidate', e);
            }
          } else {
            pendingCandidatesRef.current.push({ candidate: payload.candidate, sessionId });
          }
        }
      }

      await flushCandidates();
    } catch (e) {
      // Polling should not interrupt an active call if one request fails.
      console.warn('WebRTC signalling poll failed', e);
    }
  }

  async function send() {
    if (!text.trim()) return;

    try {
      await api.sendChatMessage(appointmentId, text.trim());
      setText('');
      const m = await api.chatMessages(appointmentId);
      setMessages(m);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <TopNav />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold">Video Consultation</h1>
            <p className="text-slate-500">
              Secure browser-to-browser consultation ·{' '}
              <span className={connected ? 'text-emerald-600 font-medium' : ''}>
                {status}
              </span>
            </p>
          </div>
          <button
            onClick={() => nav(user?.role === 'doctor' ? '/doctor/overview' : '/appointments')}
            className="border px-4 py-2 rounded-lg"
          >
            Back
          </button>
        </div>

        {error && <p className="text-red-600 mb-3">{error}</p>}

        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
          <section className="bg-slate-900 rounded-2xl p-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="relative">
                <video
                  ref={remoteRef}
                  autoPlay
                  playsInline
                  className="w-full aspect-video bg-black rounded-xl object-cover"
                />
                <span className="absolute left-3 bottom-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {connected ? 'Doctor / Patient' : 'Waiting for other participant…'}
                </span>
              </div>

              <div className="relative">
                <video
                  ref={localRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full aspect-video bg-black rounded-xl object-cover"
                />
                <span className="absolute left-3 bottom-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  You
                </span>
              </div>
            </div>

            <p className="text-white text-sm mt-3">
              Keep this page open and allow camera + microphone access.
              WebRTC uses free STUN servers for demo connectivity.
            </p>
          </section>

          <section className="bg-white border rounded-2xl p-4 flex flex-col min-h-[480px]">
            <h2 className="font-semibold mb-3">In-app Chat</h2>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {messages.map((m) => (
                <div
                  key={m._id}
                  className={`max-w-[85%] p-3 rounded-xl ${
                    String(m.sender?._id) === String(user?.id)
                      ? 'ml-auto bg-brand text-white'
                      : 'bg-slate-100'
                  }`}
                >
                  <p className="text-xs opacity-70 mb-1">{m.sender?.name}</p>
                  <p className="text-sm">{m.text}</p>
                </div>
              ))}

              {!messages.length && (
                <p className="text-sm text-slate-400">No messages yet.</p>
              )}
            </div>

            <div className="flex gap-2 mt-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                className="flex-1 border rounded-lg px-3 py-2"
                placeholder="Type a message…"
              />
              <button onClick={send} className="bg-brand text-white px-4 rounded-lg">
                Send
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
