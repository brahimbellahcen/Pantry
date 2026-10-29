from datetime import datetime
from pydantic import BaseModel, field_validator


class ReviewCreate(BaseModel):
    rating: int
    title: str | None = None
    body: str | None = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if not (1 <= v <= 5):
            raise ValueError("Rating must be between 1 and 5")
        return v


class ReviewOut(BaseModel):
    id: int
    product_id: int
    user_id: int
    author_name: str
    rating: int
    title: str | None
    body: str | None
    is_verified_purchase: bool
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


class ReviewStats(BaseModel):
    average_rating: float
    total_reviews: int
    rating_breakdown: dict[int, int]  # {5: 10, 4: 3, ...}
