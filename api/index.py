"""
Vercel Serverless Entrypoint for RIED Financial Studio
Exports the FastAPI ASGI application for @vercel/python runtime.
"""

import sys
from pathlib import Path

# Ensure root directory is in sys.path so 'backend' package is resolvable
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.main import app as _fastapi_app

# Top-level ASGI entrypoint assignment detected by Vercel AST builder
app = _fastapi_app
