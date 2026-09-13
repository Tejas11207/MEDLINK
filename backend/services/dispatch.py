import math
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import EmergencyCase, Hospital, HospitalResponse, HospitalResourceUnit

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on Earth in km."""
    R = 6371.0 # Earth's radius in kilometers
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def estimate_eta_minutes(distance_km: float, speed_kmh: float = 35.0, traffic_factor: float = 1.15) -> float:
    """Estimate travel time in minutes based on distance, urban speed, and simulated traffic."""
    if distance_km <= 0:
        return 1.0
    time_hours = (distance_km / speed_kmh) * traffic_factor
    minutes = round(time_hours * 60, 1)
    return max(minutes, 2.0)

async def evaluate_decision_engine(db: AsyncSession, case: EmergencyCase) -> Dict[str, Any]:
    """
    MedLink Explainable Decision Engine:
    Among verified hospitals that ACCEPTED the case, recommend the FASTEST feasible option using ETA and capability match.
    """
    # 1. Fetch all responses for this case
    res_query = await db.execute(
        select(HospitalResponse, Hospital)
        .join(Hospital, HospitalResponse.hospital_id == Hospital.id)
        .where(HospitalResponse.case_id == case.id)
    )
    rows = res_query.all()
    
    total_evaluated = len(rows)
    accepted_options = []
    all_options = []
    accepted_count = 0
    rejected_count = 0
    pending_count = 0

    for resp, hosp in rows:
        # Re-verify distance and ETA if not populated
        dist = resp.distance_km if resp.distance_km is not None else calculate_haversine_distance(case.latitude, case.longitude, hosp.latitude, hosp.longitude)
        eta = resp.eta if resp.eta is not None else estimate_eta_minutes(dist)
        
        if resp.response == "ACCEPTED":
            accepted_count += 1
        elif resp.response == "REJECTED":
            rejected_count += 1
        else:
            pending_count += 1
            
        # Check capability match
        req = (case.requirements or "").lower()
        hosp_caps = (hosp.capabilities or "").lower()
        capability_match = True
        if req and req not in ["general emergency", "emergency stabilization"]:
            # Check keywords
            keywords = [w.strip() for w in req.replace(",", " ").split() if len(w) > 3]
            match_found = any(k in hosp_caps for k in keywords) or "trauma" in hosp_caps or "cardiac" in hosp_caps
            capability_match = match_found

        explanation = []
        explanation.append(f"Response Status: {resp.response}")
        if resp.response == "ACCEPTED":
            explanation.append(f"Estimated Travel Time: {eta} mins ({dist} km)")
            explanation.append(f"Facility Readiness: {hosp.available_icu} ICU beds available, {hosp.available_beds} general beds")
            if capability_match:
                explanation.append(f"Capability Match: Verified for '{case.requirements}'")
            else:
                explanation.append("Capability Note: General emergency capability available")
        elif resp.response == "REJECTED":
            explanation.append(f"Rejection Reason: {resp.rejection_reason or 'Resource/capability unavailable'}")
        else:
            explanation.append("Status: Awaiting confirmation from hospital ER desk")

        # Score calculation (Higher is better)
        # Factors: Acceptance (Required), ETA (lower is better), ICU availability
        if resp.response == "ACCEPTED":
            score = max(100.0 - (eta * 3.0) + min(hosp.available_icu * 2.0, 10.0), 10.0)
        elif resp.response == "PENDING":
            score = 20.0
        else:
            score = 0.0

        opt = {
            "hospital_id": hosp.id,
            "hospital_name": hosp.name,
            "hospital_address": hosp.address,
            "hospital_capabilities": hosp.capabilities,
            "response": resp.response,
            "rejection_reason": resp.rejection_reason,
            "eta": eta,
            "distance_km": dist,
            "available_icu": hosp.available_icu,
            "available_beds": hosp.available_beds,
            "is_recommended": False,
            "score": round(score, 1),
            "explanation": explanation,
            "capability_match": capability_match
        }
        all_options.append(opt)
        if resp.response == "ACCEPTED":
            accepted_options.append(opt)

    # Sort accepted options by ETA ascending (fastest accepted option first)
    accepted_options.sort(key=lambda x: (x["eta"], -x["available_icu"]))
    
    recommended_option = None
    if accepted_options:
        recommended_option = accepted_options[0]
        recommended_option["is_recommended"] = True
        recommended_option["explanation"].insert(0, f"⭐ RECOMMENDED: Fastest accepted feasible hospital ({recommended_option['eta']} min ETA)")
        
        # Also mark is_recommended in all_options list
        for o in all_options:
            if o["hospital_id"] == recommended_option["hospital_id"]:
                o["is_recommended"] = True
                o["explanation"] = recommended_option["explanation"]

    # Generate decision summary
    if recommended_option:
        decision_summary = f"Recommended {recommended_option['hospital_name']} ({recommended_option['eta']} min ETA). {accepted_count} hospital(s) accepted, {rejected_count} rejected out of {total_evaluated} nearby facilities."
    elif pending_count > 0:
        decision_summary = f"Broadcasting emergency to {total_evaluated} nearby hospitals. Awaiting responses..."
    else:
        decision_summary = "No hospital has accepted yet. System expanding search radius to secondary network hospitals."

    return {
        "case_id": case.id,
        "case_code": case.case_code,
        "recommended_hospital": recommended_option,
        "all_options": all_options,
        "total_evaluated": total_evaluated,
        "accepted_count": accepted_count,
        "rejected_count": rejected_count,
        "pending_count": pending_count,
        "decision_summary": decision_summary
    }
