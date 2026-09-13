import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from models import Base, User, Hospital, Ambulance, EmergencyCase, HospitalResponse, AuditLog, PatientHealthProfile, HospitalResourceUnit
from auth import get_password_hash
import os
import random
from datetime import datetime, timedelta
from database import engine, SessionLocal

jaipur_center = (26.9124, 75.7873)

hospitals_data = [
    {
        "name": "SMS Hospital", 
        "lat": 26.8929, "lng": 75.8152, 
        "icu": 24, "beds": 120, "trauma": True, "verified": True, 
        "caps": "Emergency Stabilization, Trauma Care, Cardiac ICU, Burn Unit, Blood Bank",
        "phone": "+91 141 2560291"
    },
    {
        "name": "Fortis Escorts Hospital", 
        "lat": 26.8407, "lng": 75.8037, 
        "icu": 18, "beds": 90, "trauma": True, "verified": True, 
        "caps": "Emergency Stabilization, Cardiac ICU, Cath Lab, Neuro ICU, 24x7 Stroke Unit",
        "phone": "+91 141 2547000"
    },
    {
        "name": "Apex Hospital", 
        "lat": 26.8524, "lng": 75.8099, 
        "icu": 10, "beds": 60, "trauma": False, "verified": True, 
        "caps": "General Emergency, Pediatric ICU, Emergency Stabilization",
        "phone": "+91 141 2751871"
    },
    {
        "name": "Mahatma Gandhi Hospital", 
        "lat": 26.7729, "lng": 75.8675, 
        "icu": 20, "beds": 110, "trauma": True, "verified": True, 
        "caps": "Emergency Stabilization, Trauma Care, Multi-Organ Transplant, Advanced ICU",
        "phone": "+91 141 2771777"
    },
    {
        "name": "Rukmani Birla Hospital", 
        "lat": 26.8744, "lng": 75.7909, 
        "icu": 14, "beds": 75, "trauma": False, "verified": True, 
        "caps": "Emergency Stabilization, Cardiac Care, Dialysis, General ICU",
        "phone": "+91 141 3090309"
    },
    {
        "name": "Santokba Durlabhji Memorial", 
        "lat": 26.8851, "lng": 75.8083, 
        "icu": 16, "beds": 85, "trauma": True, "verified": True, 
        "caps": "Emergency Stabilization, Trauma Care, Pediatric ICU, Pulmonary Emergency",
        "phone": "+91 141 2566251"
    },
    {
        "name": "Narayana Multispeciality", 
        "lat": 26.8126, "lng": 75.8117, 
        "icu": 15, "beds": 80, "trauma": True, "verified": True, 
        "caps": "Emergency Stabilization, Cardiac ICU, Advanced Trauma, Vascular Surgery",
        "phone": "+91 141 7122222"
    },
    {
        "name": "CityCare Emergency Clinic", 
        "lat": 26.9250, "lng": 75.7720, 
        "icu": 4, "beds": 25, "trauma": False, "verified": False, 
        "caps": "Primary Emergency Triage, First Aid Stabilization",
        "phone": "+91 141 2365899"
    }
]

async def seed_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    async with SessionLocal() as session:
        # 1. Seed Demo Hospitals
        hospitals = []
        for h in hospitals_data:
            avail_icu = random.randint(3, h["icu"])
            hospital = Hospital(
                name=h["name"],
                latitude=h["lat"],
                longitude=h["lng"],
                address="Jaipur, Rajasthan",
                verified=h["verified"],
                emergency_status="ONLINE" if h["verified"] else "OFFLINE",
                capabilities=h["caps"],
                emergency_capacity=h["beds"],
                available_beds=h["beds"] - random.randint(5, 15),
                available_icu=avail_icu,
                oxygen_available=True,
                blood_units=random.randint(25, 60),
                trauma_capability=h["trauma"],
                contact_phone=h["phone"]
            )
            hospitals.append(hospital)
        session.add_all(hospitals)
        await session.flush()
        
        # 2. Seed Demo Users for MedLink Roles
        users = [
            # USER Role
            User(name="Rahul Sharma (Patient Attendant)", email="user@medlink.demo", phone="+91-9876543210", password_hash=get_password_hash("Demo@123"), role="USER"),
            # HOSPITAL Role
            User(name="SMS ER Desk Coordinator", email="sms@medlink.demo", phone="+91-141-2560291", password_hash=get_password_hash("Demo@123"), role="HOSPITAL", hospital_id=hospitals[0].id),
            User(name="Fortis Emergency Director", email="fortis@medlink.demo", phone="+91-141-2547000", password_hash=get_password_hash("Demo@123"), role="HOSPITAL", hospital_id=hospitals[1].id),
            User(name="Apex Triage Coordinator", email="apex@medlink.demo", phone="+91-141-2751871", password_hash=get_password_hash("Demo@123"), role="HOSPITAL", hospital_id=hospitals[2].id),
            # ADMIN Role
            User(name="State Emergency Network Admin", email="admin@medlink.demo", phone="+91-11-23000000", password_hash=get_password_hash("Demo@123"), role="ADMIN"),
            # Legacy compatibility users
            User(name="Dispatcher", email="dispatcher@byteforge.demo", password_hash=get_password_hash("Demo@123"), role="ADMIN"),
            User(name="Hospital Admin", email="hospital@byteforge.demo", password_hash=get_password_hash("Demo@123"), role="HOSPITAL", hospital_id=hospitals[0].id)
        ]
        session.add_all(users)
        await session.flush()

        # 3. Seed Hospital ICU Beds
        for hosp in hospitals:
            target_icu = next(d['icu'] for d in hospitals_data if d['name'] == hosp.name)
            for i in range(target_icu):
                status = "AVAILABLE" if i < hosp.available_icu else "OCCUPIED"
                res = HospitalResourceUnit(
                    hospital_id=hosp.id,
                    resource_type="ICU_BED",
                    unit_identifier=f"ICU-{hosp.id}-{i+1:03d}",
                    status=status
                )
                session.add(res)
                
        # 4. Seed Ambulances
        ambulances = []
        for i in range(1, 12):
            amb = Ambulance(
                vehicle_number=f"RJ14-AMB-{i:02d}",
                type=random.choice(["ALS", "BLS"]),
                latitude=jaipur_center[0] + random.uniform(-0.04, 0.04),
                longitude=jaipur_center[1] + random.uniform(-0.04, 0.04),
                status="AVAILABLE" if i <= 8 else "DISPATCHED",
                crew_status="READY",
                equipment_level="ADVANCED" if i <= 5 else "BASIC"
            )
            ambulances.append(amb)
        session.add_all(ambulances)
        await session.flush()

        # 5. Golden Path Demo Case (ML-1042)
        golden_case = EmergencyCase(
            case_code="ML-1042",
            user_id=users[0].id,
            transport_mode="SELF_TRANSPORT",
            patient_name="Rajesh Sharma",
            patient_age=58,
            condition="Severe breathing difficulty",
            priority="HIGH",
            requirements="Emergency stabilization",
            vitals="Heart Rate: 112 bpm, SpO2: 89%, BP: 145/95",
            latitude=26.8500,
            longitude=75.7950,
            address="Malviya Nagar, Jaipur, Rajasthan",
            status="ACCEPTED",
            description="Patient with acute respiratory distress transported by family car."
        )
        session.add(golden_case)
        await session.flush()

        # Add Responses for Golden Path
        # Hospital A (Apex): REJECTED
        resp_a = HospitalResponse(
            case_id=golden_case.id,
            hospital_id=hospitals[2].id, # Apex
            response="REJECTED",
            rejection_reason="Required capability/resource unavailable — Emergency ICU full",
            distance_km=2.4,
            eta=6.0,
            responded_at=datetime.utcnow() - timedelta(minutes=2)
        )
        session.add(resp_a)

        # Hospital B (Fortis): ACCEPTED (ETA 8 min) -> Recommended Fastest Feasible Option
        resp_b = HospitalResponse(
            case_id=golden_case.id,
            hospital_id=hospitals[1].id, # Fortis
            response="ACCEPTED",
            distance_km=3.8,
            eta=8.0,
            responded_at=datetime.utcnow() - timedelta(minutes=1, seconds=30)
        )
        session.add(resp_b)

        # Hospital C (SMS): ACCEPTED (ETA 13 min)
        resp_c = HospitalResponse(
            case_id=golden_case.id,
            hospital_id=hospitals[0].id, # SMS
            response="ACCEPTED",
            distance_km=5.2,
            eta=13.0,
            responded_at=datetime.utcnow() - timedelta(minutes=1)
        )
        session.add(resp_c)

        # Other verified hospitals: PENDING
        for h in hospitals[3:6]:
            resp_p = HospitalResponse(
                case_id=golden_case.id,
                hospital_id=h.id,
                response="PENDING",
                distance_km=random.uniform(7.0, 14.0),
                eta=random.uniform(18.0, 32.0)
            )
            session.add(resp_p)

        # 6. Historical Emergency Cases
        conditions = ["Acute Chest Pain", "Severe Trauma", "Stroke Symptoms", "Respiratory Failure", "Fall from Height"]
        priorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
        for i in range(1, 25):
            created = datetime.utcnow() - timedelta(days=random.randint(1, 20), hours=random.randint(1, 23))
            sel_hosp = random.choice(hospitals[:6])
            h_case = EmergencyCase(
                case_code=f"ML-{1000 + i}",
                user_id=users[0].id if i % 2 == 0 else None,
                transport_mode="AMBULANCE" if i % 2 == 0 else "SELF_TRANSPORT",
                patient_name=f"Patient {i}",
                patient_age=random.randint(22, 78),
                condition=random.choice(conditions),
                priority=random.choice(priorities),
                requirements="Emergency stabilization",
                latitude=jaipur_center[0] + random.uniform(-0.08, 0.08),
                longitude=jaipur_center[1] + random.uniform(-0.08, 0.08),
                status="COMPLETED",
                selected_hospital_id=sel_hosp.id,
                selected_hospital_eta=random.uniform(6.0, 16.0),
                created_at=created
            )
            session.add(h_case)
            await session.flush()
            
            audit = AuditLog(
                case_id=h_case.id,
                performed_by=sel_hosp.name,
                action="CASE_COMPLETED",
                details=f"Patient arrived and admitted to {sel_hosp.name}.",
                timestamp=created + timedelta(minutes=random.randint(15, 45))
            )
            session.add(audit)

        await session.commit()
        print("MedLink database successfully seeded with USER, HOSPITAL, and ADMIN roles + Golden Path demo case ML-1042!")

if __name__ == "__main__":
    asyncio.run(seed_db())
