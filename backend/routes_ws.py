"""
WebSocket manager and endpoint for real-time batch and candidate status updates.
"""

import json
import logging
from typing import Dict, List
from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Map job_id (str) -> list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        self.active_connections[job_id].append(websocket)
        logger.info(f"WebSocket client connected to job {job_id}. Total: {len(self.active_connections[job_id])}")

    def disconnect(self, job_id: str, websocket: WebSocket):
        if job_id in self.active_connections:
            if websocket in self.active_connections[job_id]:
                self.active_connections[job_id].remove(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
        logger.info(f"WebSocket client disconnected from job {job_id}.")

    async def broadcast_to_job(self, job_id: str, message: dict):
        """Broadcast a JSON message to all clients connected to job_id."""
        if job_id not in self.active_connections:
            return

        dead_connections = []
        for connection in self.active_connections[job_id]:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Error sending message to client on job {job_id}: {e}")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(job_id, dead)

ws_manager = ConnectionManager()

@router.websocket("/ws/jobs/{job_id}")
async def websocket_job_endpoint(websocket: WebSocket, job_id: str):
    await ws_manager.connect(job_id, websocket)
    try:
        # Keep connection open and handle potential ping/pong or client messages
        while True:
            data = await websocket.receive_text()
            # Respond to client ping
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        ws_manager.disconnect(job_id, websocket)
    except Exception as e:
        logger.warning(f"WebSocket error on job {job_id}: {e}")
        ws_manager.disconnect(job_id, websocket)
