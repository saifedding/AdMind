from typing import List, Optional, Dict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from app.models.favorite import FavoriteList, FavoriteItem
from app.models.ad import Ad
import logging

logger = logging.getLogger(__name__)


class FavoriteService:
    """Service for managing favorite lists and items"""

    @staticmethod
    def get_user_lists(db: Session, user_id: int) -> List[FavoriteList]:
        """Get all favorite lists for a user"""
        return db.query(FavoriteList).filter(
            FavoriteList.user_id == user_id
        ).order_by(FavoriteList.is_default.desc(), FavoriteList.created_at.desc()).all()

    @staticmethod
    def get_list_by_id(db: Session, list_id: int, user_id: int) -> Optional[FavoriteList]:
        """Get a specific list by ID (ensuring it belongs to the user)"""
        return db.query(FavoriteList).filter(
            FavoriteList.id == list_id,
            FavoriteList.user_id == user_id
        ).first()

    @staticmethod
    def create_list(db: Session, user_id: int, name: str, description: Optional[str] = None,
                   color: str = 'blue', icon: str = 'star', is_default: bool = False) -> FavoriteList:
        """Create a new favorite list"""
        
        # If setting as default, unset any existing default
        if is_default:
            db.query(FavoriteList).filter(
                FavoriteList.user_id == user_id,
                FavoriteList.is_default == True
            ).update({'is_default': False})
        
        favorite_list = FavoriteList(
            user_id=user_id,
            name=name,
            description=description,
            color=color,
            icon=icon,
            is_default=is_default
        )
        db.add(favorite_list)
        db.commit()
        db.refresh(favorite_list)
        logger.info(f"Created favorite list '{name}' (id: {favorite_list.id}) for user {user_id}")
        return favorite_list

    @staticmethod
    def update_list(db: Session, list_id: int, user_id: int, 
                   name: Optional[str] = None, description: Optional[str] = None,
                   color: Optional[str] = None, icon: Optional[str] = None,
                   is_default: Optional[bool] = None) -> Optional[FavoriteList]:
        """Update a favorite list"""
        favorite_list = FavoriteService.get_list_by_id(db, list_id, user_id)
        if not favorite_list:
            return None
        
        if name is not None:
            favorite_list.name = name
        if description is not None:
            favorite_list.description = description
        if color is not None:
            favorite_list.color = color
        if icon is not None:
            favorite_list.icon = icon
        if is_default is not None:
            if is_default:
                # Unset other defaults
                db.query(FavoriteList).filter(
                    FavoriteList.user_id == user_id,
                    FavoriteList.id != list_id,
                    FavoriteList.is_default == True
                ).update({'is_default': False})
            favorite_list.is_default = is_default
        
        db.commit()
        db.refresh(favorite_list)
        logger.info(f"Updated favorite list {list_id} for user {user_id}")
        return favorite_list

    @staticmethod
    def delete_list(db: Session, list_id: int, user_id: int) -> bool:
        """Delete a favorite list"""
        favorite_list = FavoriteService.get_list_by_id(db, list_id, user_id)
        if not favorite_list:
            return False
        
        db.delete(favorite_list)
        db.commit()
        logger.info(f"Deleted favorite list {list_id} for user {user_id}")
        return True

    @staticmethod
    def add_ad_to_list(db: Session, list_id: int, ad_id: int, user_id: int, 
                      notes: Optional[str] = None) -> Optional[FavoriteItem]:
        """Add an ad to a favorite list"""
        # Verify list belongs to user
        favorite_list = FavoriteService.get_list_by_id(db, list_id, user_id)
        if not favorite_list:
            logger.warning(f"List {list_id} not found or doesn't belong to user {user_id}")
            return None
        
        # Verify ad exists
        ad = db.query(Ad).filter(Ad.id == ad_id).first()
        if not ad:
            logger.warning(f"Ad {ad_id} not found")
            return None
        
        # Check if already exists
        existing = db.query(FavoriteItem).filter(
            FavoriteItem.list_id == list_id,
            FavoriteItem.ad_id == ad_id
        ).first()
        
        if existing:
            # Update notes if provided
            if notes is not None:
                existing.notes = notes
                db.commit()
                db.refresh(existing)
            logger.info(f"Ad {ad_id} already in list {list_id}, updated notes")
            return existing
        
        # Create new favorite item
        try:
            favorite_item = FavoriteItem(
                list_id=list_id,
                ad_id=ad_id,
                notes=notes
            )
            db.add(favorite_item)
            db.commit()
            db.refresh(favorite_item)
            logger.info(f"Added ad {ad_id} to favorite list {list_id}")
            return favorite_item
        except IntegrityError as e:
            db.rollback()
            logger.error(f"Error adding ad to favorites: {e}")
            return None

    @staticmethod
    def remove_ad_from_list(db: Session, list_id: int, ad_id: int, user_id: int) -> bool:
        """Remove an ad from a favorite list"""
        # Verify list belongs to user
        favorite_list = FavoriteService.get_list_by_id(db, list_id, user_id)
        if not favorite_list:
            return False
        
        # Find and delete the item
        favorite_item = db.query(FavoriteItem).filter(
            FavoriteItem.list_id == list_id,
            FavoriteItem.ad_id == ad_id
        ).first()
        
        if not favorite_item:
            return False
        
        db.delete(favorite_item)
        db.commit()
        logger.info(f"Removed ad {ad_id} from favorite list {list_id}")
        return True

    @staticmethod
    def get_list_items(db: Session, list_id: int, user_id: int, 
                      include_ads: bool = True) -> Optional[List[FavoriteItem]]:
        """Get all items in a favorite list"""
        # Verify list belongs to user
        favorite_list = FavoriteService.get_list_by_id(db, list_id, user_id)
        if not favorite_list:
            return None
        
        # Eagerly load ad with its relationships (competitor, analysis, ad_set)
        items = db.query(FavoriteItem).filter(
            FavoriteItem.list_id == list_id
        ).options(
            joinedload(FavoriteItem.ad).joinedload(Ad.competitor),
            joinedload(FavoriteItem.ad).joinedload(Ad.analysis),
            joinedload(FavoriteItem.ad).joinedload(Ad.ad_set)
        ).order_by(FavoriteItem.created_at.desc()).all()
        
        return items

    @staticmethod
    def get_ad_lists(db: Session, ad_id: int, user_id: int) -> List[int]:
        """Get all list IDs that contain a specific ad for a user"""
        lists = db.query(FavoriteList.id).join(FavoriteItem).filter(
            FavoriteList.user_id == user_id,
            FavoriteItem.ad_id == ad_id
        ).all()
        return [list_id for (list_id,) in lists]

    @staticmethod
    def ensure_default_list(db: Session, user_id: int) -> FavoriteList:
        """Ensure user has a default favorite list, create if not exists"""
        default_list = db.query(FavoriteList).filter(
            FavoriteList.user_id == user_id,
            FavoriteList.is_default == True
        ).first()
        
        if not default_list:
            # Check if user has any lists at all
            any_list = db.query(FavoriteList).filter(
                FavoriteList.user_id == user_id
            ).first()
            
            if any_list:
                # Set first list as default
                any_list.is_default = True
                db.commit()
                db.refresh(any_list)
                return any_list
            else:
                # Create default list
                return FavoriteService.create_list(
                    db=db,
                    user_id=user_id,
                    name="My Favorites",
                    description="Default favorites list",
                    color="blue",
                    icon="star",
                    is_default=True
                )
        
        return default_list

    @staticmethod
    def get_all_favorites_with_ads(db: Session, user_id: int) -> Dict:
        """Get all favorite lists with their ads for a user"""
        lists = FavoriteService.get_user_lists(db, user_id)
        
        result = []
        for fav_list in lists:
            # Eagerly load ad with its relationships
            items = db.query(FavoriteItem).filter(
                FavoriteItem.list_id == fav_list.id
            ).options(
                joinedload(FavoriteItem.ad).joinedload(Ad.competitor),
                joinedload(FavoriteItem.ad).joinedload(Ad.analysis),
                joinedload(FavoriteItem.ad).joinedload(Ad.ad_set)
            ).order_by(FavoriteItem.created_at.desc()).all()
            
            result.append({
                **fav_list.to_dict(),
                'items': [item.to_dict(include_ad=True) for item in items]
            })
        
        return {'lists': result, 'total_lists': len(result)}
