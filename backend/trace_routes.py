"""Diagnostic: check if voice_intake_router gets loaded by uvicorn."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Monkeypatch to trace include_router
import fastapi
original = fastapi.FastAPI.include_router

def tracing_include(self, router, **kwargs):
    prefix = kwargs.get("prefix", "")
    paths = [r.path for r in router.routes if hasattr(r, "path")]
    print(f"[TRACE] include_router prefix={prefix!r} paths={paths}")
    return original(self, router, **kwargs)

fastapi.FastAPI.include_router = tracing_include

from app.main import app

all_paths = [r.path for r in app.routes if hasattr(r, "path")]
voice = [p for p in all_paths if "voice" in p]
print(f"\nTotal registered routes: {len(all_paths)}")
print(f"Voice routes: {voice}")
print(f"Last 3 routes: {all_paths[-3:]}")
