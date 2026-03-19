#!/usr/bin/env python3
"""
Centralized Conversation Hub - Shared conversation logs across all workspaces.
All workspaces write to a central location for true cross-workspace memory.
"""
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List
import requests

class CentralizedConversationHub:
    """Centralized conversation storage accessible from any workspace"""
    
    def __init__(self):
        # Centralized log location (accessible from all workspaces)
        self.central_hub_path = Path.home() / ".ima_conversation_hub"
        self.central_hub_path.mkdir(exist_ok=True)
        
        self.cloud_hub = "http://100.30.228.129:8000"
        self.workspace_name = Path.cwd().name
        
    def log_conversation(self, user_message: str, assistant_response: str, metadata: Dict = None):
        """Log conversation to centralized hub"""
        interaction = {
            "timestamp": datetime.now().isoformat(),
            "workspace": self.workspace_name,
            "user_message": user_message,
            "assistant_response": assistant_response,
            "metadata": metadata or {}
        }
        
        # Write to central hub
        log_file = self.central_hub_path / f"{datetime.now().strftime('%Y-%m-%d')}.jsonl"
        with open(log_file, 'a') as f:
            f.write(json.dumps(interaction) + '\n')
        
        # Also sync to cloud
        self._sync_to_cloud(interaction)
        
    def _sync_to_cloud(self, interaction: Dict):
        """Sync interaction to cloud hub"""
        try:
            payload = {
                "event_type": "conversation_memory",
                "workspace": self.workspace_name,
                "timestamp": datetime.now().isoformat(),
                "interactions": [interaction],
                "source": "centralized_conversation_hub"
            }
            
            requests.post(
                f"{self.cloud_hub}/hub/learning-feedback",
                json=payload,
                timeout=5
            )
        except:
            pass  # Silent fail, local log is primary
    
    def get_all_conversations(self, days: int = 7) -> List[Dict]:
        """Get all conversations across all workspaces"""
        cutoff = datetime.now() - timedelta(days=days)
        conversations = []
        
        for log_file in sorted(self.central_hub_path.glob("*.jsonl"), reverse=True):
            with open(log_file, 'r') as f:
                for line in f:
                    conv = json.loads(line.strip())
                    conv_time = datetime.fromisoformat(conv["timestamp"])
                    if conv_time >= cutoff:
                        conversations.append(conv)
        
        return sorted(conversations, key=lambda x: x["timestamp"], reverse=True)
    
    def get_workspace_conversations(self, workspace: str = None, days: int = 30) -> List[Dict]:
        """Get conversations for specific workspace"""
        workspace = workspace or self.workspace_name
        all_convs = self.get_all_conversations(days=days)
        return [c for c in all_convs if c.get("workspace") == workspace]
    
    def get_today_conversations(self) -> List[Dict]:
        """Get today's conversations across all workspaces"""
        log_file = self.central_hub_path / f"{datetime.now().strftime('%Y-%m-%d')}.jsonl"
        conversations = []
        
        if log_file.exists():
            with open(log_file, 'r') as f:
                for line in f:
                    conversations.append(json.loads(line.strip()))
        
        return conversations
    
    def get_workspace_summary(self, days: int = 30) -> Dict[str, int]:
        """Get conversation count by workspace"""
        convs = self.get_all_conversations(days=days)
        summary = {}
        
        for conv in convs:
            workspace = conv.get("workspace", "unknown")
            summary[workspace] = summary.get(workspace, 0) + 1
        
        return summary
    
    def format_for_prompt(self, limit: int = 10, workspace: str = None) -> str:
        """Format recent conversations for LLM prompt"""
        if workspace:
            convs = self.get_workspace_conversations(workspace, days=7)[:limit]
        else:
            convs = self.get_all_conversations(days=7)[:limit]
        
        if not convs:
            return "No recent conversation history."
        
        formatted = "RECENT CONVERSATION HISTORY:\n" + "="*60 + "\n\n"
        
        for conv in convs:
            ts = conv["timestamp"][:19]  # Remove microseconds
            ws = conv["workspace"]
            user = conv["user_message"][:150] + ("..." if len(conv["user_message"]) > 150 else "")
            asst = conv["assistant_response"][:150] + ("..." if len(conv["assistant_response"]) > 150 else "")
            
            formatted += f"[{ts}] [{ws}]\n"
            formatted += f"User: {user}\n"
            formatted += f"IMA: {asst}\n"
            formatted += "-"*60 + "\n\n"
        
        return formatted
    
    def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search conversations by keyword"""
        convs = self.get_all_conversations(days=90)
        results = []
        
        query_lower = query.lower()
        for conv in convs:
            if (query_lower in conv["user_message"].lower() or 
                query_lower in conv["assistant_response"].lower()):
                results.append(conv)
                if len(results) >= limit:
                    break
        
        return results


def test_centralized_hub():
    """Test centralized conversation hub"""
    hub = CentralizedConversationHub()
    
    print("\n" + "="*60)
    print("CENTRALIZED CONVERSATION HUB TEST")
    print("="*60)
    print(f"\n📍 Central Hub Location: {hub.central_hub_path}")
    print(f"📍 Current Workspace: {hub.workspace_name}")
    
    # Log test interaction
    print("\n1️⃣ Logging test interaction...")
    hub.log_conversation(
        user_message="Test from " + hub.workspace_name,
        assistant_response="Centralized hub working in " + hub.workspace_name,
        metadata={"test": True}
    )
    print("   ✅ Logged")
    
    # Get all conversations
    print("\n2️⃣ All Conversations (7 days):")
    all_convs = hub.get_all_conversations(days=7)
    print(f"   Found {len(all_convs)} total interactions")
    
    # Get workspace summary
    print("\n3️⃣ Workspace Summary:")
    summary = hub.get_workspace_summary(days=30)
    for workspace, count in summary.items():
        print(f"   {workspace}: {count} interactions")
    
    # Today's conversations
    print("\n4️⃣ Today's Conversations:")
    today = hub.get_today_conversations()
    print(f"   Found {len(today)} interactions today")
    
    # Formatted context
    print("\n5️⃣ Formatted Context (last 3):")
    context = hub.format_for_prompt(limit=3)
    print(context)
    
    print("="*60 + "\n")


if __name__ == "__main__":
    test_centralized_hub()
