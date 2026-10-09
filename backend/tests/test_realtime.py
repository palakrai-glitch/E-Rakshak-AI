import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_websocket_connection():
    # Test valid connection to case
    case_id = "ER-20261008-TEST"
    with client.websocket_connect(f"/ws/cases/{case_id}") as websocket:
        # Just ensure it connects successfully
        assert websocket is not None
        
        # Test setting pathway ID message
        websocket.send_json({"type": "SET_PATHWAY_ID", "pathway_id": "PATH-123"})
        
        # In a test client environment, the connection manager should now list this connection
        import time
        from app.realtime.manager import manager
        
        # Wait up to 1 second for the server to process the message
        for _ in range(10):
            if case_id in manager.active_connections and any(c["pathway_id"] == "PATH-123" for c in manager.active_connections[case_id]):
                break
            time.sleep(0.1)
            
        assert case_id in manager.active_connections
        assert any(c["pathway_id"] == "PATH-123" for c in manager.active_connections[case_id])

def test_websocket_broadcast_ignores_disconnects():
    case_id = "ER-TEST-BC"
    
    # We will mock the manager state for a broadcast
    from app.realtime.manager import manager
    manager.active_connections[case_id] = []
    
    with client.websocket_connect(f"/ws/cases/{case_id}") as websocket:
        # At this point it's connected and in active_connections
        assert len(manager.active_connections[case_id]) >= 1
    
    # After block exits, the disconnect handler is triggered and the connection is removed.
    assert case_id not in manager.active_connections or len(manager.active_connections[case_id]) == 0
