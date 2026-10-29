"""
Vercel serverless entry point.
Imports the FastAPI app — Vercel routes all traffic here via vercel.json.
"""
try:
    from app.main import app
except Exception as e:
    # Expose startup errors clearly in Vercel logs
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    _error = str(e)
    app = FastAPI()

    @app.get("/{path:path}")
    @app.post("/{path:path}")
    async def startup_error(path: str):
        return JSONResponse({"error": "App failed to start", "detail": _error}, status_code=500)
