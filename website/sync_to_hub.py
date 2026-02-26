#!/usr/bin/env python3
"""
Unified Hub Connector - Workspace Registration Script

This script registers any workspace with the Fortress Grade v5 Hub.
It is workspace-agnostic and can be run from any directory.

Usage:
    python sync_to_hub.py                    # Use defaults from .hub_config.json
    python sync_to_hub.py --hub-url <url>    # Override hub URL
    python sync_to_hub.py --workspace <path> # Specify workspace path
"""

import json
import os
import sys
import hashlib
import argparse
from pathlib import Path
from datetime import datetime
import urllib.request
import urllib.error
import time

class HubConnector:
    def __init__(self, workspace_path=None, hub_url=None):
        """Initialize connector with workspace and hub endpoint."""
        self.workspace_path = Path(workspace_path or os.getcwd()).resolve()
        self.workspace_name = self.workspace_path.name
        
        # Load config
        self.config = self._load_config(hub_url)
        self.hub_endpoint = self.config.get("hub_endpoint", "http://127.0.0.1:3333")
        self.timeout = self.config.get("timeout", 10)
        self.retry_attempts = self.config.get("retry_attempts", 3)
        self.retry_delay = self.config.get("retry_delay", 2)
        
        # State file
        self.state_file = self.workspace_path / ".workspace_hub_sync.json"
    
    def _load_config(self, hub_url_override):
        """Load configuration from .hub_config.json or use defaults."""
        config_file = self.workspace_path / ".hub_config.json"
        
        if config_file.exists():
            try:
                with open(config_file) as f:
                    config = json.load(f)
                    if hub_url_override:
                        config["hub_endpoint"] = hub_url_override
                    return config
            except Exception as e:
                print(f"Warning: Could not load config: {e}")
        
        # Default config
        return {
            "hub_endpoint": hub_url_override or "http://127.0.0.1:3333",
            "timeout": 10,
            "retry_attempts": 3,
            "retry_delay": 2,
            "enable_local_fallback": True
        }
    
    def compute_workspace_fingerprint(self):
        """Compute SHA256 fingerprint of workspace."""
        hasher = hashlib.sha256()
        
        # Include workspace metadata
        hasher.update(self.workspace_name.encode())
        hasher.update(str(self.workspace_path).encode())
        
        # Include Python version
        hasher.update(f"{sys.version_info.major}.{sys.version_info.minor}".encode())
        
        # Include common file signatures (if they exist)
        for pattern in ["*.py", "*.json", "*.md"]:
            for file_path in self.workspace_path.glob(pattern):
                if file_path.is_file() and not file_path.name.startswith("."):
                    try:
                        with open(file_path, "rb") as f:
                            hasher.update(file_path.name.encode())
                            hasher.update(f.read(1024))  # First 1KB
                    except:
                        pass
        
        return hasher.hexdigest()[:16]
    
    def register_with_hub(self):
        """Register workspace with hub."""
        fingerprint = self.compute_workspace_fingerprint()
        
        payload = {
            "workspace_id": self.workspace_name,
            "workspace_path": str(self.workspace_path),
            "fingerprint": fingerprint,
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}",
            "environment": os.environ.get("CONDA_DEFAULT_ENV", "base"),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        # Attempt to register with retries
        for attempt in range(self.retry_attempts):
            try:
                url = f"{self.hub_endpoint}/register"
                data = json.dumps(payload).encode()
                
                req = urllib.request.Request(
                    url,
                    data=data,
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                
                with urllib.request.urlopen(req, timeout=self.timeout) as response:
                    result = json.loads(response.read())
                    self._save_state("connected", result)
                    return True, "Successfully registered with hub"
            
            except urllib.error.URLError as e:
                if attempt < self.retry_attempts - 1:
                    print(f"Attempt {attempt + 1} failed, retrying in {self.retry_delay}s...")
                    time.sleep(self.retry_delay)
                else:
                    # Fallback: save local state
                    if self.config.get("enable_local_fallback"):
                        self._save_state("connected", {
                            "mode": "local_fallback",
                            "message": "Hub unreachable, saved locally",
                            "payload": payload
                        })
                        return True, "Saved locally (hub unreachable)"
                    return False, f"Hub connection failed: {e}"
            
            except Exception as e:
                return False, f"Registration error: {e}"
        
        return False, "Registration failed after all retries"
    
    def _save_state(self, status, hub_response=None):
        """Save connection state to workspace."""
        state = {
            "workspace_id": self.workspace_name,
            "workspace_path": str(self.workspace_path),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}",
            "working_directory": os.getcwd(),
            "environment": os.environ.get("CONDA_DEFAULT_ENV", "base"),
            "hub_endpoint": self.hub_endpoint,
            "status": status
        }
        
        if hub_response:
            state["hub_response"] = hub_response
        
        with open(self.state_file, "w") as f:
            json.dump(state, f, indent=2)
    
    def run(self):
        """Execute registration process."""
        print(f"Registering workspace: {self.workspace_name}")
        print(f"Path: {self.workspace_path}")
        print(f"Hub: {self.hub_endpoint}")
        print()
        
        success, message = self.register_with_hub()
        
        if success:
            print(f"✓ {message}")
            print(f"State saved to: {self.state_file}")
            return 0
        else:
            print(f"✗ {message}")
            return 1


def main():
    parser = argparse.ArgumentParser(
        description="Connect workspace to Unified Hub",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python sync_to_hub.py                    # Auto-detect, use config
  python sync_to_hub.py --hub-url http://hub.example.com:3333
  python sync_to_hub.py --workspace /path/to/workspace
        """
    )
    
    parser.add_argument("--workspace", help="Workspace path (default: current directory)")
    parser.add_argument("--hub-url", help="Hub endpoint URL")
    
    args = parser.parse_args()
    
    connector = HubConnector(workspace_path=args.workspace, hub_url=args.hub_url)
    sys.exit(connector.run())


if __name__ == "__main__":
    main()
