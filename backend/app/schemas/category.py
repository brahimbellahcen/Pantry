from pydantic import BaseModel


class CategoryBase(BaseModel):
    name: str
    description: str | None = None
    image_url: str | None = None
    parent_id: int | None = None
    sort_order: int = 0
    is_active: bool = True


class CategoryCreate(CategoryBase):
    slug: str | None = None  # auto-generated if omitted


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    image_url: str | None = None
    parent_id: int | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class CategoryOut(CategoryBase):
    id: int
    slug: str
    children: list["CategoryOut"] = []
    model_config = {"from_attributes": True}


class CategoryOutBrief(BaseModel):
    id: int
    name: str
    slug: str
    image_url: str | None = None
    model_config = {"from_attributes": True}


CategoryOut.model_rebuild()
