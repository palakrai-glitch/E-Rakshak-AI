from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
from app.realtime.manager import manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws/cases/{case_id}")
async def case_websocket_endpoint(websocket: WebSocket, case_id: str):
    await manager.connect(websocket, case_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "SET_PATHWAY_ID":
                    manager.set_pathway_id(websocket, case_id, msg.get("pathway_id"))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, case_id)
        logger.info(f"Client disconnected from case {case_id}")
    except Exception as e:
        manager.disconnect(websocket, case_id)
        logger.error(f"WebSocket error for case {case_id}: {e}")
