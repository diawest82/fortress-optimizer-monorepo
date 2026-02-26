"""
Fortress Token Optimizer - Provider Intelligence System

© 2026 Fortress Optimizer LLC. All Rights Reserved.

PATENT NOTICE:
This implementation incorporates technology protected by:
- US Patent Application (pending): Adaptive provider intelligence system

Unauthorized reproduction or reverse engineering is prohibited.

This module provides adaptive intelligence for LLM provider selection and
cost optimization recommendations based on historical usage patterns.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import json
import hashlib


@dataclass
class ProviderEstimate:
    """Provider cost and token estimate"""
    provider: str
    model: str
    estimated_tokens: int
    cost_usd: float
    tokens_per_dollar: float
    speed_rank: int  # 1 = fastest, higher = slower
    quality_rank: int  # 1 = best quality, higher = lower


@dataclass
class OptimizationPotential:
    """Potential savings for each optimization level"""
    level: str
    tokens_saved: int
    tokens_saved_pct: float
    cost_saved: float
    cost_saved_pct: float


class ProviderIntelligence:
    """
    Adaptive provider recommendation engine.
    
    Patent: Adaptive LLM provider optimization using real-time feedback
    
    Learns from:
    - Provider token counting accuracy
    - Cost per token (actual vs estimated)
    - Response quality
    - User preferences
    
    Recommends:
    - Best provider for task
    - Optimal optimization level
    - Expected cost and savings
    """
    
    # Provider configurations (can be updated from API response data)
    PROVIDERS = {
        'openai': {
            'models': {
                'gpt-4-turbo': {'input_tokens': 4096, 'output_tokens': 8192},
                'gpt-4': {'input_tokens': 8192, 'output_tokens': 32768},
                'gpt-3.5-turbo': {'input_tokens': 4096, 'output_tokens': 4096},
            },
            'cost_per_1k_input': 0.03,
            'cost_per_1k_output': 0.06,
            'speed': 1,
            'quality': 1,
        },
        'anthropic': {
            'models': {
                'claude-3-opus': {'input_tokens': 200000, 'output_tokens': 4096},
                'claude-3-sonnet': {'input_tokens': 200000, 'output_tokens': 4096},
                'claude-3-haiku': {'input_tokens': 200000, 'output_tokens': 4096},
            },
            'cost_per_1k_input': 0.015,
            'cost_per_1k_output': 0.075,
            'speed': 2,
            'quality': 2,
        },
        'google': {
            'models': {
                'gemini-pro': {'input_tokens': 32768, 'output_tokens': 8192},
                'gemini-1.5-pro': {'input_tokens': 1000000, 'output_tokens': 4096},
            },
            'cost_per_1k_input': 0.000125,
            'cost_per_1k_output': 0.000375,
            'speed': 2,
            'quality': 2,
        },
        'azure': {
            'models': {
                'gpt-4-deployment': {'input_tokens': 8192, 'output_tokens': 32768},
                'gpt-35-turbo': {'input_tokens': 4096, 'output_tokens': 4096},
            },
            'cost_per_1k_input': 0.03,
            'cost_per_1k_output': 0.06,
            'speed': 1,
            'quality': 1,
        },
        'groq': {
            'models': {
                'mixtral-8x7b': {'input_tokens': 32768, 'output_tokens': 8192},
                'llama2-70b': {'input_tokens': 4096, 'output_tokens': 1024},
            },
            'cost_per_1k_input': 0.0005,
            'cost_per_1k_output': 0.0015,
            'speed': 3,
            'quality': 3,
        },
    }
    
    # Optimization level effectiveness (estimated tokens saved)
    OPTIMIZATION_LEVELS = {
        'conservative': {
            'tokens_saved_pct': 0.15,
            'description': 'Minimal risk, 15% savings',
            'use_case': 'Critical tasks'
        },
        'balanced': {
            'tokens_saved_pct': 0.28,
            'description': 'Recommended, 28% savings',
            'use_case': 'General use'
        },
        'aggressive': {
            'tokens_saved_pct': 0.42,
            'description': 'Fast results, 42% savings',
            'use_case': 'Performance critical'
        }
    }
    
    def __init__(self):
        """Initialize provider intelligence engine"""
        self.user_history = {}  # {user_id: [optimization records]}
        self.provider_calibration = {}  # {provider: calibration_data}
        self.learning_enabled = True
    
    def estimate_provider_tokens(
        self,
        text: str,
        provider: str,
        model: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Estimate tokens and cost for text on given provider.
        
        Args:
            text: Input text to optimize
            provider: Provider name (openai, anthropic, etc)
            model: Specific model (if None, uses default)
        
        Returns:
            Dict with token estimate and cost
        """
        if provider not in self.PROVIDERS:
            raise ValueError(f"Unknown provider: {provider}")
        
        provider_config = self.PROVIDERS[provider]
        
        # Get model or use first available
        if model is None:
            model = list(provider_config['models'].keys())[0]
        
        if model not in provider_config['models']:
            raise ValueError(f"Unknown model: {model}")
        
        # Simple token estimation: ~4 chars = 1 token
        estimated_input_tokens = len(text) // 4
        
        # Apply calibration if available
        if provider in self.provider_calibration:
            calib = self.provider_calibration[provider]
            estimated_input_tokens = int(
                estimated_input_tokens * calib.get('token_ratio', 1.0)
            )
        
        # Estimate output tokens (assume 20% of input)
        estimated_output_tokens = int(estimated_input_tokens * 0.2)
        
        # Calculate cost
        cost_per_1k_input = provider_config['cost_per_1k_input']
        cost_per_1k_output = provider_config['cost_per_1k_output']
        
        input_cost = (estimated_input_tokens / 1000) * cost_per_1k_input
        output_cost = (estimated_output_tokens / 1000) * cost_per_1k_output
        total_cost = input_cost + output_cost
        
        return {
            'provider': provider,
            'model': model,
            'estimated_input_tokens': estimated_input_tokens,
            'estimated_output_tokens': estimated_output_tokens,
            'total_tokens': estimated_input_tokens + estimated_output_tokens,
            'cost_usd': round(total_cost, 4),
            'cost_per_1k_tokens': round((total_cost * 1000) / (estimated_input_tokens + estimated_output_tokens), 4),
            'tokens_per_dollar': round((estimated_input_tokens + estimated_output_tokens) / total_cost if total_cost > 0 else 0, 2)
        }
    
    def get_provider_recommendations(
        self,
        text: str,
        user_preferences: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Get provider recommendations for text.
        
        Args:
            text: Input text
            user_preferences: Dict with 'priority' (cost/speed/quality) and 'budget_limit'
        
        Returns:
            List of recommendations sorted by preference
        """
        if user_preferences is None:
            user_preferences = {'priority': 'cost', 'budget_limit': 1.00}
        
        recommendations = []
        
        # Get estimates for all providers
        for provider in self.PROVIDERS.keys():
            estimate = self.estimate_provider_tokens(text, provider)
            
            # Determine recommendation badge
            badge = self._get_recommendation_badge(estimate, user_preferences)
            
            # Calculate optimization potential
            optimization_potential = self._calculate_optimization_potential(estimate)
            
            recommendations.append({
                'provider': estimate['provider'],
                'model': estimate['model'],
                'estimated_tokens': estimate['total_tokens'],
                'cost_usd': estimate['cost_usd'],
                'tokens_per_dollar': estimate['tokens_per_dollar'],
                'cost_per_1k_tokens': estimate['cost_per_1k_tokens'],
                'optimization_potential': optimization_potential,
                'recommendation': badge,
                'rank': self._calculate_rank(estimate, user_preferences)
            })
        
        # Sort by preference
        priority = user_preferences.get('priority', 'cost')
        
        if priority == 'cost':
            recommendations.sort(key=lambda x: x['cost_usd'])
        elif priority == 'speed':
            recommendations.sort(key=lambda x: self.PROVIDERS[x['provider']]['speed'])
        elif priority == 'quality':
            recommendations.sort(key=lambda x: self.PROVIDERS[x['provider']]['quality'])
        else:
            # Default: tokens per dollar (best value)
            recommendations.sort(key=lambda x: x['tokens_per_dollar'], reverse=True)
        
        return recommendations[:3]  # Return top 3
    
    def _get_recommendation_badge(self, estimate: Dict, preferences: Dict) -> str:
        """Determine recommendation badge"""
        priority = preferences.get('priority', 'cost')
        
        if priority == 'cost' and estimate['cost_usd'] < 0.01:
            return 'LOWEST_COST'
        elif priority == 'speed':
            if self.PROVIDERS[estimate['provider']]['speed'] == 1:
                return 'FASTEST'
        elif priority == 'quality':
            if self.PROVIDERS[estimate['provider']]['quality'] == 1:
                return 'BEST_QUALITY'
        
        # Default: best value (tokens per dollar)
        if estimate['tokens_per_dollar'] > 50000:
            return 'BEST_VALUE'
        
        return 'GOOD_CHOICE'
    
    def _calculate_optimization_potential(self, estimate: Dict) -> Dict[str, Dict]:
        """Calculate savings for each optimization level"""
        potential = {}
        
        for level, config in self.OPTIMIZATION_LEVELS.items():
            tokens_saved = int(estimate['total_tokens'] * config['tokens_saved_pct'])
            cost_saved = (tokens_saved / 1000) * estimate['cost_per_1k_tokens']
            
            potential[level] = {
                'tokens_saved': tokens_saved,
                'tokens_saved_pct': int(config['tokens_saved_pct'] * 100),
                'cost_saved': round(cost_saved, 4),
                'cost_saved_pct': int(config['tokens_saved_pct'] * 100),
                'description': config['description']
            }
        
        return potential
    
    def _calculate_rank(self, estimate: Dict, preferences: Dict) -> float:
        """Calculate overall recommendation rank"""
        priority = preferences.get('priority', 'cost')
        budget_limit = preferences.get('budget_limit', 1.00)
        
        # Filter by budget
        if estimate['cost_usd'] > budget_limit:
            return 0  # Not affordable
        
        # Score based on priority
        if priority == 'cost':
            # Lower cost = higher score
            return 1.0 - (estimate['cost_usd'] / budget_limit)
        elif priority == 'speed':
            # Faster = higher score
            speed = self.PROVIDERS[estimate['provider']]['speed']
            return 1.0 / speed
        elif priority == 'quality':
            # Better quality = higher score
            quality = self.PROVIDERS[estimate['provider']]['quality']
            return 1.0 / quality
        else:
            # Best value (tokens per dollar)
            return estimate['tokens_per_dollar'] / 100000
    
    def learn_from_optimization(
        self,
        user_id: str,
        provider: str,
        text: str,
        tokens_estimated: int,
        tokens_actual: int,
        cost: float,
        optimization_level: str
    ):
        """
        Learn from actual optimization to calibrate future estimates.
        
        Args:
            user_id: User ID
            provider: Provider used
            text: Input text
            tokens_estimated: Tokens we estimated
            tokens_actual: Actual tokens from API
            cost: Actual cost
            optimization_level: Level used
        """
        if not self.learning_enabled:
            return
        
        # Initialize user history if needed
        if user_id not in self.user_history:
            self.user_history[user_id] = []
        
        # Record the optimization
        record = {
            'timestamp': datetime.now().isoformat(),
            'provider': provider,
            'tokens_estimated': tokens_estimated,
            'tokens_actual': tokens_actual,
            'cost': cost,
            'optimization_level': optimization_level,
            'text_length': len(text)
        }
        
        self.user_history[user_id].append(record)
        
        # Update calibration
        if provider not in self.provider_calibration:
            self.provider_calibration[provider] = {
                'token_ratio': 1.0,
                'sample_count': 0,
                'cost_per_token': 0
            }
        
        calib = self.provider_calibration[provider]
        
        # Calculate new token ratio
        if tokens_estimated > 0:
            new_ratio = tokens_actual / tokens_estimated
            old_ratio = calib['token_ratio']
            
            # Exponential moving average (give more weight to recent data)
            alpha = 0.3
            calib['token_ratio'] = (alpha * new_ratio) + ((1 - alpha) * old_ratio)
        
        calib['sample_count'] += 1
        
        # Calculate cost per token
        cost_per_token = cost / tokens_actual if tokens_actual > 0 else 0
        calib['cost_per_token'] = cost_per_token


# Singleton instance
_provider_intelligence = None


def get_provider_intelligence() -> ProviderIntelligence:
    """Get or create provider intelligence instance"""
    global _provider_intelligence
    if _provider_intelligence is None:
        _provider_intelligence = ProviderIntelligence()
    return _provider_intelligence
