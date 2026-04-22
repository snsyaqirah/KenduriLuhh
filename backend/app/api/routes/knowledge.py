from fastapi import APIRouter, Query
from app.services.knowledge_service import load_menus, load_ingredients, load_suppliers, get_menus_for_event
from app.models.response_models import MenuItemResponse, IngredientResponse

router = APIRouter(prefix="/knowledge")


@router.get("/menus", summary="List all menus in the knowledge base")
async def list_menus(event_type: str | None = Query(default=None, description="Filter by event type")):
    menus = get_menus_for_event(event_type) if event_type else load_menus()
    return {"total": len(menus), "menus": menus}


@router.get("/menus/{menu_id}", summary="Get a single menu by ID")
async def get_menu(menu_id: str):
    menus = load_menus()
    menu = next((m for m in menus if m["id"] == menu_id), None)
    if not menu:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Menu '{menu_id}' not found")
    return menu


@router.get("/ingredients", summary="List all ingredients with Pasar Borong pricing")
async def list_ingredients(category: str | None = Query(default=None)):
    ingredients = load_ingredients()
    if category:
        ingredients = [i for i in ingredients if i["category"] == category]
    return {"total": len(ingredients), "ingredients": ingredients}


@router.get("/suppliers", summary="List suppliers in the directory")
async def list_suppliers():
    return {"total": len(load_suppliers()), "suppliers": load_suppliers()}
