# Phase 11: Architecture Audit (Ambulance Portal)

## 1. Existing Models and Resources
- `Ambulance` model exists (`ambulances` table) with fields like `ambulance_id`, `status`, `base_hospital_id`.
- `EmergencyCase` model exists (`emergency_cases` table).
- **Gap:** There is no existing operator authentication mechanism, nor are there fields for `operator_password_hash` in `Ambulance`.
- **Gap:** There is no explicit persistence for an ambulance assignment or acceptance status. The orchestration API generates a pathway but does not save an assignment status.

## 2. Plan for Minimal Required Changes
1. **Database Schema:** 
   - Add `operator_password_hash` to `Ambulance`.
   - Add `assigned_ambulance_id` and `ambulance_assignment_status` (`PENDING`, `ACCEPTED`, `REJECTED`) to `EmergencyCase`.
2. **Authentication System:**
   - Implement a minimal, secure JWT authentication system in `backend/app/core/security.py`.
3. **Ambulance APIs (`backend/app/api/ambulance.py`):**
   - Login endpoint.
   - Protected endpoints to retrieve assignments and respond to them.
4. **Frontend Portal:**
   - Create `/ambulance/login` and `/ambulance/dashboard` routes.
5. **Provisioning:**
   - Create a script `scripts/provision_ambulance.py` to securely assign passwords to existing ambulance records for testing and deployment.
