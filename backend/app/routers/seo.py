"""Sitemap.xml + robots.txt for SEO."""
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.product import Product
from app.models.category import Category
from app.config import get_settings

router = APIRouter(tags=["seo"])
settings = get_settings()


def _base_url() -> str:
    origins = settings.APP_CORS_ORIGINS.split(",")
    return origins[0].strip().rstrip("/")


@router.get("/sitemap.xml", include_in_schema=False)
def sitemap(db: Session = Depends(get_db)):
    base = _base_url()
    static_urls = [
        "", "/products", "/flash-sales", "/login", "/register",
    ]
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path in static_urls:
        lines.append(f"  <url><loc>{base}{path}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>")

    for cat in db.query(Category).filter(Category.is_active == True).all():
        lines.append(f"  <url><loc>{base}/products?category={cat.slug}</loc><changefreq>daily</changefreq><priority>0.7</priority></url>")

    for p in db.query(Product).filter(Product.is_active == True).all():
        lines.append(f"  <url><loc>{base}/products/{p.slug}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>")

    lines.append("</urlset>")
    return Response("\n".join(lines), media_type="application/xml")


@router.get("/robots.txt", include_in_schema=False)
def robots():
    base = _base_url()
    content = f"""User-agent: *
Allow: /
Disallow: /admin
Disallow: /account
Disallow: /cart
Disallow: /checkout

Sitemap: {base}/sitemap.xml
"""
    return Response(content, media_type="text/plain")
