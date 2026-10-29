from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.category import Category
from app.schemas.category import CategoryOut, CategoryOutBrief

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.parent_id == None, Category.is_active == True).order_by(Category.sort_order).all()


@router.get("/{slug}", response_model=CategoryOut)
def get_category(slug: str, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.slug == slug, Category.is_active == True).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    return cat
