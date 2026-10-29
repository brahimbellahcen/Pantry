#!/usr/bin/env python3
"""
Seed script — populates the database with demo categories, products,
delivery slots, and an admin user.

Usage:
    cd backend
    python -m scripts.seed          # uses DATABASE_URL from .env
    RESET=1 python -m scripts.seed  # drops and recreates all data
"""
import os
import sys
from datetime import date, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.user import User
from app.models.category import Category
from app.models.product import Product, Inventory
from app.models.coupon import Coupon
from app.models.delivery_slot import DeliverySlot
from app.utils.security import hash_password

RESET = os.getenv("RESET", "0") == "1"

CATEGORIES = [
    {"name": "Fruits & Veg",  "slug": "fruits-veg",  "image_url": None},
    {"name": "Dairy & Eggs",  "slug": "dairy-eggs",  "image_url": None},
    {"name": "Bakery",        "slug": "bakery",       "image_url": None},
    {"name": "Meat & Fish",   "slug": "meat-fish",    "image_url": None},
    {"name": "Pantry Staples","slug": "pantry-staples","image_url": None},
    {"name": "Beverages",     "slug": "beverages",    "image_url": None},
    {"name": "Snacks",        "slug": "snacks",       "image_url": None},
    {"name": "Frozen",        "slug": "frozen",       "image_url": None},
]

PRODUCTS = [
    # Fruits & Veg
    {"name": "Organic Bananas",       "slug": "organic-bananas",    "cat": "fruits-veg",    "price": "1.49", "unit": "bunch",  "stock": 120, "featured": True},
    {"name": "Cherry Tomatoes",       "slug": "cherry-tomatoes",    "cat": "fruits-veg",    "price": "2.99", "unit": "pack",   "stock": 80,  "featured": False},
    {"name": "Baby Spinach",          "slug": "baby-spinach",       "cat": "fruits-veg",    "price": "3.49", "unit": "bag",    "stock": 60,  "featured": True},
    {"name": "Avocado",               "slug": "avocado",            "cat": "fruits-veg",    "price": "1.99", "unit": "each",   "stock": 50,  "featured": True},
    {"name": "Broccoli",              "slug": "broccoli",           "cat": "fruits-veg",    "price": "1.79", "unit": "head",   "stock": 40,  "featured": False},
    # Dairy
    {"name": "Whole Milk 1L",         "slug": "whole-milk-1l",      "cat": "dairy-eggs",    "price": "1.89", "unit": "L",      "stock": 200, "featured": True},
    {"name": "Free-Range Eggs 12pk",  "slug": "free-range-eggs",    "cat": "dairy-eggs",    "price": "4.49", "unit": "pack",   "stock": 150, "featured": True},
    {"name": "Greek Yogurt 500g",     "slug": "greek-yogurt",       "cat": "dairy-eggs",    "price": "3.29", "unit": "pot",    "stock": 90,  "featured": False},
    {"name": "Cheddar Cheese 400g",   "slug": "cheddar-400g",       "cat": "dairy-eggs",    "price": "4.99", "unit": "block",  "stock": 70,  "featured": False},
    # Bakery
    {"name": "Sourdough Loaf",        "slug": "sourdough-loaf",     "cat": "bakery",        "price": "3.99", "unit": "loaf",   "stock": 30,  "featured": True},
    {"name": "Croissants 4pk",        "slug": "croissants-4pk",     "cat": "bakery",        "price": "3.49", "unit": "pack",   "stock": 25,  "featured": False},
    # Meat & Fish
    {"name": "Chicken Breast 500g",   "slug": "chicken-breast",     "cat": "meat-fish",     "price": "5.99", "unit": "pack",   "stock": 60,  "featured": True},
    {"name": "Salmon Fillet 300g",    "slug": "salmon-fillet",      "cat": "meat-fish",     "price": "7.49", "unit": "pack",   "stock": 40,  "featured": True},
    # Pantry
    {"name": "Olive Oil 500ml",       "slug": "olive-oil-500ml",    "cat": "pantry-staples","price": "6.99", "unit": "bottle", "stock": 100, "featured": False},
    {"name": "Basmati Rice 1kg",      "slug": "basmati-rice-1kg",   "cat": "pantry-staples","price": "2.49", "unit": "bag",    "stock": 120, "featured": False},
    {"name": "Chopped Tomatoes 400g", "slug": "chopped-tomatoes",   "cat": "pantry-staples","price": "0.89", "unit": "tin",    "stock": 200, "featured": False},
    # Beverages
    {"name": "Orange Juice 1L",       "slug": "orange-juice-1l",    "cat": "beverages",     "price": "2.99", "unit": "carton", "stock": 80,  "featured": True},
    {"name": "Sparkling Water 6pk",   "slug": "sparkling-water-6pk","cat": "beverages",     "price": "3.49", "unit": "pack",   "stock": 100, "featured": False},
    # Snacks
    {"name": "Mixed Nuts 200g",       "slug": "mixed-nuts-200g",    "cat": "snacks",        "price": "4.99", "unit": "bag",    "stock": 60,  "featured": False},
    {"name": "Dark Chocolate 85%",    "slug": "dark-chocolate-85",  "cat": "snacks",        "price": "2.49", "unit": "bar",    "stock": 80,  "featured": False},
]

COUPONS = [
    {"code": "WELCOME10", "discount_type": "percent", "discount_value": 10,
     "description": "10% off your first order", "min_order_amount": 20},
    {"code": "FLAT5",     "discount_type": "fixed",   "discount_value": 5,
     "description": "$5 off any order"},
    {"code": "FRESH20",   "discount_type": "percent", "discount_value": 20,
     "description": "20% off (max $15)", "max_discount_amount": 15, "usage_limit": 100},
]

TIME_WINDOWS = ["08:00–11:00", "11:00–14:00", "14:00–17:00", "17:00–20:00"]


def seed():
    db = SessionLocal()
    try:
        if RESET:
            print("⚠️  RESET mode — clearing existing seed data")
            db.query(DeliverySlot).delete()
            db.query(Coupon).delete()
            db.query(Inventory).delete()
            db.query(Product).delete()
            db.query(Category).delete()
            db.query(User).filter(User.email == "admin@pantry.dev").delete()
            db.commit()

        # Admin user
        if not db.query(User).filter(User.email == "admin@pantry.dev").first():
            db.add(User(
                email="admin@pantry.dev",
                hashed_password=hash_password("admin1234"),
                full_name="Pantry Admin",
                is_admin=True,
            ))
            db.commit()
            print("✅ Admin user created  →  admin@pantry.dev / admin1234")

        # Categories
        cat_map: dict[str, int] = {}
        for c in CATEGORIES:
            existing = db.query(Category).filter(Category.slug == c["slug"]).first()
            if not existing:
                obj = Category(**c)
                db.add(obj)
                db.flush()
                cat_map[c["slug"]] = obj.id
            else:
                cat_map[c["slug"]] = existing.id
        db.commit()
        print(f"✅ {len(CATEGORIES)} categories seeded")

        # Products
        seeded = 0
        for p in PRODUCTS:
            if db.query(Product).filter(Product.slug == p["slug"]).first():
                continue
            product = Product(
                name=p["name"], slug=p["slug"],
                category_id=cat_map[p["cat"]],
                price=Decimal(p["price"]),
                unit=p["unit"], is_active=True, is_featured=p["featured"],
            )
            db.add(product)
            db.flush()
            db.add(Inventory(product_id=product.id, quantity=p["stock"]))
            seeded += 1
        db.commit()
        print(f"✅ {seeded} products seeded")

        # Coupons
        for c in COUPONS:
            if not db.query(Coupon).filter(Coupon.code == c["code"]).first():
                db.add(Coupon(**c, is_active=True))
        db.commit()
        print(f"✅ {len(COUPONS)} coupons seeded: {', '.join(c['code'] for c in COUPONS)}")

        # Delivery slots — next 7 days
        slots_added = 0
        for day_offset in range(1, 8):
            slot_date = date.today() + timedelta(days=day_offset)
            for window in TIME_WINDOWS:
                if not db.query(DeliverySlot).filter(
                    DeliverySlot.date == slot_date,
                    DeliverySlot.time_window == window,
                ).first():
                    db.add(DeliverySlot(date=slot_date, time_window=window, capacity=20))
                    slots_added += 1
        db.commit()
        print(f"✅ {slots_added} delivery slots seeded (next 7 days × 4 windows)")

        print("\n🎉 Seed complete!")
        print("   Admin login: admin@pantry.dev / admin1234")
        print("   Coupons: WELCOME10, FLAT5, FRESH20")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
