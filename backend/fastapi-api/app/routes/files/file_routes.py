from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from app.dependencies.auth import get_current_user
from app.database import get_db
from app.schemas.schemas import TrackResponse, StorageInfoResponse, TrackSearchResult, MetadataUpdate, MetadataResponse
from typing import List
from uuid import UUID
import logging
from uuid import UUID

from .audio_handler import AudioHandler
from .cover_handler import CoverHandler
from .track_search_handler import TrackSearchHandler
from .file_security import FileSecurity

from app.services.storage_quota_service import StorageQuotaService
from app.services.metadata_edit_service import MetadataEditService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["files"])

# Audio file operations
@router.post("/upload/audio", response_model=TrackResponse)
async def upload_audio(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Audio file upload with automatic database recording"""
    user_id = current_user["id"]
    return await AudioHandler.upload_audio(file, user_id, db)

@router.get("/audio/{filename}")
async def get_audio_file(
    filename: str, 
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Downloads or streams an audio file with range support"""
    user_id = current_user["id"]
    
    # Verify file ownership using database
    if not FileSecurity.verify_file_ownership(filename, str(user_id), db):
        logger.warning(f"User {user_id} attempted to access unauthorized audio file: {filename}")
        raise HTTPException(status_code=403, detail="Access denied: file does not belong to user")
    
    # Get track info for enhanced download filename generation
    track = FileSecurity.get_user_track_by_filename(filename, user_id, db)
    
    return await AudioHandler.get_audio_file(filename, request, user_id, db, track)

@router.delete("/audio/{filename}")
async def delete_audio_file(
    filename: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes an audio file and its database record"""
    user_id = current_user["id"]
    
    # Verify file ownership using database
    if not FileSecurity.verify_file_ownership(filename, str(user_id), db):
        logger.warning(f"User {user_id} attempted to delete unauthorized audio file: {filename}")
        raise HTTPException(status_code=403, detail="Access denied: file does not belong to user")
    
    # Get track info for deletion
    track = FileSecurity.get_user_track_by_filename(filename, user_id, db)
    
    return AudioHandler.delete_audio_file(filename, user_id, db, track)

@router.delete("/tracks/all")
async def delete_all_user_tracks(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all tracks for the current user (both database records and files)"""
    user_id = current_user["id"]
    return AudioHandler.delete_all_user_tracks(user_id, db)

# Cover file operations
@router.post("/upload/cover")
async def upload_cover(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Cover picture upload with automatic thumbnails generation"""
    user_id = str(current_user["id"])
    return await CoverHandler.upload_cover(file, user_id)

@router.get("/cover/{filename}")
async def get_cover_file(
    filename: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Downloads a cover picture with proper MIME type detection"""
    user_id = str(current_user["id"])
    
    if not FileSecurity.verify_file_ownership(filename, user_id, db):
        logger.warning(f"User {user_id} attempted to access unauthorized cover file: {filename}")
        raise HTTPException(status_code=403, detail="Access denied: file does not belong to user")
    
    return CoverHandler.get_cover_file(filename)

@router.get("/cover/{filename}/thumbnail/{size}")
async def get_thumbnail(
    filename: str, 
    size: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific thumbnail size for a cover image"""
    user_id = str(current_user["id"])
    
    if not FileSecurity.verify_file_ownership(filename, user_id, db):
        raise HTTPException(status_code=403, detail="Access denied: file does not belong to user")
    
    return CoverHandler.get_thumbnail(filename, size)

@router.get("/cover/{filename}/thumbnails")
async def get_available_thumbnails(
    filename: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all available thumbnails for a cover image"""
    user_id = str(current_user["id"])
    
    if not FileSecurity.verify_file_ownership(filename, user_id, db):
        raise HTTPException(status_code=403, detail="Access denied: file does not belong to user")
    
    return CoverHandler.get_available_thumbnails(filename)

@router.delete("/cover/{filename}")
async def delete_cover_file(
    filename: str, 
    include_thumbnails: bool = True,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes a cover image and its thumbnails"""
    user_id = str(current_user["id"])
    
    if not FileSecurity.verify_file_ownership(filename, user_id, db):
        logger.warning(f"User {user_id} attempted to delete unauthorized cover file: {filename}")
        raise HTTPException(status_code=403, detail="Access denied: file does not belong to user")
    
    return CoverHandler.delete_cover_file(filename, user_id, include_thumbnails)

# Track search and listing operations
@router.get("/tracks", response_model=List[TrackResponse])
async def get_user_tracks(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all tracks for the current user"""
    user_id = current_user["id"]
    return TrackSearchHandler.get_user_tracks(user_id, db, skip, limit)

@router.get("/tracks/search", response_model=TrackSearchResult)
async def search_tracks(
    query: str = None,
    search_in_filename: bool = True,
    search_in_metadata: bool = True,
    file_type: str = None,
    offset: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search tracks for the current user"""
    user_id = current_user["id"]
    
    return TrackSearchHandler.search_tracks(
        user_id=user_id,
        db=db,
        query=query,
        search_in_filename=search_in_filename,
        search_in_metadata=search_in_metadata,
        file_type=file_type,
        offset=offset,
        limit=limit
    )

@router.get("/tracks/{track_id}")
async def get_track_by_id(
    track_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific track by ID"""
    user_id = current_user["id"]
    return TrackSearchHandler.get_track_by_id(user_id, track_id, db)

@router.get("/tracks/stats/summary")
async def get_track_statistics(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get statistics about user's tracks"""
    user_id = current_user["id"]
    return TrackSearchHandler.get_track_statistics(user_id, db)

@router.get("/tracks/recent")
async def get_recent_tracks(
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recently uploaded tracks"""
    user_id = current_user["id"]
    return TrackSearchHandler.get_recent_tracks(user_id, db, limit)

@router.get("/tracks/popular")
async def get_popular_tracks(
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get most accessed tracks"""
    user_id = current_user["id"]
    return TrackSearchHandler.get_popular_tracks(user_id, db, limit)

@router.get("/storage/info", response_model=StorageInfoResponse)
async def get_storage_info(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's storage quota and usage information"""
    user_id = current_user["id"]
    
    try:
        storage_info = StorageQuotaService.get_user_storage_info(db, user_id)
        
        return StorageInfoResponse(
            quota=storage_info["quota"],
            used=storage_info["used"],
            available=storage_info["available"],
            usage_percentage=storage_info["usage_percentage"],
            quota_formatted=StorageQuotaService.format_bytes(storage_info["quota"]),
            used_formatted=StorageQuotaService.format_bytes(storage_info["used"]),
            available_formatted=StorageQuotaService.format_bytes(storage_info["available"])
        )
        
    except Exception as e:
        logger.error(f"Error getting storage info for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving storage information")

@router.patch("/tracks/{track_id}/cover")
async def update_track_cover(
    track_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update cover art for a specific track"""
    user_id = str(current_user["id"])
    return await CoverHandler.update_track_cover(file, user_id, track_id, db)

# Metadata editing operations
@router.get("/tracks/{track_id}/metadata", response_model=dict)
async def get_track_metadata(
    track_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get metadata for a specific track"""
    user_id = current_user["id"]
    
    try:
        track_uuid = UUID(track_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid track ID format")
    
    metadata = MetadataEditService.get_track_metadata(db, track_uuid, user_id)
    
    if metadata is None:
        raise HTTPException(status_code=404, detail="Track not found or access denied")
    
    return metadata

@router.patch("/tracks/{track_id}/metadata", response_model=dict)
async def update_track_metadata(
    track_id: str,
    metadata_update: MetadataUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update metadata for a specific track (partial update)"""
    user_id = current_user["id"]
    
    try:
        track_uuid = UUID(track_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid track ID format")
    
    # Validate metadata fields
    validation_errors = MetadataEditService.validate_metadata_fields(metadata_update)
    if validation_errors:
        raise HTTPException(status_code=400, detail={"validation_errors": validation_errors})
    
    try:
        updated_metadata = MetadataEditService.update_track_metadata(db, track_uuid, user_id, metadata_update)
        
        if updated_metadata is None:
            raise HTTPException(status_code=404, detail="Track not found or access denied")
        
        logger.info(f"Metadata updated for track {track_id} by user {user_id}")
        return {
            "message": "Metadata updated successfully",
            "track_id": track_id,
            "updated_metadata": updated_metadata
        }
        
    except Exception as e:
        logger.error(f"Error updating metadata for track {track_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating metadata")