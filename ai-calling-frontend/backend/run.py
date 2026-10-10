import os
import sys

# Ensure talkaor root and workspace root are on python path
talkaor_backend = os.path.dirname(os.path.abspath(__file__))
workspace_root = os.path.dirname(talkaor_backend)
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)
if talkaor_backend not in sys.path:
    sys.path.insert(0, talkaor_backend)

import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("Starting TalkAor FastAPI Backend Server")
    print("API Base URL: http://localhost:8000")
    print("Swagger UI:   http://localhost:8000/docs")
    print("ReDoc UI:     http://localhost:8000/redoc")
    print("=" * 60)
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
