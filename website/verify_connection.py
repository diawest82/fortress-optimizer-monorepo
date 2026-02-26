#!/usr/bin/env python3
"""
Hub Connection Verification Utility

Checks the health and status of hub connectivity for the current workspace.

Usage:
    python verify_connection.py              # Check current workspace
    python verify_connection.py --workspace <path>  # Check specific workspace
"""

import json
import sys
import argparse
from pathlib import Path
import urllib.request
import urllib.error

class HubVerifier:
    def __init__(self, workspace_path=None):
        """Initialize verifier."""
        self.workspace_path = Path(workspace_path or ".").resolve()
        self.state_file = self.workspace_path / ".workspace_hub_sync.json"
        self.config_file = self.workspace_path / ".hub_config.json"
    
    def load_state(self):
        """Load workspace sync state."""
        if not self.state_file.exists():
            return None
        
        try:
            with open(self.state_file) as f:
                return json.load(f)
        except:
            return None
    
    def load_config(self):
        """Load hub configuration."""
        if not self.config_file.exists():
            return None
        
        try:
            with open(self.config_file) as f:
                return json.load(f)
        except:
            return None
    
    def check_hub_health(self, hub_endpoint):
        """Check if hub is responding."""
        try:
            url = f"{hub_endpoint}/health"
            with urllib.request.urlopen(url, timeout=5) as response:
                return response.status == 200
        except:
            return False
    
    def verify(self):
        """Run verification checks."""
        print("╔════════════════════════════════════════════════════════════╗")
        print("║          Hub Connection Verification")
        print("╚════════════════════════════════════════════════════════════╝")
        print()
        
        # Check 1: State file
        print("[1/3] Checking state file...")
        state = self.load_state()
        if state:
            print(f"  ✓ State file found: {self.state_file}")
            print(f"    Workspace: {state.get('workspace_id')}")
            print(f"    Status: {state.get('status')}")
            print(f"    Hub: {state.get('hub_endpoint')}")
        else:
            print(f"  ✗ State file not found: {self.state_file}")
            print("    Run: python sync_to_hub.py")
        print()
        
        # Check 2: Configuration
        print("[2/3] Checking configuration...")
        config = self.load_config()
        if config:
            print(f"  ✓ Config file found: {self.config_file}")
            print(f"    Hub endpoint: {config.get('hub_endpoint')}")
        else:
            print(f"  ⚠ Config file not found: {self.config_file}")
            print("    Using defaults")
        print()
        
        # Check 3: Hub health
        print("[3/3] Checking hub health...")
        hub_endpoint = state.get('hub_endpoint') if state else (
            config.get('hub_endpoint') if config else "http://127.0.0.1:3333"
        )
        
        if self.check_hub_health(hub_endpoint):
            print(f"  ✓ Hub is responding: {hub_endpoint}")
        else:
            print(f"  ✗ Hub is not responding: {hub_endpoint}")
            print(f"    Is the hub running? Check: lsof -i :3333")
        print()
        
        # Summary
        print("╔════════════════════════════════════════════════════════════╗")
        if state and state.get('status') == 'connected':
            print("║  ✓ CONNECTED - Workspace is registered with hub")
        else:
            print("║  ⚠ NOT CONNECTED - Run: python sync_to_hub.py")
        print("╚════════════════════════════════════════════════════════════╝")
        print()
        
        # Detailed state
        if state:
            print("Detailed State:")
            print(json.dumps(state, indent=2))


def main():
    parser = argparse.ArgumentParser(description="Verify hub connectivity")
    parser.add_argument("--workspace", help="Workspace path")
    args = parser.parse_args()
    
    verifier = HubVerifier(workspace_path=args.workspace)
    verifier.verify()


if __name__ == "__main__":
    main()
