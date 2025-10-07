from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from backend.database import get_db
from backend.services.favorite_service import FavoriteService

router = APIRouter(prefix="/api/favorites", tags=["favorites"])

# Pydantic models for request/response
class CreateListRequest(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "blue"
    icon: Optional[str] = "star"
    is_default: Optional[bool] = False

class UpdateListRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_default: Optional[bool] = None

class AddToListRequest(BaseModel):
    list_id: int
    ad_id: int
    notes: Optional[str] = None

class RemoveFromListRequest(BaseModel):
    list_id: int
    ad_id: int


# TODO: Replace with actual authentication
def get_current_user_id():
    """Temporary placeholder for user authentication"""
    return 1  # Default user ID for now


@router.get("/lists")
def get_user_lists(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Get all favorite lists for the current user"""
    lists = FavoriteService.get_user_lists(db, user_id)
    return {
        "lists": [fav_list.to_dict() for fav_list in lists],
        "total": len(lists)
    }


@router.get("/lists/{list_id}")
def get_list(
    list_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Get a specific favorite list with its items"""
    favorite_list = FavoriteService.get_list_by_id(db, list_id, user_id)
    if not favorite_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite list not found"
        )
    
    items = FavoriteService.get_list_items(db, list_id, user_id)
    
    return {
        **favorite_list.to_dict(),
        "items": [item.to_dict(include_ad=True) for item in items]
    }


@router.post("/lists", status_code=status.HTTP_201_CREATED)
def create_list(
    request: CreateListRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Create a new favorite list"""
    favorite_list = FavoriteService.create_list(
        db=db,
        user_id=user_id,
        name=request.name,
        description=request.description,
        color=request.color,
        icon=request.icon,
        is_default=request.is_default
    )
    return favorite_list.to_dict()


@router.put("/lists/{list_id}")
def update_list(
    list_id: int,
    request: UpdateListRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Update a favorite list"""
    favorite_list = FavoriteService.update_list(
        db=db,
        list_id=list_id,
        user_id=user_id,
        name=request.name,
        description=request.description,
        color=request.color,
        icon=request.icon,
        is_default=request.is_default
    )
    
    if not favorite_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite list not found"
        )
    
    return favorite_list.to_dict()


@router.delete("/lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(
    list_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Delete a favorite list"""
    success = FavoriteService.delete_list(db, list_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite list not found"
        )
    return None


@router.post("/items", status_code=status.HTTP_201_CREATED)
def add_to_list(
    request: AddToListRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Add an ad to a favorite list"""
    item = FavoriteService.add_ad_to_list(
        db=db,
        list_id=request.list_id,
        ad_id=request.ad_id,
        user_id=user_id,
        notes=request.notes
    )
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add ad to favorites. List or ad may not exist."
        )
    
    return item.to_dict(include_ad=False)


@router.delete("/items", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_list(
    request: RemoveFromListRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Remove an ad from a favorite list"""
    success = FavoriteService.remove_ad_from_list(
        db=db,
        list_id=request.list_id,
        ad_id=request.ad_id,
        user_id=user_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found in list"
        )
    
    return None


@router.get("/ads/{ad_id}/lists")
def get_ad_lists(
    ad_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Get all lists that contain a specific ad"""
    list_ids = FavoriteService.get_ad_lists(db, ad_id, user_id)
    return {"list_ids": list_ids}


@router.get("/all")
def get_all_favorites(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Get all favorite lists with their ads"""
    return FavoriteService.get_all_favorites_with_ads(db, user_id)


@router.post("/ensure-default")
def ensure_default_list(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Ensure user has a default favorite list"""
    default_list = FavoriteService.ensure_default_list(db, user_id)
    return default_list.to_dict()
