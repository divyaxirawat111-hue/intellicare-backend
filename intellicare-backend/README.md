# IntelliCare Backend API

Node.js + Express REST API for the IntelliCare clinical workflow management platform.

## Tech Stack
- **Runtime**: Node.js v20
- **Framework**: Express.js
- **Database**: MongoDB Atlas (via Mongoose)
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Validation**: express-validator
- **Security**: helmet, express-rate-limit, cors

## Getting Started

### 1. Clone and install
```bash
git clone https://github.com/divyaxirawat111-hue/intellicare-backend.git
cd intellicare-backend
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Fill in your MONGO_URI and JWT_SECRET
```

### 3. Run locally
```bash
npm run dev
```

The API will be running at `http://localhost:5000`

---

## Implemented Endpoints (Assignment 2)

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT |

### Clinical Notes
| Method | Route | Auth | Role |
|--------|-------|------|------|
| POST | `/api/notes` | JWT | clinician |
| GET | `/api/notes?patientId=PAT-001` | JWT | clinician, admin |
| GET | `/api/notes/:noteId` | JWT | clinician, admin |

---

## Deployed API
Base URL: `https://intellicare-api.onrender.com`

## Team
- Divyaxi Rawat (B01034034)
- Harsha Sai Srinivas Pilli (B01073731)
- Malk Daboor (B00953701)
- Samiah Hossain (B00949000)
