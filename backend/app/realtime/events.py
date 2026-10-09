import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.realtime.manager import manager
from app.services.orchestration_service import generate_orchestration

logger = logging.getLogger(__name__)

async def trigger_resource_update(db: AsyncSession, resource_type: str, resource_id: str, changes: dict):
    """
    Called when a resource changes state.
    Broadcasts the resource change, recalculates orchestration for active cases, and broadcasts the new pathway.
    """
    # 1. Broadcast the resource change
    resource_event = {
        "event": "RESOURCE_STATUS_CHANGED",
        "resource_type": resource_type,
        "resource_id": resource_id,
        "changes": changes
    }
    
    cases_to_update = list(manager.active_connections.keys())
    
    for case_id in cases_to_update:
        await manager.broadcast_to_case(case_id, resource_event)
        
        # 2. Recalculate orchestration for this case
        clients = manager.active_connections.get(case_id, [])
        if not clients:
            continue
            
        # Use the first client's known pathway_id (or None if not set)
        prev_id = clients[0].get("pathway_id")
        
        try:
            new_orch = await generate_orchestration(db, case_id, prev_id)
            
            # Update internal pathway IDs
            for c in clients:
                if new_orch.recommended_pathway:
                    c["pathway_id"] = new_orch.recommended_pathway.pathway_id
                    
            # 3. Broadcast pathway change
            pathway_event = {
                "event": "PATHWAY_CHANGED",
                "case_id": case_id,
                "orchestration": new_orch.model_dump(mode="json")
            }
            await manager.broadcast_to_case(case_id, pathway_event)
        except Exception as e:
            logger.error(f"Failed to recalculate orchestration for case {case_id} during realtime update: {e}")
