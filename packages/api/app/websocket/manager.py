"""WebSocket connection manager for streaming updates."""
from collections import defaultdict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, workspace_id: str, websocket: WebSocket):
        await websocket.accept()
        self._connections[workspace_id].append(websocket)

    def disconnect(self, workspace_id: str, websocket: WebSocket):
        self._connections[workspace_id].remove(websocket)

    async def broadcast(self, workspace_id: str, message: dict):
        for ws in self._connections[workspace_id]:
            try:
                await ws.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()
