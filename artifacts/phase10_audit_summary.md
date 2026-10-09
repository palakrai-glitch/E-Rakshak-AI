# Phase 10: Audit Summary (Before Implementation)

**1. Existing Intake Flow & Persistence Gaps**
- The current `intake/page.tsx` uses a React `useState` object (`formData`) to store all steps in memory.
- `createEmergencyCase` is only called at the very end of Step 4.
- **Gap:** If the user refreshes or navigates away before Step 4, all data is lost and no ER token is ever generated. We must move the case creation to Step 1 (or a preliminary step) to generate the ER Token early, then update the record on subsequent steps.

**2. Backend Models & APIs**
- `EmergencyCase` model exists and tracks all fields. `chief_complaint` and `source` are the only required fields.
- **Missing Endpoints:** There is no `PATCH /api/cases/{case_id}` to support progressive saving. There is also no verification endpoint. I need to create both.
- **Verification Details:** The model has `reporter_phone`. We will use ER Token + Reporter Phone for secure recovery.

**3. State Inference**
- To avoid unnecessary database migrations for an `intake_step` column, we can infer the current step from the presence of data:
  - If `address` or `latitude` exists -> Step 4 complete.
  - Else if `heart_rate`, `spo2`, or `conscious` exists -> Step 3 complete.
  - Else if `reporter_phone` or `patient_name` exists -> Step 2 complete.
  - Else -> Step 1 complete.

I will now proceed with the implementation.
