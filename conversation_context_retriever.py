#!/usr/bin/env python3
"""
Conversation Context Retriever - Pulls conversation history for IMA to maintain continuity.
Works across all workspaces and retrieves from centralized cloud hub.
"""
import json
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

class ConversationContextRetriever:
    def __init__(self):
        self.cloud_hub = "http://100.30.228.129:8000"
        self.local_hub = "http://127.0.0.1:3333"
        self.workspace_root = Path.cwd()
        # Use centralized hub location (accessible from all workspaces)
        self.log_dir = Path.home() / ".ima_conversation_hub"
        
    def get_today_conversations(self) -> List[Dict]:
        """Get all conversations from today"""
        try:
            response = requests.get(
                f"{self.cloud_hub}/hub/learning-feedback",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                # Filter for conversation_memory events from today
                today = datetime.now().date()
                conversations = []
                
                for event in data.get("events", []):
                    if event.get("event_type") == "conversation_memory":
                        event_date = datetime.fromisoformat(
                            event.get("timestamp", "")
                        ).date()
                        if event_date == today:
                            conversations.extend(event.get("interactions", []))
                            
                return conversations
        except Exception as e:
            print(f"⚠️ Cloud retrieval failed: {e}")
            
        # Fallback to local logs
        return self._get_local_today()
    
    def _get_local_today(self) -> List[Dict]:
        """Get today's conversations from local logs"""
        log_file = self.log_dir / f"{datetime.now().strftime('%Y-%m-%d')}.jsonl"
        conversations = []
        
        if log_file.exists():
            with open(log_file, 'r') as f:
                for line in f:
                    conversations.append(json.loads(line.strip()))
                    
        return conversations
    
    def get_recent_context(self, days: int = 7) -> List[Dict]:
        """Get recent conversation context across all workspaces"""
        cutoff = datetime.now() - timedelta(days=days)
        context = []
        
        # Try cloud hub first
        try:
            response = requests.get(
                f"{self.cloud_hub}/hub/learning-feedback",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                for event in data.get("events", []):
                    if event.get("event_type") == "conversation_memory":
                        event_time = datetime.fromisoformat(event.get("timestamp", ""))
                        if event_time >= cutoff:
                            context.extend(event.get("interactions", []))
                            
                return sorted(context, key=lambda x: x["timestamp"], reverse=True)
        except Exception as e:
            print(f"⚠️ Cloud retrieval failed: {e}")
        
        # Fallback to local logs
        return self._get_local_recent(days)
    
    def _get_local_recent(self, days: int) -> List[Dict]:
        """Get recent conversations from local logs"""
        cutoff = datetime.now() - timedelta(days=days)
        context = []
        
        if self.log_dir.exists():
            for log_file in sorted(self.log_dir.glob("*.jsonl"), reverse=True):
                with open(log_file, 'r') as f:
                    for line in f:
                        interaction = json.loads(line.strip())
                        interaction_time = datetime.fromisoformat(
                            interaction.get("timestamp", "")
                        )
                        if interaction_time >= cutoff:
                            context.append(interaction)
                            
        return sorted(context, key=lambda x: x["timestamp"], reverse=True)
    
    def get_workspace_conversations(self, workspace: str) -> List[Dict]:
        """Get all conversations for a specific workspace"""
        context = self.get_recent_context(days=90)  # Last 90 days
        return [c for c in context if c.get("workspace") == workspace]
    
    def get_cross_workspace_summary(self) -> Dict[str, int]:
        """Get summary of conversations across all workspaces"""
        context = self.get_recent_context(days=30)
        summary = {}
        
        for conversation in context:
            workspace = conversation.get("workspace", "unknown")
            summary[workspace] = summary.get(workspace, 0) + 1
            
        return summary
    
    def format_context_for_prompt(self, limit: int = 10) -> str:
        """Format recent conversations for LLM context"""
        conversations = self.get_recent_context(days=7)[:limit]
        
        if not conversations:
            return "No recent conversation history available."
        
        formatted = "RECENT CONVERSATION HISTORY:\n" + "="*60 + "\n\n"
        
        for conv in conversations:
            timestamp = conv.get("timestamp", "")
            workspace = conv.get("workspace", "unknown")
            user_msg = conv.get("user_message", "")
            assistant_msg = conv.get("assistant_response", "")
            
            formatted += f"[{timestamp}] [{workspace}]\n"
            formatted += f"User: {user_msg[:200]}{'...' if len(user_msg) > 200 else ''}\n"
            formatted += f"IMA: {assistant_msg[:200]}{'...' if len(assistant_msg) > 200 else ''}\n"
            formatted += "-"*60 + "\n\n"
        
        return formatted
    
    def search_conversations(self, query: str, limit: int = 10) -> List[Dict]:
        """Search conversations by keyword"""
        context = self.get_recent_context(days=90)
        results = []
        
        query_lower = query.lower()
        for conv in context:
            user_msg = conv.get("user_message", "").lower()
            assistant_msg = conv.get("assistant_response", "").lower()
            
            if query_lower in user_msg or query_lower in assistant_msg:
                results.append(conv)
                if len(results) >= limit:
                    break
                    
        return results


def test_retrieval():
    """Test conversation context retrieval"""
    retriever = ConversationContextRetriever()
    
    print("\n" + "="*60)
    print("CONVERSATION CONTEXT RETRIEVAL TEST")
    print("="*60)
    
    # Test 1: Today's conversations
    print("\n📅 Today's Conversations:")
    today = retriever.get_today_conversations()
    print(f"   Found {len(today)} interactions")
    
    # Test 2: Recent context (7 days)
    print("\n📊 Recent Context (7 days):")
    recent = retriever.get_recent_context(days=7)
    print(f"   Found {len(recent)} interactions")
    
    # Test 3: Cross-workspace summary
    print("\n🌐 Cross-Workspace Summary:")
    summary = retriever.get_cross_workspace_summary()
    for workspace, count in summary.items():
        print(f"   {workspace}: {count} interactions")
    
    # Test 4: Formatted context for prompt
    print("\n📝 Formatted Context for LLM:")
    formatted = retriever.format_context_for_prompt(limit=3)
    print(formatted[:500] + "...")
    
    print("\n" + "="*60 + "\n")


if __name__ == "__main__":
    test_retrieval()
