from fastapi import HTTPException, UploadFile
from fastapi.responses import FileResponse
from app.services.storage import StorageService
from sqlalchemy.orm import Session
import logging
import mimetypes

logger = logging.getLogger(__name__)

class CoverHandler:
    """Handler for cover image operations (upload, download, thumbnails, deletion)"""
    
    @staticmethod
    async def upload_cover(file: UploadFile, user_id: str):
        """Cover picture upload with automatic thumbnails generation"""
        try:
            logger.info(f"Cover upload started by user {user_id}: {file.filename}, size: {file.size}, type: {file.content_type}")
            
            storage = StorageService()
            result = await storage.save_cover_file(file, user_id)
            
            logger.info(f"Cover upload successful for user {user_id}: {result['filename']}")
            return {
                "message": "Cover picture successfully uploaded",
                "data": result
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during cover upload {file.filename}: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error during cover upload")
    
    @staticmethod
    def get_cover_file(filename: str):
        """Downloads a cover picture with proper MIME type detection"""
        try:
            storage = StorageService()
            file_path = storage.get_file_path(filename, "cover")
            
            if not file_path:
                logger.warning(f"Cover file not found: {filename}")
                raise HTTPException(status_code=404, detail="Cover picture not found")
            
            # Detect proper MIME type
            mime_type, _ = mimetypes.guess_type(str(file_path))
            if not mime_type or not mime_type.startswith('image'):
                mime_type = 'image/jpeg'
            
            logger.info(f"Cover file served: {filename}")
            return FileResponse(
                path=file_path,
                media_type=mime_type,
                filename=filename
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error serving cover file {filename}: {str(e)}")
            raise HTTPException(status_code=500, detail="Error serving cover file")
    
    @staticmethod
    def get_thumbnail(filename: str, size: str):
        """Get a specific thumbnail size for a cover image"""
        try:
            storage = StorageService()
            
            if size not in storage.THUMBNAIL_SIZES:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid size. Available sizes: {list(storage.THUMBNAIL_SIZES.keys())}"
                )
            
            thumbnail_path = storage.get_thumbnail_path(filename, size)
            
            if not thumbnail_path:
                raise HTTPException(status_code=404, detail="Thumbnail not found")
            
            logger.info(f"Thumbnail served: {filename} (size: {size})")
            return FileResponse(
                path=thumbnail_path,
                media_type='image/webp',
                filename=thumbnail_path.name
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error serving thumbnail {filename} (size: {size}): {str(e)}")
            raise HTTPException(status_code=500, detail="Error serving thumbnail")
    
    @staticmethod
    def get_available_thumbnails(filename: str):
        """Get all available thumbnails for a cover image"""
        try:
            storage = StorageService()
            thumbnails = storage.get_all_thumbnails(filename)
            
            if not thumbnails:
                raise HTTPException(status_code=404, detail="No thumbnail found")
            
            logger.info(f"Available thumbnails retrieved: {filename}")
            return {
                "base_filename": filename,
                "thumbnails": thumbnails
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting available thumbnails for {filename}: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving thumbnails")
    
    @staticmethod
    async def update_track_cover(file: UploadFile, user_id: str, track_id: str, db: Session):
        """Update cover art for a specific track, replacing any existing cover"""
        from app.models.models import Track
        from uuid import UUID
        from pathlib import Path

        try:
            try:
                track_uuid = UUID(track_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid track ID format")

            track = db.query(Track).filter(
                Track.id == track_uuid,
                Track.user_id == int(user_id)
            ).first()

            if not track:
                raise HTTPException(status_code=404, detail="Track not found or access denied")

            # Delete existing cover files to avoid orphans
            if track.cover_path:
                old_filename = Path(track.cover_path).name
                try:
                    storage_cleanup = StorageService()
                    storage_cleanup.delete_file(old_filename, "cover", include_thumbnails=True)
                except Exception as e:
                    logger.warning(f"Could not delete old cover {old_filename}: {str(e)}")

            storage = StorageService()
            result = await storage.save_cover_file(file, user_id)

            cover_path = result.get('path')
            thumbnails = result.get('thumbnails', {})
            cover_thumbnail_path = (
                thumbnails.get('medium', {}).get('path') or
                thumbnails.get('large', {}).get('path') or
                thumbnails.get('small', {}).get('path')
            )

            track.cover_path = cover_path
            track.cover_thumbnail_path = cover_thumbnail_path
            db.commit()
            db.refresh(track)

            logger.info(f"Cover updated for track {track_id} by user {user_id}: {cover_path}")
            return {
                "message": "Cover updated successfully",
                "cover_path": cover_path,
                "cover_thumbnail_path": cover_thumbnail_path,
                "thumbnails": thumbnails,
            }

        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error updating cover for track {track_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error during cover update")

    @staticmethod
    def delete_cover_file(filename: str, user_id: str, include_thumbnails: bool = True):
        """Deletes a cover image and its thumbnails"""
        try:
            logger.info(f"Cover deletion started by user {user_id}: {filename} (thumbnails: {include_thumbnails})")
            
            storage = StorageService()
            deleted = storage.delete_file(filename, "cover", include_thumbnails)
            
            if not deleted:
                logger.warning(f"Cover file not found for deletion: {filename}")
                raise HTTPException(status_code=404, detail="Cover picture not found")
            
            message = "Cover picture successfully deleted"
            if include_thumbnails:
                message += " (thumbnails included)"
            
            logger.info(f"Cover file deleted successfully: {filename}")
            return {"message": message}
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting cover file {filename}: {str(e)}")
            raise HTTPException(status_code=500, detail="Error deleting cover file")
