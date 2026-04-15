"""Background Analytics Sync Service
Periodically syncs analytics, feedback, and server stats to servercraft.dev
"""

import time
import threading
import asyncio
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Optional
import aiohttp

# ServerCraft.dev API configuration
SERVERCRAFT_DEV_API = "https://servercraft.dev/api"

class AnalyticsSyncService:
    """Service to sync local analytics and feedback to servercraft.dev"""
    
    def __init__(self, data_path: Path, interval_minutes: int = 10):
        self.data_path = data_path
        self.interval = interval_minutes * 60
        self.running = False
        self.thread = None
        self.sync_log_file = data_path / "sync_log.json"
        self._ensure_files()
        
        # Sync configuration
        self.api_endpoint = SERVERCRAFT_DEV_API
        self.last_sync = None
        self.sync_enabled = True
    
    def _ensure_files(self):
        """Create log file if it doesn't exist"""
        if not self.sync_log_file.exists():
            self._save_json(self.sync_log_file, {
                "last_sync": None,
                "sync_history": [],
                "errors": []
            })
    
    def _load_json(self, filepath: Path) -> Dict:
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except:
            return {}
    
    def _save_json(self, filepath: Path, data: Dict):
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    
    def start(self):
        """Start the background sync service"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._sync_loop, daemon=True)
            self.thread.start()
            print(f"✓ Analytics sync service started (syncing every {self.interval_minutes} minutes)")
    
    def stop(self):
        """Stop the background sync service"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("✓ Analytics sync service stopped")
    
    def _sync_loop(self):
        """Background loop that syncs analytics periodically"""
        while self.running:
            try:
                if self.sync_enabled:
                    # Run async sync in new event loop
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        loop.run_until_complete(self._perform_sync())
                    finally:
                        loop.close()
            except Exception as e:
                self._log_error(f"Sync error: {e}")
            
            # Wait for next sync
            time.sleep(self.interval)
    
    async def _perform_sync(self):
        """Perform the actual sync to servercraft.dev"""
        sync_result = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "success": False,
            "synced_items": []
        }
        
        try:
            # Load local data
            analytics = self._load_local_analytics()
            feedback = self._load_local_feedback()
            device_info = self._load_device_info()
            
            # Build sync payload
            payload = {
                "device_id": device_info.get("device_id"),
                "platform": device_info.get("platform", "Windows"),
                "version": device_info.get("first_version"),
                "analytics": analytics,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # Sync analytics to servercraft.dev
            async with aiohttp.ClientSession() as session:
                # Sync analytics
                try:
                    async with session.post(
                        f"{self.api_endpoint}/sync/analytics",
                        json=payload,
                        timeout=aiohttp.ClientTimeout(total=30)
                    ) as response:
                        if response.status == 200:
                            sync_result["synced_items"].append("analytics")
                        else:
                            self._log_error(f"Analytics sync failed: HTTP {response.status}")
                except Exception as e:
                    self._log_error(f"Analytics sync error: {e}")
                
                # Sync feedback (if any new submissions)
                unsent_feedback = self._get_unsent_feedback(feedback)
                if unsent_feedback:
                    try:
                        async with session.post(
                            f"{self.api_endpoint}/sync/feedback",
                            json={
                                "device_id": device_info.get("device_id"),
                                "feedback": unsent_feedback
                            },
                            timeout=aiohttp.ClientTimeout(total=30)
                        ) as response:
                            if response.status == 200:
                                sync_result["synced_items"].append("feedback")
                                self._mark_feedback_sent(unsent_feedback)
                    except Exception as e:
                        self._log_error(f"Feedback sync error: {e}")
            
            sync_result["success"] = len(sync_result["synced_items"]) > 0
            self.last_sync = sync_result["timestamp"]
            
        except Exception as e:
            sync_result["error"] = str(e)
            self._log_error(f"Sync failed: {e}")
        
        # Log sync result
        self._log_sync(sync_result)
        return sync_result
    
    def _load_local_analytics(self) -> Dict:
        """Load local analytics data"""
        analytics_file = self.data_path / "analytics.json"
        return self._load_json(analytics_file)
    
    def _load_local_feedback(self) -> list:
        """Load local feedback submissions"""
        feedback_file = self.data_path / "feedback_submissions.json"
        data = self._load_json(feedback_file)
        return data.get("submissions", [])
    
    def _load_device_info(self) -> Dict:
        """Load device info"""
        device_file = self.data_path / "device.json"
        return self._load_json(device_file)
    
    def _get_unsent_feedback(self, feedback: list) -> list:
        """Get feedback that hasn't been synced yet"""
        return [f for f in feedback if not f.get("synced_to_website", False)]
    
    def _mark_feedback_sent(self, sent_feedback: list):
        """Mark feedback as sent to website"""
        feedback_file = self.data_path / "feedback_submissions.json"
        data = self._load_json(feedback_file)
        
        sent_ids = {f["id"] for f in sent_feedback}
        for submission in data.get("submissions", []):
            if submission.get("id") in sent_ids:
                submission["synced_to_website"] = True
                submission["synced_at"] = datetime.now(timezone.utc).isoformat()
        
        self._save_json(feedback_file, data)
    
    def _log_sync(self, result: Dict):
        """Log sync result"""
        log_data = self._load_json(self.sync_log_file)
        log_data["last_sync"] = result["timestamp"]
        log_data.setdefault("sync_history", []).append(result)
        
        # Keep only last 50 sync records
        if len(log_data["sync_history"]) > 50:
            log_data["sync_history"] = log_data["sync_history"][-50:]
        
        self._save_json(self.sync_log_file, log_data)
    
    def _log_error(self, error: str):
        """Log sync error"""
        print(f"⚠ {error}")
        log_data = self._load_json(self.sync_log_file)
        log_data.setdefault("errors", []).append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": error
        })
        
        # Keep only last 20 errors
        if len(log_data["errors"]) > 20:
            log_data["errors"] = log_data["errors"][-20:]
        
        self._save_json(self.sync_log_file, log_data)
    
    def get_sync_status(self) -> Dict:
        """Get current sync status"""
        log_data = self._load_json(self.sync_log_file)
        return {
            "enabled": self.sync_enabled,
            "running": self.running,
            "interval_minutes": self.interval_minutes,
            "last_sync": log_data.get("last_sync"),
            "api_endpoint": self.api_endpoint,
            "recent_syncs": log_data.get("sync_history", [])[-5:],
            "recent_errors": log_data.get("errors", [])[-3:]
        }
    
    def set_enabled(self, enabled: bool):
        """Enable or disable sync"""
        self.sync_enabled = enabled
    
    def force_sync(self) -> Dict:
        """Force an immediate sync"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(self._perform_sync())
            return result
        finally:
            loop.close()
    
    @property
    def interval_minutes(self):
        return self.interval // 60


# ==================== API CONTRACT FOR servercraft.dev ====================
"""
ServerCraft Panel -> servercraft.dev API Contract

1. ANALYTICS SYNC (POST /api/sync/analytics)
   Request:
   {
       "device_id": "uuid-string",
       "platform": "Windows",
       "version": "2026.1.6.44D",
       "analytics": {
           "total_launches": 100,
           "total_servers_created": 5,
           "total_nodes_deployed": 2,
           "current_servers_running": 3,
           "last_launch": "2026-01-06T12:00:00Z",
           "version_history": ["2025.18.12.0A", "2026.1.6.44D"]
       },
       "timestamp": "2026-01-06T12:00:00Z"
   }
   
   Response: { "success": true, "message": "Analytics received" }

2. FEEDBACK SYNC (POST /api/sync/feedback)
   Request:
   {
       "device_id": "uuid-string",
       "feedback": [
           {
               "id": "uuid-string",
               "answers": { "q1": "5 - Excellent", "q2": "Server Management" },
               "additional_feedback": "Great tool!",
               "submitted_at": "2026-01-06T12:00:00Z"
           }
       ]
   }
   
   Response: { "success": true, "received_count": 1 }

3. STATUS CHECK (GET /api/sync/status)
   Response:
   {
       "active_devices": 150,
       "total_downloads": 1000,
       "servers_running_globally": 500
   }

4. TEMPLATE MARKETPLACE (Future - Currently Disabled)
   GET /api/marketplace/templates - List available templates
   POST /api/marketplace/templates - Submit a template
   GET /api/marketplace/templates/{id} - Get template details
"""

# Global instance
sync_service = None

def init_sync_service(data_path: Path, interval_minutes: int = 10) -> AnalyticsSyncService:
    """Initialize the global sync service"""
    global sync_service
    sync_service = AnalyticsSyncService(data_path, interval_minutes)
    return sync_service

def get_sync_service() -> Optional[AnalyticsSyncService]:
    """Get the global sync service instance"""
    return sync_service
