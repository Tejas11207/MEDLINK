from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from models.base import Base

class EmergencyCase(Base):
    __tablename__ = "emergency_cases"
    
    id = Column(Integer, primary_key=True, index=True)
    case_code = Column(String, unique=True, index=True, nullable=False) # e.g. ML-1042
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    abha_id = Column(String, nullable=True) # e.g. 91-4829-1048-2041 or ABHA-1234-5678
    transport_mode = Column(String, default="SELF_TRANSPORT") # SELF_TRANSPORT, AMBULANCE
    patient_name = Column(String, nullable=False)
    patient_age = Column(Integer, nullable=True)
    condition = Column(String, nullable=False)
    priority = Column(String, default="HIGH") # CRITICAL, HIGH, MEDIUM, LOW
    requirements = Column(String, default="Emergency stabilization")
    vitals = Column(String, nullable=True) # e.g. "HR: 118 bpm, SpO2: 91%, BP: 90/60"
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String, nullable=True)
    ambulance_details = Column(String, nullable=True) # Used if transport_mode == AMBULANCE
    status = Column(String, default="SEARCHING") # SEARCHING, AWAITING_RESPONSE, ACCEPTED, HOSPITAL_SELECTED, EN_ROUTE, ARRIVED, COMPLETED, CANCELLED
    selected_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    selected_hospital_eta = Column(Float, nullable=True) # in minutes
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", foreign_keys=[user_id])
    selected_hospital = relationship("Hospital", foreign_keys=[selected_hospital_id])
    responses = relationship("HospitalResponse", back_populates="emergency_case", cascade="all, delete-orphan")

# Compatibility alias
Incident = EmergencyCase
