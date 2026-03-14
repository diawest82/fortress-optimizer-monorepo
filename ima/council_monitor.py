"""
Fortress Operations Council — CloudWatch Monitor

Bridges the IMA Operations Council to live AWS infrastructure by polling
CloudWatch alarms and dispatching actionable recommendations via SNS.

Tracks alarm state transitions to avoid duplicate notifications.

Usage:
    python council_monitor.py                  # long-running daemon
    from council_monitor import check_alarms   # one-shot import
"""

import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional

import boto3
from botocore.exceptions import ClientError

# ─── Configuration ────────────────────────────────────────────────────────────

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
SNS_TOPIC_ARN = os.getenv(
    "FORTRESS_SNS_TOPIC",
    "arn:aws:sns:us-east-1:673895432464:fortress-alerts",
)
ECS_CLUSTER = os.getenv("FORTRESS_ECS_CLUSTER", "fortress-optimizer-cluster")
ECS_SERVICE = os.getenv("FORTRESS_ECS_SERVICE", "fortress-backend-service")
POLL_INTERVAL = int(os.getenv("FORTRESS_POLL_INTERVAL", "60"))

MONITORED_ALARMS = [
    "fortress-alb-5xx",
    "fortress-response-time",
    "fortress-ecs-tasks",
    "fortress-rds-cpu",
]

SEVERITY_MAP = {
    "fortress-alb-5xx": "critical",
    "fortress-response-time": "warning",
    "fortress-ecs-tasks": "critical",
    "fortress-rds-cpu": "warning",
}

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("fortress.council_monitor")

# ─── AWS Clients (lazy-initialized) ──────────────────────────────────────────

_cw_client = None
_sns_client = None
_ecs_client = None


def _cloudwatch():
    global _cw_client
    if _cw_client is None:
        _cw_client = boto3.client("cloudwatch", region_name=AWS_REGION)
    return _cw_client


def _sns():
    global _sns_client
    if _sns_client is None:
        _sns_client = boto3.client("sns", region_name=AWS_REGION)
    return _sns_client


def _ecs():
    global _ecs_client
    if _ecs_client is None:
        _ecs_client = boto3.client("ecs", region_name=AWS_REGION)
    return _ecs_client


# ─── State Tracker ────────────────────────────────────────────────────────────

_alarm_states: dict[str, str] = {}
"""Previous alarm state per alarm name. Used to detect transitions."""


def _state_changed(alarm_name: str, new_state: str) -> bool:
    """Return True if the alarm transitioned to a new state."""
    old = _alarm_states.get(alarm_name)
    _alarm_states[alarm_name] = new_state
    return old != new_state


# ─── Recommendation Engine ───────────────────────────────────────────────────

def _recommend(alarm_name: str) -> dict:
    """
    Return an actionable recommendation based on alarm type.
    Maps directly to IMA council agent specializations.
    """
    if alarm_name == "fortress-alb-5xx":
        return {
            "agent": "InfrastructureGuard",
            "action": "check_ecs_task_health",
            "detail": (
                "High 5xx rate detected on ALB. "
                "Check ECS task health and recent deployments. "
                "If a deploy happened in the last 30 minutes, recommend rollback."
            ),
            "auto_remediation": "inspect_ecs_tasks",
        }

    if alarm_name == "fortress-response-time":
        return {
            "agent": "InfrastructureGuard",
            "action": "check_rds_cpu",
            "detail": (
                "Response time exceeds threshold. "
                "Check RDS CPU utilization — if above 80%, recommend scaling up "
                "the DB instance class or adding a read replica."
            ),
            "auto_remediation": None,
        }

    if alarm_name == "fortress-ecs-tasks":
        return {
            "agent": "DeploymentAgent",
            "action": "force_new_deployment",
            "detail": (
                "Desired ECS task count not met. "
                "Force a new deployment to restart failed tasks."
            ),
            "auto_remediation": "force_ecs_deploy",
        }

    if alarm_name == "fortress-rds-cpu":
        return {
            "agent": "InfrastructureGuard",
            "action": "alert_human",
            "detail": (
                "RDS CPU is critically high. "
                "Recommend adding a read replica or upgrading instance class. "
                "This requires human approval due to cost implications."
            ),
            "auto_remediation": None,
        }

    return {
        "agent": "InfrastructureGuard",
        "action": "investigate",
        "detail": f"Unknown alarm {alarm_name} fired. Manual investigation needed.",
        "auto_remediation": None,
    }


# ─── Auto-Remediation ────────────────────────────────────────────────────────

def _inspect_ecs_tasks() -> Optional[str]:
    """Check ECS task health, return a status summary."""
    try:
        resp = _ecs().describe_services(
            cluster=ECS_CLUSTER, services=[ECS_SERVICE]
        )
        if not resp["services"]:
            return "ECS service not found"
        svc = resp["services"][0]
        running = svc.get("runningCount", 0)
        desired = svc.get("desiredCount", 0)
        deployments = svc.get("deployments", [])
        recent = [
            d for d in deployments
            if d.get("status") == "PRIMARY"
        ]
        deploy_age_min = None
        if recent:
            created = recent[0].get("createdAt")
            if created:
                delta = datetime.now(timezone.utc) - created
                deploy_age_min = int(delta.total_seconds() / 60)

        summary = (
            f"Running: {running}/{desired} tasks. "
            f"Deployments: {len(deployments)}."
        )
        if deploy_age_min is not None and deploy_age_min < 30:
            summary += f" Latest deploy was {deploy_age_min}m ago — ROLLBACK candidate."
        return summary
    except ClientError as e:
        logger.error("Failed to inspect ECS tasks: %s", e)
        return f"ECS inspect failed: {e}"


def _force_ecs_deploy() -> Optional[str]:
    """Force a new ECS deployment to cycle unhealthy tasks."""
    try:
        resp = _ecs().update_service(
            cluster=ECS_CLUSTER,
            service=ECS_SERVICE,
            forceNewDeployment=True,
        )
        status = resp["service"]["status"]
        return f"Forced new deployment. Service status: {status}"
    except ClientError as e:
        logger.error("Failed to force ECS deploy: %s", e)
        return f"Force deploy failed: {e}"


_REMEDIATION_FNS = {
    "inspect_ecs_tasks": _inspect_ecs_tasks,
    "force_ecs_deploy": _force_ecs_deploy,
}


# ─── SNS Notification ────────────────────────────────────────────────────────

def _notify(alarm_name: str, state: str, recommendation: dict,
            remediation_result: Optional[str] = None) -> None:
    """Publish an actionable alert to the SNS topic."""
    severity = SEVERITY_MAP.get(alarm_name, "info")
    subject = f"[{severity.upper()}] {alarm_name} → {state}"

    body = {
        "alarm": alarm_name,
        "state": state,
        "severity": severity,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "council_agent": recommendation["agent"],
        "recommended_action": recommendation["action"],
        "detail": recommendation["detail"],
    }
    if remediation_result:
        body["auto_remediation_result"] = remediation_result

    try:
        _sns().publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=subject[:100],  # SNS subject max 100 chars
            Message=json.dumps(body, indent=2),
        )
        logger.info("SNS notification sent for %s", alarm_name)
    except ClientError as e:
        logger.error("Failed to send SNS notification: %s", e)


# ─── Core Polling ─────────────────────────────────────────────────────────────

def check_alarms() -> list[dict]:
    """
    One-shot: poll all monitored alarms and process any state changes.
    Returns a list of incident dicts for alarms that transitioned.
    """
    incidents = []

    try:
        resp = _cloudwatch().describe_alarms(AlarmNames=MONITORED_ALARMS)
    except ClientError as e:
        logger.error("CloudWatch describe_alarms failed: %s", e)
        return incidents

    alarms = resp.get("MetricAlarms", [])
    found_names = {a["AlarmName"] for a in alarms}
    missing = set(MONITORED_ALARMS) - found_names
    if missing:
        logger.warning("Alarms not found in CloudWatch: %s", missing)

    for alarm in alarms:
        name = alarm["AlarmName"]
        state = alarm["StateValue"]  # OK | ALARM | INSUFFICIENT_DATA

        if not _state_changed(name, state):
            continue

        severity = SEVERITY_MAP.get(name, "info")
        logger.info(
            "State transition: %s → %s (severity=%s)", name, state, severity
        )

        if state != "ALARM":
            # Log recovery, no action needed
            if state == "OK":
                logger.info("%s recovered to OK", name)
            continue

        # ── Alarm fired ──
        recommendation = _recommend(name)
        remediation_result = None

        # Run auto-remediation if defined
        remediation_key = recommendation.get("auto_remediation")
        if remediation_key and remediation_key in _REMEDIATION_FNS:
            logger.info("Running auto-remediation: %s", remediation_key)
            remediation_result = _REMEDIATION_FNS[remediation_key]()
            logger.info("Remediation result: %s", remediation_result)

        _notify(name, state, recommendation, remediation_result)

        incidents.append({
            "alarm": name,
            "state": state,
            "severity": severity,
            "recommendation": recommendation,
            "remediation_result": remediation_result,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    return incidents


# ─── Main Loop ────────────────────────────────────────────────────────────────

def run() -> None:
    """Long-running monitor loop. Polls every POLL_INTERVAL seconds."""
    logger.info(
        "Council monitor starting. Polling %d alarms every %ds. SNS: %s",
        len(MONITORED_ALARMS), POLL_INTERVAL, SNS_TOPIC_ARN,
    )

    while True:
        try:
            incidents = check_alarms()
            if incidents:
                logger.info(
                    "Cycle complete: %d incident(s) processed", len(incidents)
                )
        except Exception:
            logger.exception("Unexpected error in monitoring cycle")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    run()
