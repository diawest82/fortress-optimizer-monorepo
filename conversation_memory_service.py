#!/usr/bin/env python3
"""
Conversation Memory Service - Centralized conversation logging across all workspaces.
Automatically captures chat interactions and syncs to cloud hub for persistent memory.
"""
import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import requests
import threading
import queue

class ConversationMemoryService:
    def __init__(self, workspace_root: str = None):
        self.workspace_root = workspace_root or os.getcwd()
        self.workspace_name = Path(self.workspace_root).name
        
        # Cloud hub endpoint for conversation storage
        self.cloud_hub = "http://100.30.228.129:8000"
        self.local_hub = "http://127.0.0.1:3333"
        
        # Centralized conversation log (accessible from all workspaces)
        self.log_dir = Path.home() / ".ima_conversation_hub"
        self.log_dir.mkdir(exist_ok=True)
        
        # Session management
        self.session_id = f"{self.workspace_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.conversation_buffer = queue.Queue()
        
        # Background sync thread
        self.sync_thread = None
        self.running = False
        
    def start(self):
        """Start the conversation memory service"""
        self.running = True
        self.sync_thread = threading.Thread(target=self._sync_loop, daemon=True)
        self.sync_thread.start()
        
        print(f"✅ Conversation Memory Service Started")
        print(f"   Session ID: {self.session_id}")
        print(f"   Workspace: {self.workspace_name}")
        print(f"   Cloud Hub: {self.cloud_hub}")
        print(f"   Local Logs: {self.log_dir}")
        
    def log_interaction(self, user_message: str, assistant_response: str, metadata: Dict = None):
        """Log a conversation interaction"""
        interaction = {
            "timestamp": datetime.now().isoformat(),
            "session_id": self.session_id,
            "workspace": self.workspace_name,
            "user_message": user_message,
            "assistant_response": assistant_response,
            "metadata": metadata or {}
        }
        
        # Add to buffer for background sync
        self.conversation_buffer.put(interaction)
        
        # Write to local log immediately
        self._write_local_log(interaction)
        
    def _write_local_log(self, interaction: Dict):
        """Write interaction to local log file"""
        log_file = self.log_dir / f"{datetime.now().strftime('%Y-%m-%d')}.jsonl"
        with open(log_file, 'a') as f:
            f.write(json.dumps(interaction) + '\n')
            
    def _sync_loop(self):
        """Background thread that syncs conversations to cloud hub"""
        while self.running:
            try:
                # Batch process up to 10 interactions
                batch = []
                while len(batch) < 10:
                    try:
                        interaction = self.conversation_buffer.get(timeout=5)
                        batch.append(interaction)
                    except queue.Empty:
                        break
                
                if batch:
                    self._sync_to_cloud(batch)
                    
            except Exception as e:
                print(f"⚠️ Sync error: {e}")
                time.sleep(5)
                
    def _sync_to_cloud(self, interactions: List[Dict]):
        """Sync interactions to cloud hub"""
        try:
            # Send to cloud hub learning-feedback endpoint
            payload = {
                "event_type": "conversation_memory",
                "session_id": self.session_id,
                "workspace": self.workspace_name,
                "timestamp": datetime.now().isoformat(),
                "interactions": interactions,
                "source": "conversation_memory_service"
            }
            
            response = requests.post(
                f"{self.cloud_hub}/hub/learning-feedback",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Synced {len(interactions)} interactions to cloud hub")
            else:
                print(f"⚠️ Cloud sync returned {response.status_code}")
                
        except Exception as e:
            print(f"⚠️ Cloud sync failed: {e}")
            # Interactions are still saved locally
            
    def get_recent_context(self, days: int = 7, limit: int = 50) -> List[Dict]:
        """Get recent conversation context from local logs"""
        context = []
        
        # Read recent log files
        for log_file in sorted(self.log_dir.glob("*.jsonl"), reverse=True):
            if len(context) >= limit:
                break
                
            with open(log_file, 'r') as f:
                for line in f:
                    interaction = json.loads(line.strip())
                    context.append(interaction)
                    if len(context) >= limit:
                        break
                        
        return context[:limit]
    
    def get_workspace_history(self, workspace: str = None) -> List[Dict]:
        """Get all conversation history for a specific workspace"""
        workspace = workspace or self.workspace_name
        history = []
        
        for log_file in sorted(self.log_dir.glob("*.jsonl")):
            with open(log_file, 'r') as f:
                for line in f:
                    interaction = json.loads(line.strip())
                    if interaction.get("workspace") == workspace:
                        history.append(interaction)
                        
        return history
    
    def get_cross_workspace_context(self, limit: int = 100) -> Dict[str, List[Dict]]:
        """Get conversation context across all workspaces"""
        all_context = {}
        
        for log_file in sorted(self.log_dir.glob("*.jsonl"), reverse=True):
            with open(log_file, 'r') as f:
                for line in f:
                    interaction = json.loads(line.strip())
                    workspace = interaction.get("workspace", "unknown")
                    
                    if workspace not in all_context:
                        all_context[workspace] = []
                    
                    all_context[workspace].append(interaction)
                    
        return all_context
    
    def stop(self):
        """Stop the conversation memory service"""
        self.running = False
        if self.sync_thread:
            self.sync_thread.join(timeout=5)
        print("✅ Conversation Memory Service Stopped")


def install_conversation_logger():
    """Install conversation logger as a persistent service"""
    service = ConversationMemoryService()
    service.start()
    
    # Save service PID for monitoring
    pid_file = Path.cwd() / ".conversation_memory.pid"
    with open(pid_file, 'w') as f:
        f.write(str(os.getpid()))
    
    print("\n" + "="*60)
    print("CONVERSATION MEMORY SERVICE: INSTALLED")
    print("="*60)
    print(f"✅ Session ID: {service.session_id}")
    print(f"✅ Local Logs: {service.log_dir}")
    print(f"✅ Cloud Sync: {service.cloud_hub}/hub/learning-feedback")
    print(f"✅ Cross-Workspace: Enabled")
    print("\nAll conversations will be:")
    print("  • Logged locally in .conversation_logs/")
    print("  • Synced to cloud hub for centralized access")
    print("  • Available across all workspaces")
    print("  • Searchable and retrievable by IMA")
    print("="*60 + "\n")
    
    return service


if __name__ == "__main__":
    # Start the conversation memory service
    service = install_conversation_logger()
    
    # Example usage
    service.log_interaction(
        user_message="Test: Can you remember this conversation?",
        assistant_response="Yes! This interaction is now logged locally and syncing to the cloud hub.",
        metadata={"test": True, "feature": "conversation_memory"}
    )
    
    # Keep service running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        service.stop()
