# TrueAttend UI

Beautiful React frontend for the TrueAttend AI attendance system.

## Setup

```bash
npm install
npm start          # dev server at http://localhost:3000
npm run build      # production build
```

## What's Included

### Pages
- **Login** — animated role selector (Admin / Professor / Student)
- **Admin Dashboard** — stats, area charts, alerts table, bar charts
- **Admin Students** — searchable registry with face status indicators  
- **Admin Live Feeds** — real-time camera feed grid via SocketIO
- **Admin Reports** — attendance % table with at-risk flagging + CSV export
- **Professor Dashboard** — course cards with quick start attendance
- **Professor Mark Attendance** — 3-step flow: Setup → Live Session → Summary
  - Live camera feed via SocketIO
  - Real-time face identification counter
  - Unknown face alerts
  - Session timer
  - Summary modal with doughnut-style stats
- **Student Dashboard** — circular progress ring, per-course bars, session history
- **Student Register Face** — live webcam capture with face guide overlay, thumbnail strip
- **Student Leave Requests** — submit and track leave applications

### Design System
- Dark deep-space theme (#070b14 base)
- Syne (display) + DM Sans (body) + JetBrains Mono fonts
- Framer Motion animations throughout
- Glass morphism cards
- Custom CSS variables for full consistency
- Animated background mesh

### Tech
- React 18 + React Router 6
- Framer Motion (animations)
- Socket.IO client (live feeds + alerts)
- Recharts (Area + Bar charts)
- react-webcam (face capture)
- Axios (API calls with JWT interceptor)
- react-hot-toast (notifications)

## Backend Connection

Make sure backend is running at `http://localhost:5000`.
Change `REACT_APP_API_URL` in `.env` for other hosts.

```
REACT_APP_API_URL=http://your-server:5000
```

## Demo Credentials
- **Admin:**     admin@trueattend.app / Admin@1234
- **Professor:** prof.smith@trueattend.app / Prof@1234  
- **Student:**   student1@trueattend.app / CS2021001
