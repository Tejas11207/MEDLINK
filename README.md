ByteForge - Smart India Hackathon 2026

ByteForge is a production-ready, full-stack MVP designed to solve the Real-Time Emergency Resource Allocation problem for SIH 2026.

Architecture & Tech Stack

Frontend: Next.js 15, React, TypeScript, Tailwind CSS, MapLibre GL, Recharts, Framer Motion
Backend: FastAPI (Python), SQLAlchemy 2.0 (async), asyncpg, Pydantic, JWT Auth
Database: PostgreSQL (compatible with Supabase)
Features

SOS Emergency Portal: Geo-located emergency requests with overriding priority.
Intelligent Dispatch Engine: AI-assisted scoring algorithm evaluating distance, ETA, clinical suitability, and resource availability to recommend the optimal Ambulance + Hospital pair.
Live Command Dashboard: Real-time simulation mapping ambulances, hospitals, and emergencies.
Hospital Resource Panel: Live updates for ICU, beds, blood, and oxygen availability.
Analytics & History: Interactive data visualization of emergency distributions.
Setup Instructions

1. Database Setup

Ensure PostgreSQL is running locally or use a Supabase project. Update DATABASE_URL in .env. (Check .env.example)

2. Backend

cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
python seed.py  # Seed the database
uvicorn main:app --reload
The API runs at http://localhost:8000. Documentation at http://localhost:8000/docs.

3. Frontend

cd frontend
npm install
npm run dev
The web application runs at http://localhost:3000.

Demo Credentials

Dispatcher: dispatcher@byteforge.demo / Demo@123
Hospital Admin: hospital@byteforge.demo / Demo@123
SIH Demo Flow

Open the Dashboard to show live metrics.
Go to Live Map to view ambulances (green/gray), hospitals (blue), and incidents (red).
Open SOS Emergency, enter patient details and click Send SOS.
The system redirects to the Intelligent Dispatch screen.
Review the AI-generated recommendations and explanation scores.
Click Confirm Dispatch to route the ambulance and notify the hospital.
Return to the dashboard and map to see the updated real-time status.
