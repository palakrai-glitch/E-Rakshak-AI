import json
from typing import Dict, List, Any, Optional
from fastapi import WebSocket
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps case_id -> list of dicts: {"ws": WebSocket, "pathway_id": Optional[str]}
        self.active_connections: Dict[str, List[Dict[str, Any]]] = {}

    async def connect(self, websocket: WebSocket, case_id: str):
        await websocket.accept()
        if case_id not in self.active_connections:
            self.active_connections[case_id] = []
        self.active_connections[case_id].append({"ws": websocket, "pathway_id": None})
        logger.info(f"Client connected to case {case_id}")

    def disconnect(self, websocket: WebSocket, case_id: str):
        if case_id in self.active_connections:
            self.active_connections[case_id] = [
                c for c in self.active_connections[case_id] if c["ws"] != websocket
            ]
            if len(self.active_connections[case_id]) == 0:
                del self.active_connections[case_id]
        logger.info(f"Client disconnected from case {case_id}")

    def set_pathway_id(self, websocket: WebSocket, case_id: str, pathway_id: str):
        if case_id in self.active_connections:
            for c in self.active_connections[case_id]:
                if c["ws"] == websocket:
                    c["pathway_id"] = pathway_id
                    break

    async def broadcast_to_case(self, case_id: str, message: dict):
        """Sends a JSON message to all clients connected to a specific case."""
        if case_id in self.active_connections:
            if "timestamp" not in message:
                message["timestamp"] = datetime.now(timezone.utc).isoformat()
                
            text_data = json.dumps(message)
            dead_sockets = []
            
            for connection in self.active_connections[case_id]:
                ws = connection["ws"]
                try:
                    await ws.send_text(text_data)
                except Exception:
                    dead_sockets.append(ws)
                    
            for dead in dead_sockets:
                self.disconnect(dead, case_id)

manager = ConnectionManager()
