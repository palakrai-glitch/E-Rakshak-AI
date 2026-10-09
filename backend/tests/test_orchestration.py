import pytest
from app.orchestration.constants import ORCHESTRATION_WEIGHTS
from app.orchestration.evaluator import evaluate_pathways
from app.orchestration.engine import orchestrate_pathways
from app.schemas.orchestration import PathwayStatus
from app.schemas.matching import MatchingResultSchema, ResourceMatch, MatchFactor

@pytest.fixture
def mock_matching_result():
    def make_match(res_id: str, rtype: str, rank: int, score: int, desc: str, **kwargs):
        factor = MatchFactor(rule="Test", description=desc, score=score)
        return ResourceMatch(
            resource_id=res_id,
            resource_type=rtype,
            rank=rank,
            score=score,
            eligibility="ELIGIBLE",
            associated_hospital_id=kwargs.get("hospital_id"),
            factors=[factor]
        )

    amb1 = make_match("AMB-001", "Ambulance", 1, 90, "High Availability")
    amb2 = make_match("AMB-002", "Ambulance", 2, 80, "Lower Availability")
    
    hosp1 = make_match("HOSP-001", "Hospital", 1, 85, "ICU Available")
    hosp2 = make_match("HOSP-002", "Hospital", 2, 75, "No ICU")
    
    doc1 = make_match("DOC-001", "Doctor", 1, 95, "Doc at Hosp 1", hospital_id="HOSP-001")
    doc2 = make_match("DOC-002", "Doctor", 2, 85, "Doc at Hosp 2", hospital_id="HOSP-002")
    doc3 = make_match("DOC-003", "Doctor", 3, 70, "Doc at Hosp 1", hospital_id="HOSP-001")
    
    from datetime import datetime, timezone
    return MatchingResultSchema(
        case_id="ER-123",
        priority="CRITICAL",
        required_capabilities=["CRITICAL_CARE"],
        ambulances=[amb1, amb2],
        hospitals=[hosp1, hosp2],
        doctors=[doc1, doc2, doc3],
        generated_at=datetime.now(timezone.utc)
    )

def test_evaluate_pathways_generates_compatible_options(mock_matching_result):
    pathways = evaluate_pathways(
        mock_matching_result.ambulances,
        mock_matching_result.hospitals,
        mock_matching_result.doctors,
        ORCHESTRATION_WEIGHTS,
        case_location=(21.0, 81.0),
        resource_locations={}
    )
    
    assert len(pathways) > 0
    best_pathway = pathways[0]
    
    # Top pathway should logically be AMB-001 -> HOSP-001 -> DOC-001 based on scores
    assert best_pathway.ambulance.resource_id == "AMB-001"
    assert best_pathway.hospital.resource_id == "HOSP-001"
    assert best_pathway.doctor.resource_id == "DOC-001"

def test_evaluate_pathways_forces_hospital_doctor_compatibility(mock_matching_result):
    # What if Hosp 2 is the ONLY hospital?
    mock_matching_result.hospitals = [mock_matching_result.hospitals[1]]
    
    pathways = evaluate_pathways(
        mock_matching_result.ambulances,
        mock_matching_result.hospitals,
        mock_matching_result.doctors,
        ORCHESTRATION_WEIGHTS,
        case_location=(21.0, 81.0),
        resource_locations={}
    )
    
    best_pathway = pathways[0]
    # It must select DOC-002, even though DOC-001 is higher score, because DOC-001 is not at HOSP-002
    assert best_pathway.hospital.resource_id == "HOSP-002"
    assert best_pathway.doctor.resource_id == "DOC-002"

@pytest.mark.asyncio
async def test_orchestrate_pathways_change_detection(mock_matching_result):
    # First orchestration run
    res1 = await orchestrate_pathways(
        case_id="ER-123",
        priority="CRITICAL",
        capabilities=["CRITICAL_CARE"],
        matching_result=mock_matching_result,
        case_location=(21.0, 81.0),
        resource_locations={}
    )
    assert res1.status == PathwayStatus.FEASIBLE
    assert res1.change_reason is None
    prev_pathway_id = res1.recommended_pathway.pathway_id
    
    # Simulate an update where Hospital 1 becomes terrible (score 10)
    mock_matching_result.hospitals[0].score = 10
    
    res2 = await orchestrate_pathways(
        case_id="ER-123",
        priority="CRITICAL",
        capabilities=["CRITICAL_CARE"],
        matching_result=mock_matching_result,
        case_location=(21.0, 81.0),
        resource_locations={},
        previous_pathway_id=prev_pathway_id
    )
    
    assert res2.status == PathwayStatus.DEGRADED
    assert res2.change_reason is not None
    assert "Hospital switched from HOSP-001 to HOSP-002" in res2.change_explanation[0]
