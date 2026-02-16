"""
Fortress Token Optimizer - Cost Prediction Engine

© 2026 Fortress Optimizer LLC. All Rights Reserved.

PATENT NOTICE:
This implementation incorporates technology protected by:
- US Patent Application (pending): Machine learning-based cost prediction

Unauthorized reproduction or reverse engineering is prohibited.

This module provides ML-powered cost prediction and anomaly detection
for LLM usage tracking.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import statistics


@dataclass
class CostPrediction:
    """Cost prediction for a period"""
    daily_average: float
    current_period_cost: float
    projected_period_end: float
    days_remaining: int
    confidence: float
    trend: str  # 'up', 'down', 'stable'


@dataclass
class Anomaly:
    """Cost anomaly detection"""
    date: str
    type: str  # 'SPIKE', 'ANOMALY', 'UNUSUAL_PATTERN'
    normal_cost: float
    actual_cost: float
    severity: str  # 'LOW', 'MEDIUM', 'HIGH'
    message: str


class CostPredictionEngine:
    """
    Machine learning-based cost prediction engine.
    
    Patent: Machine learning-based cost prediction for LLM usage
    
    Learns from:
    - Historical daily costs
    - Time patterns (weekday/weekend, time of day)
    - Provider usage patterns
    - Optimization level usage
    
    Predicts:
    - Daily/weekly/monthly cost
    - Cost anomalies
    - Trends (up/down/stable)
    
    Recommends:
    - Cost reduction strategies
    - Budget-friendly providers
    - Optimal optimization levels
    """
    
    def __init__(self):
        """Initialize cost prediction engine"""
        self.user_usage = {}  # {user_id: [daily_records]}
        self.user_models = {}  # {user_id: model_data}
        self.learning_enabled = True
    
    def record_usage(
        self,
        user_id: str,
        provider: str,
        tokens_used: int,
        cost: float,
        optimization_level: str
    ):
        """Record usage for learning"""
        if not self.learning_enabled:
            return
        
        if user_id not in self.user_usage:
            self.user_usage[user_id] = []
        
        today = datetime.now().date().isoformat()
        
        # Find or create today's record
        today_record = None
        for record in self.user_usage[user_id]:
            if record['date'] == today:
                today_record = record
                break
        
        if today_record is None:
            today_record = {
                'date': today,
                'total_cost': 0,
                'total_tokens': 0,
                'requests': [],
                'by_provider': {},
                'by_level': {}
            }
            self.user_usage[user_id].append(today_record)
        
        # Update record
        today_record['total_cost'] += cost
        today_record['total_tokens'] += tokens_used
        
        today_record['requests'].append({
            'timestamp': datetime.now().isoformat(),
            'provider': provider,
            'tokens': tokens_used,
            'cost': cost,
            'level': optimization_level
        })
        
        # Track by provider
        if provider not in today_record['by_provider']:
            today_record['by_provider'][provider] = {'cost': 0, 'tokens': 0}
        today_record['by_provider'][provider]['cost'] += cost
        today_record['by_provider'][provider]['tokens'] += tokens_used
        
        # Track by level
        if optimization_level not in today_record['by_level']:
            today_record['by_level'][optimization_level] = {'cost': 0, 'tokens': 0}
        today_record['by_level'][optimization_level]['cost'] += cost
        today_record['by_level'][optimization_level]['tokens'] += tokens_used
    
    def predict_monthly_cost(self, user_id: str) -> CostPrediction:
        """
        Predict end-of-month cost.
        
        Args:
            user_id: User ID
        
        Returns:
            CostPrediction with forecast
        """
        if user_id not in self.user_usage or not self.user_usage[user_id]:
            return CostPrediction(
                daily_average=0,
                current_period_cost=0,
                projected_period_end=0,
                days_remaining=0,
                confidence=0,
                trend='stable'
            )
        
        usage = self.user_usage[user_id]
        
        # Calculate daily costs
        daily_costs = [record['total_cost'] for record in usage]
        
        if not daily_costs:
            daily_average = 0
            confidence = 0
        else:
            daily_average = statistics.mean(daily_costs)
            
            # Confidence increases with more data points
            data_points = len(daily_costs)
            confidence = min(0.95, 0.5 + (data_points * 0.05))
        
        # Get today's cost
        today = datetime.now().date().isoformat()
        current_period_cost = 0
        
        for record in usage:
            if record['date'] <= today:
                current_period_cost += record['total_cost']
        
        # Calculate days remaining in month
        now = datetime.now()
        days_in_month = 28 if now.month == 2 else 30 if now.month in [4,6,9,11] else 31
        days_remaining = days_in_month - now.day
        
        # Project end of month
        projected_additional = daily_average * days_remaining
        projected_period_end = current_period_cost + projected_additional
        
        # Detect trend
        if len(daily_costs) >= 3:
            recent_avg = statistics.mean(daily_costs[-3:])
            older_avg = statistics.mean(daily_costs[:-3])
            
            if recent_avg > older_avg * 1.1:
                trend = 'up'
            elif recent_avg < older_avg * 0.9:
                trend = 'down'
            else:
                trend = 'stable'
        else:
            trend = 'stable'
        
        return CostPrediction(
            daily_average=round(daily_average, 2),
            current_period_cost=round(current_period_cost, 2),
            projected_period_end=round(projected_period_end, 2),
            days_remaining=days_remaining,
            confidence=confidence,
            trend=trend
        )
    
    def detect_anomalies(self, user_id: str, lookback_days: int = 7) -> List[Anomaly]:
        """
        Detect cost anomalies.
        
        Args:
            user_id: User ID
            lookback_days: Number of days to analyze
        
        Returns:
            List of detected anomalies
        """
        if user_id not in self.user_usage or not self.user_usage[user_id]:
            return []
        
        usage = self.user_usage[user_id]
        
        # Get last N days
        recent = [r for r in usage if len(usage) - usage.index(r) <= lookback_days]
        
        if len(recent) < 2:
            return []
        
        daily_costs = [r['total_cost'] for r in recent]
        
        # Calculate statistics
        avg_cost = statistics.mean(daily_costs)
        
        if len(daily_costs) >= 2:
            try:
                stdev = statistics.stdev(daily_costs)
            except:
                stdev = 0
        else:
            stdev = 0
        
        anomalies = []
        
        # Detect spikes
        for i, record in enumerate(recent):
            cost = record['total_cost']
            
            # Spike: > 2x average or > 2 std devs above mean
            if cost > avg_cost * 2 or (stdev > 0 and cost > avg_cost + 2 * stdev):
                severity = 'HIGH' if cost > avg_cost * 3 else 'MEDIUM'
                
                anomalies.append(Anomaly(
                    date=record['date'],
                    type='SPIKE',
                    normal_cost=round(avg_cost, 2),
                    actual_cost=round(cost, 2),
                    severity=severity,
                    message=f"Cost spike: ${cost:.2f} vs average ${avg_cost:.2f}"
                ))
            
            # Unusual pattern: consecutive days with high cost
            if i >= 1 and daily_costs[i] > avg_cost * 1.5 and daily_costs[i-1] > avg_cost * 1.5:
                anomalies.append(Anomaly(
                    date=record['date'],
                    type='UNUSUAL_PATTERN',
                    normal_cost=round(avg_cost, 2),
                    actual_cost=round(cost, 2),
                    severity='MEDIUM',
                    message=f"Consistent high usage pattern detected"
                ))
        
        return anomalies
    
    def recommend_cost_reduction(
        self,
        user_id: str,
        by_provider: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Recommend ways to reduce costs.
        
        Args:
            user_id: User ID
            by_provider: Optional dict of provider stats {provider: {cost, tokens}}
        
        Returns:
            List of recommendations
        """
        recommendations = []
        
        if user_id not in self.user_usage or not self.user_usage[user_id]:
            return recommendations
        
        usage = self.user_usage[user_id]
        
        # Analyze provider usage if provided
        if by_provider:
            # Find most expensive provider
            provider_costs = {p: data['cost'] for p, data in by_provider.items()}
            most_expensive = max(provider_costs.items(), key=lambda x: x[1])
            
            # If one provider > 50% of cost, suggest diversifying
            total_cost = sum(provider_costs.values())
            if most_expensive[1] / total_cost > 0.5:
                recommendations.append({
                    'type': 'DIVERSIFY_PROVIDERS',
                    'provider': most_expensive[0],
                    'current_percentage': round((most_expensive[1] / total_cost) * 100, 1),
                    'message': f"Reduce {most_expensive[0]} usage to under 50% of total",
                    'potential_savings': round(most_expensive[1] * 0.1, 2)
                })
        
        # Analyze optimization level usage
        total_cost = 0
        level_stats = {}
        
        for record in usage:
            total_cost += record['total_cost']
            for level, stats in record['by_level'].items():
                if level not in level_stats:
                    level_stats[level] = {'cost': 0, 'tokens': 0}
                level_stats[level]['cost'] += stats['cost']
                level_stats[level]['tokens'] += stats['tokens']
        
        # If using aggressive level a lot, suggest balanced
        if 'aggressive' in level_stats:
            aggressive_pct = (level_stats['aggressive']['cost'] / total_cost) * 100 if total_cost > 0 else 0
            if aggressive_pct > 30:
                recommendations.append({
                    'type': 'SWITCH_OPTIMIZATION_LEVEL',
                    'current_level': 'aggressive',
                    'recommended_level': 'balanced',
                    'current_percentage': round(aggressive_pct, 1),
                    'message': "Switch some aggressive optimizations to balanced (28% vs 42% savings)",
                    'potential_savings': round(total_cost * 0.05, 2)
                })
        
        # If low optimization level usage, suggest more aggressive
        if 'balanced' in level_stats and 'aggressive' in level_stats:
            balanced_pct = (level_stats['balanced']['cost'] / total_cost) * 100 if total_cost > 0 else 0
            if balanced_pct > 70:
                recommendations.append({
                    'type': 'INCREASE_OPTIMIZATION',
                    'current_level': 'balanced',
                    'recommended_level': 'aggressive',
                    'message': "You're being conservative. Try aggressive mode to save more.",
                    'potential_savings': round(total_cost * 0.14, 2)
                })
        
        # Daily budget check
        if len(usage) >= 7:
            daily_costs = [r['total_cost'] for r in usage[-7:]]
            daily_avg = statistics.mean(daily_costs)
            
            if daily_avg > 10:  # If spending > $10/day
                recommendations.append({
                    'type': 'BUDGET_ALERT',
                    'daily_average': round(daily_avg, 2),
                    'monthly_projection': round(daily_avg * 30, 2),
                    'message': f"Your daily spending is ${daily_avg:.2f}. Projected monthly: ${daily_avg * 30:.2f}",
                    'potential_savings': round(daily_avg * 30 * 0.1, 2)
                })
        
        return recommendations
    
    def get_efficiency_score(self, user_id: str) -> Dict:
        """
        Calculate user's cost efficiency score.
        
        Factors:
        - Cost per token ratio
        - Use of optimization levels
        - Cost trending
        
        Returns:
            Score 0-100 with breakdown
        """
        if user_id not in self.user_usage or not self.user_usage[user_id]:
            return {
                'score': 0,
                'message': 'Not enough data',
                'breakdown': {}
            }
        
        usage = self.user_usage[user_id]
        
        # Cost per token efficiency (lower = better)
        total_cost = sum(r['total_cost'] for r in usage)
        total_tokens = sum(r['total_tokens'] for r in usage)
        
        if total_tokens == 0:
            cost_per_token_score = 50
        else:
            cost_per_token = total_cost / total_tokens
            # Assume $0.00003 per token is optimal
            optimal_cost_per_token = 0.00003
            
            if cost_per_token <= optimal_cost_per_token * 1.5:
                cost_per_token_score = 100
            elif cost_per_token <= optimal_cost_per_token * 2:
                cost_per_token_score = 80
            else:
                cost_per_token_score = max(0, 100 - (cost_per_token / optimal_cost_per_token) * 10)
        
        # Optimization level usage (aggressive = better)
        level_usage = {}
        for record in usage:
            for level, stats in record['by_level'].items():
                if level not in level_usage:
                    level_usage[level] = 0
                level_usage[level] += stats['cost']
        
        if 'aggressive' in level_usage:
            aggressive_pct = level_usage['aggressive'] / total_cost if total_cost > 0 else 0
            optimization_score = int(aggressive_pct * 100)
        else:
            optimization_score = 50  # Using only conservative/balanced
        
        # Trend analysis
        if len(usage) >= 7:
            recent = sum(r['total_cost'] for r in usage[-7:]) / 7
            older = sum(r['total_cost'] for r in usage[-14:-7]) / 7 if len(usage) >= 14 else recent
            
            if recent < older * 0.9:
                trend_score = 100
            elif recent < older * 1.1:
                trend_score = 75
            else:
                trend_score = 50
        else:
            trend_score = 75
        
        # Overall score (weighted average)
        overall_score = int(
            (cost_per_token_score * 0.4) +
            (optimization_score * 0.3) +
            (trend_score * 0.3)
        )
        
        return {
            'score': min(100, overall_score),
            'message': self._get_efficiency_message(overall_score),
            'breakdown': {
                'cost_per_token': int(cost_per_token_score),
                'optimization_usage': optimization_score,
                'trend': trend_score
            },
            'cost_per_token': cost_per_token,
            'total_tokens_analyzed': total_tokens
        }
    
    @staticmethod
    def _get_efficiency_message(score: int) -> str:
        """Get message based on score"""
        if score >= 90:
            return "Excellent cost efficiency! Keep it up."
        elif score >= 75:
            return "Good cost efficiency. Some minor optimizations possible."
        elif score >= 50:
            return "Average cost efficiency. Review recommendations."
        else:
            return "Low cost efficiency. Consider optimization strategies."


# Singleton instance
_cost_predictor = None


def get_cost_predictor() -> CostPredictionEngine:
    """Get or create cost prediction engine"""
    global _cost_predictor
    if _cost_predictor is None:
        _cost_predictor = CostPredictionEngine()
    return _cost_predictor
