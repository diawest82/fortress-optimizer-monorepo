import sublime
import sublime_plugin
import json
import subprocess
import os
from urllib.request import Request, urlopen
from urllib.error import URLError


class FortressOptimizeCommand(sublime_plugin.TextCommand):
    """Optimize selected text"""
    
    def run(self, edit):
        settings = sublime.load_settings("Fortress.sublime-settings")
        api_key = settings.get("api_key")
        level = settings.get("optimization_level", "balanced")
        
        # Get selected text
        selection = self.view.sel()[0]
        if selection.empty():
            sublime.message_dialog("No text selected")
            return
        
        text = self.view.substr(selection)
        self.optimize_text(text, api_key, level)
    
    def optimize_text(self, text, api_key, level):
        """Call Fortress API"""
        url = "https://api.fortress-optimizer.com/api/optimize"
        
        payload = json.dumps({
            "prompt": text,
            "level": level,
            "provider": "general"
        }).encode('utf-8')
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        
        try:
            req = Request(url, data=payload, headers=headers)
            with urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode())
                
                if data.get("status") == "success":
                    self.show_result(data)
                else:
                    sublime.error_message(f"Error: {data.get('error', 'Unknown')}")
        except URLError as e:
            sublime.error_message(f"Network error: {e}")
    
    def show_result(self, data):
        """Display optimization result"""
        opt = data["optimization"]
        tokens = data["tokens"]
        
        message = f"""
Fortress Token Optimizer Result
================================

Optimized Text:
{opt['optimized_prompt']}

Statistics:
Original: {tokens['original']} tokens
Optimized: {tokens['optimized']} tokens
Saved: {tokens['savings']} tokens ({tokens['savings_percentage']:.1f}%)
Technique: {opt['technique']}
"""
        sublime.message_dialog(message)


class FortressOptimizeLineCommand(sublime_plugin.TextCommand):
    """Optimize current line"""
    
    def run(self, edit):
        settings = sublime.load_settings("Fortress.sublime-settings")
        api_key = settings.get("api_key")
        level = settings.get("optimization_level", "balanced")
        
        # Get current line
        line = self.view.line(self.view.sel()[0])
        text = self.view.substr(line)
        
        cmd = FortressOptimizeCommand(self.view)
        cmd.optimize_text(text, api_key, level)


class FortressUsageCommand(sublime_plugin.TextCommand):
    """Show token usage"""
    
    def run(self, edit):
        settings = sublime.load_settings("Fortress.sublime-settings")
        api_key = settings.get("api_key")
        
        url = "https://api.fortress-optimizer.com/api/usage"
        headers = {"Authorization": f"Bearer {api_key}"}
        
        try:
            req = Request(url, headers=headers)
            with urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode())
                
                message = f"""
Token Usage
===========

Used: {data['tokens_used_this_month']:,} / {data['tokens_limit']:,} tokens
Remaining: {data['tokens_remaining']:,} tokens
Progress: {data['percentage_used']:.1f}%
Reset: {data['reset_date']}
"""
                sublime.message_dialog(message)
        except URLError as e:
            sublime.error_message(f"Network error: {e}")


class FortressStatusBar(sublime_plugin.EventListener):
    """Show Fortress status in status bar"""
    
    def on_modified(self, view):
        settings = sublime.load_settings("Fortress.sublime-settings")
        level = settings.get("optimization_level", "balanced")
        view.set_status("fortress", f"Fortress: {level}")
