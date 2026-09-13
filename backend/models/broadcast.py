from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
import datetime
from models.base import Base

class IncidentBroadcast(Base):
    __tablename__ = "incident_broadcasts"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("emergency_cases.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    distance_km = Column(Float)
    status = Column(String, default="NOTIFIED") # NOTIFIED, ACKNOWLEDGED, ACCEPTED, DECLINED, EXPIRED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    acknowledged_at = Column(DateTime, nullable=True)
