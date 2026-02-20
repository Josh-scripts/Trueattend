# 🎓 TrueAttend — AI-Powered Smart Proxy-Free Attendance System

> Hackathon project | Python + Flask + face_recognition + SocketIO

---

## 🏗️ Project Structure

```
trueattend/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── config.py            # All configuration
│   ├── models.py            # SQLAlchemy DB models
│   ├── ml/
│   │   ├── face_engine.py   # ⭐ Core face recognition (CNN embeddings)
│   │   └── session_manager.py # Session orchestration & alerting
│   ├── routes/
│   │   ├── auth.py          # Login, JWT refresh, password change
│   │   ├── attendance.py    # Session start/stop, records, overrides
│   │   ├── admin.py         # User management, reports, dashboard
│   │   ├── professor.py     # Course management, student attendance
│   │   ├── student.py       # View attendance, face registration, leave
│   │   └── camera.py        # Camera list + SocketIO events
│   └── utils/
│       ├── decorators.py    # @role_required
│       ├── helpers.py       # Singleton engine/manager accessors
│       └── notifications.py # Email/push notifications
├── scripts/
│   └── seed.py              # Demo data seeder
├── known_faces/             # Face encoding DB (auto-created)
├── uploads/                 # Uploaded images & unknown face crops
├── run.py                   # Entry point
├── requirements.txt
└── .env.example
```

---

## ⚙️ Setup

### 1. Prerequisites

```bash
# System dependencies (Ubuntu/Debian)
sudo apt-get install cmake libboost-all-dev

# macOS
brew install cmake boost
```

### 2. Python Environment

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

> **Note:** `face_recognition` requires `dlib` which needs cmake.
> If it fails, try: `pip install dlib --no-cache-dir` first.

### 3. Configure

```bash
cp .env.example .env
# Edit .env with your settings
```

### 4. Database & Seed

```bash
python scripts/seed.py
```

### 5. Run

```bash
python run.py
# Server starts at http://localhost:5000
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/change-password` | Change password |

### Attendance (Professor/Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attendance/session/start` | Start attendance session |
| POST | `/api/attendance/session/<id>/stop` | Stop & finalise session |
| GET | `/api/attendance/session/<id>/status` | Live session status |
| GET | `/api/attendance/session/<id>/records` | Get all records |
| PUT | `/api/attendance/record/<id>/override` | Manual override |
| GET | `/api/attendance/session/<id>/alerts` | Get session alerts |
| POST | `/api/attendance/analyse-frame` | Analyse single base64 frame |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | System stats |
| POST | `/api/admin/students` | Register student |
| POST | `/api/admin/professors` | Register professor |
| GET/POST | `/api/admin/courses` | List/create courses |
| POST | `/api/admin/courses/<id>/enroll` | Enroll student |
| GET | `/api/admin/alerts` | All alerts |
| GET | `/api/admin/reports/attendance` | Attendance report |

### Student
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/my-attendance` | Personal attendance records |
| POST | `/api/student/register-face` | Upload face images for registration |
| POST | `/api/student/leave-request` | Submit leave request |

---

## 🧠 ML Pipeline

```
Camera Frame
    │
    ▼
Face Detection (HOG / CNN via dlib)
    │
    ▼
Liveness Check (Laplacian variance / LBP anti-spoof)
    │
    ▼
128-d Face Embedding (dlib ResNet-34 deep metric learning)
    │
    ▼
Cosine / L2 Distance vs enrolled face DB
    │
    ├─ Match (distance < 0.50) → Mark Present ✅
    └─ No Match → Unknown Face Alert ⚠️
    
    ▼
Headcount Verification
    │
    ├─ detected faces == enrolled count → All Good ✅
    └─ mismatch → Proxy/Excess Alert 🚨
```

---

## 🌟 Key Features

| Feature | Description |
|---------|-------------|
| 🤖 CNN Face Embeddings | 128-dimensional face vectors via dlib ResNet-34 |
| 🛡️ Liveness Detection | Anti-spoofing (photo/video attack prevention) |
| 🔢 Headcount Verification | Detects extra/missing people vs enrollment |
| ⚡ Real-time Alerts | SocketIO push alerts to professor & admin |
| 📹 Live Camera Feed | Annotated feed streamed to admin dashboard |
| 👤 Multi-sample Registration | 10+ face samples per student for accuracy |
| 🔄 Manual Override | Professor can correct any auto-marked record |
| 📊 Attendance Reports | Per-student, per-course, at-risk flagging |
| 📧 Email Notifications | Low attendance warnings, proxy alerts |
| 🔐 Role-based Access | Admin / Professor / Student JWT auth |
| 📁 Audit Trail | Full session logs, snapshot storage |
| 🙏 Leave Requests | Students submit leave; staff approve/reject |

---

## 🖥️ Frontend (v0.dev)

Build your UI at https://v0.dev using these component suggestions:

1. **Login Page** — role selector + email/password form
2. **Professor Dashboard** — course list, "Mark Attendance" button, live camera feed card
3. **Admin Dashboard** — stats cards, camera feeds grid, alerts panel, reports table
4. **Student Dashboard** — attendance % per course, calendar heat map, leave request form
5. **Face Registration** — webcam capture widget (multiple frames)

Connect to backend via:
```js
// REST
const res = await fetch("http://localhost:5000/api/auth/login", {...})

// SocketIO
import { io } from "socket.io-client"
const socket = io("http://localhost:5000")
socket.emit("join_professor", { professor_id: 1 })
socket.on("attendance_alert", (data) => showAlert(data))
socket.on("camera_frame", (data) => updateFeed(data.frame))
```

---

## 🚀 Deployment

```bash
# Production with gunicorn + eventlet
gunicorn -k eventlet -w 1 "run:app" --bind 0.0.0.0:5000
```

Use Nginx as reverse proxy. PostgreSQL recommended for production DB.
