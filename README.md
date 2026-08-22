# HealthTrust - Video Consultation Fixed

This version fixes the WebRTC video consultation signalling flow.

## What was fixed
- ICE candidates are queued until a remote SDP description exists.
- Offer/answer/candidate messages carry a consultation session id.
- Stale/mismatched WebRTC signals are ignored.
- Signalling polling is faster and tolerant of temporary request failures.
- The backend looks back up to 5 minutes for signalling messages, so the doctor can join shortly after the patient.
- Local camera/microphone continues to work independently from the remote stream.
- Chat and the rest of the HealthTrust features are preserved.

## Run

### Backend
```cmd
cd backend
npm install
npm start
```

### Frontend
Open another terminal:
```cmd
cd frontend
npm install
npm run dev
```

Create `backend/.env` from `backend/.env.example` and fill in your existing MongoDB/JWT settings.

## Testing video
1. Start backend and frontend.
2. Log in as a patient and a doctor in two separate Chrome profiles/windows.
3. Book a **Video Consult** appointment.
4. Open the same appointment on both sides.
5. Click **Join Video Consultation** on both sides.
6. Allow camera and microphone access.
7. Keep both consultation pages open. The remote video should appear when the WebRTC connection reaches `Connected`.

For localhost/demo testing, the included Google STUN servers are used. Production deployments may require a TURN server for users behind restrictive NAT/firewalls.
