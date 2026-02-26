#!/bin/bash

###############################################################################
# RDS Snapshot Backup & Restore
# Creates and restores AWS RDS snapshots for production recovery
###############################################################################

set -e

AWS_REGION="${AWS_REGION:-us-east-1}"
RDS_INSTANCE_ID="${RDS_INSTANCE_ID}"
RESTORE_INSTANCE_ID="${RESTORE_INSTANCE_ID:-${RDS_INSTANCE_ID}-restore}"
SNAPSHOT_ID_PREFIX="${SNAPSHOT_ID_PREFIX:-fortress-prod}"
VPC_SECURITY_GROUP_IDS="${VPC_SECURITY_GROUP_IDS}"
DB_SUBNET_GROUP="${DB_SUBNET_GROUP}"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

require_env() {
  if [ -z "$2" ]; then
    log "❌ Missing required env var: $1"
    exit 1
  fi
}

snapshot_create() {
  require_env "RDS_INSTANCE_ID" "$RDS_INSTANCE_ID"

  local snapshot_id="${SNAPSHOT_ID_PREFIX}-$(date +%Y%m%d-%H%M%S)"
  log "Creating snapshot: $snapshot_id"

  aws rds create-db-snapshot \
    --region "$AWS_REGION" \
    --db-instance-identifier "$RDS_INSTANCE_ID" \
    --db-snapshot-identifier "$snapshot_id" >/dev/null

  log "✅ Snapshot created: $snapshot_id"
}

snapshot_list() {
  require_env "RDS_INSTANCE_ID" "$RDS_INSTANCE_ID"

  aws rds describe-db-snapshots \
    --region "$AWS_REGION" \
    --db-instance-identifier "$RDS_INSTANCE_ID" \
    --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime,Status]' \
    --output table
}

snapshot_restore() {
  local snapshot_id="$1"
  if [ -z "$snapshot_id" ]; then
    log "❌ Snapshot ID is required for restore"
    exit 1
  fi

  require_env "RDS_INSTANCE_ID" "$RDS_INSTANCE_ID"
  require_env "VPC_SECURITY_GROUP_IDS" "$VPC_SECURITY_GROUP_IDS"
  require_env "DB_SUBNET_GROUP" "$DB_SUBNET_GROUP"

  log "⚠️  Restoring snapshot $snapshot_id to instance $RESTORE_INSTANCE_ID"
  read -p "Continue? (yes/no): " -r confirm
  if [[ ! $confirm =~ ^[Yy][Ee][Ss]$ ]]; then
    log "Restore cancelled"
    exit 0
  fi

  aws rds restore-db-instance-from-db-snapshot \
    --region "$AWS_REGION" \
    --db-instance-identifier "$RESTORE_INSTANCE_ID" \
    --db-snapshot-identifier "$snapshot_id" \
    --vpc-security-group-ids "$VPC_SECURITY_GROUP_IDS" \
    --db-subnet-group-name "$DB_SUBNET_GROUP" >/dev/null

  log "✅ Restore started: $RESTORE_INSTANCE_ID"
}

case "$1" in
  snapshot) snapshot_create ;;
  list) snapshot_list ;;
  restore) snapshot_restore "$2" ;;
  *)
    echo "Usage: $0 {snapshot|list|restore <snapshot-id>}"
    exit 1
    ;;
esac
