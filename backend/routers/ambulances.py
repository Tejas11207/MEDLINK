from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from schemas import AmbulanceOut, AmbulanceUpdateLocation, AmbulanceUpdateStatus
from models import Ambulance
from database import get_db

router = APIRouter(prefix="/api/ambulances", tags=["ambulances"])

@router.get("", response_model=List[AmbulanceOut])
async def get_ambulances(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ambulance))
    return result.scalars().all()

@router.get("/{id}", response_model=AmbulanceOut)
async def get_ambulance(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ambulance).where(Ambulance.id == id))
    amb = result.scalars().first()
    if not amb:
        raise HTTPException(status_code=404, detail="Not found")
    return amb

@router.patch("/{id}/location", response_model=AmbulanceOut)
async def update_location(id: int, loc: AmbulanceUpdateLocation, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ambulance).where(Ambulance.id == id))
    amb = result.scalars().first()
    if not amb:
        raise HTTPException(status_code=404, detail="Not found")
    amb.latitude = loc.latitude
    amb.longitude = loc.longitude
    await db.commit()
    await db.refresh(amb)
    return amb

@router.patch("/{id}/status", response_model=AmbulanceOut)
async def update_status(id: int, status_update: AmbulanceUpdateStatus, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ambulance).where(Ambulance.id == id))
    amb = result.scalars().first()
    if not amb:
        raise HTTPException(status_code=404, detail="Not found")
    amb.status = status_update.status
    await db.commit()
    await db.refresh(amb)
    return amb
