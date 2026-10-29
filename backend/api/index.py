"""
Vercel Python entrypoint.
Vercel requires a top-level variable named 'app', 'application', or 'handler'.
Import it directly — no try/except wrapper at this level.
"""
from app.main import app  # noqa: F401  ← Vercel finds 'app' here
