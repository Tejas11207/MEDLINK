import asyncio
import httpx
from database import engine, SessionLocal
from models import User, Hospital, EmergencyCase, HospitalResponse
from main import app

async def run_tests():
    print("=== Testing MedLink AI Backend Endpoints ===")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Root
        res = await client.get("/")
        print("Root response:", res.status_code, res.json())
        assert res.status_code == 200

        # 2. Login as USER
        login_res = await client.post("/api/auth/login", data={"username": "user@medlink.demo", "password": "Demo@123"})
        print("User Login:", login_res.status_code, login_res.json()["role"])
        assert login_res.status_code == 200
        assert login_res.json()["role"] == "USER"

        # 3. Login as HOSPITAL
        hosp_login_res = await client.post("/api/auth/login", data={"username": "fortis@medlink.demo", "password": "Demo@123"})
        print("Hospital Login:", hosp_login_res.status_code, hosp_login_res.json()["role"])
        assert hosp_login_res.status_code == 200
        assert hosp_login_res.json()["role"] == "HOSPITAL"

        # 4. Login as ADMIN
        admin_login_res = await client.post("/api/auth/login", data={"username": "admin@medlink.demo", "password": "Demo@123"})
        print("Admin Login:", admin_login_res.status_code, admin_login_res.json()["role"])
        assert admin_login_res.status_code == 200
        assert admin_login_res.json()["role"] == "ADMIN"

        # 5. Golden Path Simulation
        sim_res = await client.post("/api/simulation/golden-path")
        print("Golden Path Simulation:", sim_res.status_code, sim_res.json()["case_code"])
        assert sim_res.status_code == 200
        case_id = sim_res.json()["id"]

        # 6. Decision Engine Recommendation
        rec_res = await client.get(f"/api/emergency/{case_id}/recommendation")
        rec_data = rec_res.json()
        print("Decision Engine Recommendation:", rec_res.status_code)
        print("  - Recommended Hospital:", rec_data["recommended_hospital"]["hospital_name"])
        print("  - ETA:", rec_data["recommended_hospital"]["eta"], "min")
        print("  - Total Evaluated:", rec_data["total_evaluated"])
        print("  - Accepted Count:", rec_data["accepted_count"])
        print("  - Rejected Count:", rec_data["rejected_count"])
        assert rec_res.status_code == 200
        assert rec_data["recommended_hospital"] is not None
        assert "Fortis" in rec_data["recommended_hospital"]["hospital_name"] # Fastest accepted at 8 min

        # 7. Select Hospital
        fortis_id = rec_data["recommended_hospital"]["hospital_id"]
        sel_res = await client.post(f"/api/emergency/{case_id}/select-hospital", json={"hospital_id": fortis_id})
        print("Hospital Selection:", sel_res.status_code, sel_res.json()["status"])
        assert sel_res.status_code == 200
        assert sel_res.json()["status"] == "HOSPITAL_SELECTED"

        # 8. Admin Metrics
        metrics_res = await client.get("/api/admin/metrics")
        print("Admin Metrics:", metrics_res.status_code, metrics_res.json())
        assert metrics_res.status_code == 200

        print("\n=== ALL MEDLINK AI BACKEND TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(run_tests())
