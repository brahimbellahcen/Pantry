"""
Image upload service powered by Cloudinary — https://cloudinary.com
Free tier: 25 GB storage, 25 GB bandwidth/month, no credit card required.

Setup:
1. Sign up at cloudinary.com
2. Go to Dashboard → copy Cloud Name, API Key, API Secret
3. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in your .env

Falls back to local /uploads directory when credentials are absent (dev/test).
"""
import uuid
from pathlib import Path
from app.config import get_settings

settings = get_settings()
UPLOAD_DIR = Path("uploads")


def upload_image(file_bytes: bytes, filename: str, content_type: str = "image/jpeg") -> str:
    """Upload an image and return its public URL."""

    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )
        result = cloudinary.uploader.upload(
            file_bytes,
            folder="pantry/products",
            public_id=uuid.uuid4().hex,
            resource_type="image",
            overwrite=False,
            transformation=[
                {"width": 800, "height": 800, "crop": "limit", "quality": "auto"},
            ],
        )
        return result["secure_url"]

    # Local fallback — dev only, not suitable for production
    UPLOAD_DIR.mkdir(exist_ok=True)
    ext = Path(filename).suffix.lower() or ".jpg"
    local_path = UPLOAD_DIR / f"{uuid.uuid4().hex}{ext}"
    local_path.write_bytes(file_bytes)
    return f"/uploads/{local_path.name}"
