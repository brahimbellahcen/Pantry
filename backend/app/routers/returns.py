from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order
from app.models.return_request import ReturnRequest
from app.models.user import User
from app.schemas.return_request import ReturnCreate, ReturnOut
from app.dependencies import get_current_user

router = APIRouter(prefix="/returns", tags=["returns"])

VALID_REASONS = [
    "damaged", "wrong_item", "not_as_described",
    "quality_issue", "changed_mind", "other",
]


@router.post("/orders/{order_id}", response_model=ReturnOut, status_code=201)
def request_return(
    order_id: int,
    payload: ReturnCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(
        Order.id == order_id, Order.user_id == current_user.id
    ).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status not in ("delivered",):
        raise HTTPException(400, "Only delivered orders can be returned")
    existing = db.query(ReturnRequest).filter(ReturnRequest.order_id == order_id).first()
    if existing:
        raise HTTPException(400, "A return request already exists for this order")
    if payload.reason not in VALID_REASONS:
        raise HTTPException(400, f"reason must be one of: {', '.join(VALID_REASONS)}")

    req = ReturnRequest(
        order_id=order_id,
        user_id=current_user.id,
        reason=payload.reason,
        details=payload.details,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("/mine", response_model=list[ReturnOut])
def my_returns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(ReturnRequest).filter(
        ReturnRequest.user_id == current_user.id
    ).order_by(ReturnRequest.created_at.desc()).all()


# ── Image upload ──────────────────────────────────────────────────────────────

from fastapi import APIRouter as _AR
upload_router = _AR(prefix="/upload", tags=["upload"])


@upload_router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    _user: User = Depends(get_current_user),
):
    """Upload a product image and return its URL. Max 5 MB."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files are accepted")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Image must be under 5 MB")
    from app.services.storage import upload_image as _upload
    url = _upload(data, file.filename or "image.jpg", file.content_type)
    return {"url": url}
