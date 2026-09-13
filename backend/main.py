from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, emergency, hospitals, simulation, admin, dashboard, analytics, health, resources, broadcast, sync
from database import engine, SessionLocal
from models import Base
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="MedLink AI API",
    description="Real-Time Emergency Coordination & Hospital Allocation Platform (SIH 2026)",
    version="2.0.0",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core MedLink Routers
app.include_router(auth.router)
app.include_router(emergency.router)
app.include_router(hospitals.router)
app.include_router(simulation.router)
app.include_router(admin.router)

# Support & Secondary Routers
app.include_router(dashboard.router)
app.include_router(analytics.router)
app.include_router(health.router)
app.include_router(resources.router)
app.include_router(broadcast.router)
app.include_router(sync.router)

@app.get("/")
def root():
    return {
        "platform": "MedLink AI",
        "status": "ONLINE",
        "description": "Real-Time Emergency Coordination Platform. Coordinates fastest accepted feasible hospital allocation.",
        "docs": "/docs"
    }
