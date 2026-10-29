"""S3-compatible image upload service.

Set S3_BUCKET, S3_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY
in .env. Falls back to a local /uploads directory when no bucket is configured.
Any S3-compatible provider (R2, MinIO, DigitalOcean Spaces) works by setting
S3_ENDPOINT_URL in .env.
"""
import os
import uuid
from pathlib import Path
from app.config import get_settings

settings = get_settings()
UPLOAD_DIR = Path("uploads")


def _s3_client():
    import boto3
    kwargs = dict(
        region_name=settings.S3_REGION or "us-east-1",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
    endpoint = getattr(settings, "S3_ENDPOINT_URL", None)
    if endpoint:
        kwargs["endpoint_url"] = endpoint
    return boto3.client("s3", **kwargs)


def upload_image(file_bytes: bytes, filename: str, content_type: str = "image/jpeg") -> str:
    """Upload image bytes and return the public URL."""
    ext = Path(filename).suffix.lower() or ".jpg"
    key = f"products/{uuid.uuid4().hex}{ext}"

    if settings.S3_BUCKET and settings.AWS_ACCESS_KEY_ID:
        s3 = _s3_client()
        s3.put_object(
            Bucket=settings.S3_BUCKET,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
            ACL="public-read",
        )
        region = settings.S3_REGION or "us-east-1"
        return f"https://{settings.S3_BUCKET}.s3.{region}.amazonaws.com/{key}"

    # Local fallback (dev only)
    UPLOAD_DIR.mkdir(exist_ok=True)
    local_path = UPLOAD_DIR / key.replace("/", "_")
    local_path.write_bytes(file_bytes)
    return f"/uploads/{local_path.name}"
