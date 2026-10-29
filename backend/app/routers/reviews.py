from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.review import Review
from app.models.order import Order, OrderItem
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewOut, ReviewStats
from app.dependencies import get_current_user

router = APIRouter(prefix="/reviews", tags=["reviews"])


def _is_verified(product_id: int, user_id: int, db: Session) -> bool:
    """Check that the user has a delivered order containing this product."""
    return db.query(Order).join(OrderItem).filter(
        Order.user_id == user_id,
        Order.status == "delivered",
        OrderItem.product_id == product_id,
    ).first() is not None


@router.get("/products/{product_id}", response_model=list[ReviewOut])
def list_reviews(product_id: int, db: Session = Depends(get_db)):
    rows = db.query(Review).filter(
        Review.product_id == product_id,
        Review.status == "approved",
    ).order_by(Review.created_at.desc()).all()
    result = []
    for r in rows:
        result.append(ReviewOut(
            id=r.id, product_id=r.product_id, user_id=r.user_id,
            author_name=r.user.full_name, rating=r.rating, title=r.title,
            body=r.body, is_verified_purchase=r.is_verified_purchase,
            status=r.status, created_at=r.created_at,
        ))
    return result


@router.get("/products/{product_id}/stats", response_model=ReviewStats)
def review_stats(product_id: int, db: Session = Depends(get_db)):
    rows = db.query(Review.rating).filter(
        Review.product_id == product_id, Review.status == "approved"
    ).all()
    if not rows:
        return ReviewStats(average_rating=0.0, total_reviews=0, rating_breakdown={})
    ratings = [r[0] for r in rows]
    breakdown = {i: ratings.count(i) for i in range(1, 6) if ratings.count(i)}
    return ReviewStats(
        average_rating=round(sum(ratings) / len(ratings), 1),
        total_reviews=len(ratings),
        rating_breakdown=breakdown,
    )


@router.post("/products/{product_id}", response_model=ReviewOut, status_code=201)
def submit_review(
    product_id: int,
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Review).filter(
        Review.product_id == product_id, Review.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(400, "You have already reviewed this product")
    verified = _is_verified(product_id, current_user.id, db)
    review = Review(
        product_id=product_id, user_id=current_user.id,
        rating=payload.rating, title=payload.title, body=payload.body,
        is_verified_purchase=verified,
        status="approved",  # auto-approve; admin can reject
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return ReviewOut(
        id=review.id, product_id=review.product_id, user_id=review.user_id,
        author_name=current_user.full_name, rating=review.rating, title=review.title,
        body=review.body, is_verified_purchase=review.is_verified_purchase,
        status=review.status, created_at=review.created_at,
    )
