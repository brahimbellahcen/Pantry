"""CSV bulk product import and export."""
import csv
import io
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from slugify import slugify
from app.database import get_db
from app.models.product import Product, Inventory
from app.models.category import Category
from app.models.user import User
from app.dependencies import require_admin

router = APIRouter(prefix="/csv", tags=["csv"])

IMPORT_FIELDS = ["name", "category_slug", "price", "stock", "unit", "description", "image_url", "is_featured"]
EXPORT_FIELDS = ["id", "name", "slug", "category", "price", "compare_at_price", "stock", "unit", "is_active", "is_featured"]


@router.get("/products/export")
def export_products(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Download all products as a CSV file."""
    products = db.query(Product).options().all()
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=EXPORT_FIELDS)
    writer.writeheader()
    for p in products:
        writer.writerow({
            "id": p.id, "name": p.name, "slug": p.slug,
            "category": p.category.name if p.category else "",
            "price": float(p.price),
            "compare_at_price": float(p.compare_at_price) if p.compare_at_price else "",
            "stock": p.inventory.quantity if p.inventory else 0,
            "unit": p.unit or "", "is_active": p.is_active, "is_featured": p.is_featured,
        })
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pantry_products.csv"},
    )


@router.post("/products/import")
async def import_products(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """
    Import products from a CSV. Required columns: name, category_slug, price.
    Optional: stock, unit, description, image_url, is_featured.
    Existing slugs are updated; new slugs are created.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(400, "Please upload a .csv file")
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))

    created = updated = errors = 0
    error_rows: list[dict] = []

    # Pre-load categories
    cat_map = {c.slug: c.id for c in db.query(Category).all()}

    for row_num, row in enumerate(reader, start=2):
        name = (row.get("name") or "").strip()
        cat_slug = (row.get("category_slug") or "").strip()
        price_str = (row.get("price") or "").strip()

        if not name or not price_str:
            errors += 1
            error_rows.append({"row": row_num, "error": "name and price are required"})
            continue
        try:
            price = Decimal(price_str)
        except Exception:
            errors += 1
            error_rows.append({"row": row_num, "error": f"invalid price '{price_str}'"})
            continue

        cat_id = cat_map.get(cat_slug)
        if not cat_id:
            # Auto-create category
            new_cat = Category(name=cat_slug.replace("-", " ").title(), slug=cat_slug)
            db.add(new_cat); db.flush()
            cat_map[cat_slug] = new_cat.id
            cat_id = new_cat.id

        slug = slugify(name)
        existing = db.query(Product).filter(Product.slug == slug).first()
        stock = int(row.get("stock") or 0)
        is_featured = str(row.get("is_featured", "")).lower() in ("true", "1", "yes")

        if existing:
            existing.price = price
            existing.unit = row.get("unit") or existing.unit
            existing.description = row.get("description") or existing.description
            existing.image_url = row.get("image_url") or existing.image_url
            existing.is_featured = is_featured
            if existing.inventory:
                existing.inventory.quantity = stock
            updated += 1
        else:
            product = Product(
                name=name, slug=slug, category_id=cat_id, price=price,
                unit=row.get("unit") or None,
                description=row.get("description") or None,
                image_url=row.get("image_url") or None,
                is_featured=is_featured,
            )
            db.add(product); db.flush()
            db.add(Inventory(product_id=product.id, quantity=stock))
            created += 1

    db.commit()
    return {"created": created, "updated": updated, "errors": errors, "error_details": error_rows}
