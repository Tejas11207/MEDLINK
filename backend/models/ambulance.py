from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
import datetime
from models.base import Base

class Ambulance(Base):
    __tablename__ = "ambulances"
    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String, default="AVAILABLE")
    crew_status = Column(String, default="READY")
    equipment_level = Column(String, default="BASIC")
    current_incident_id = Column(Integer, ForeignKey("emergency_cases.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
