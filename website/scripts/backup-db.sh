#!/bin/bash

###############################################################################
# Database Backup Strategy
# Automated backup and recovery procedures for PostgreSQL
###############################################################################

set -e  # Exit on error

# Configuration
DB_URL="${DATABASE_URL}"
DB_HOST="${DATABASE_HOST:-db.prisma.io}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_USER="${DATABASE_USER}"
DB_NAME="${DATABASE_NAME:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

###############################################################################
# Full Database Backup
###############################################################################
backup_full() {
  log "Starting full database backup..."
  
  local backup_file="$BACKUP_DIR/full_backup_$(date +%Y%m%d_%H%M%S).sql"
  
  if [ -n "$DB_URL" ]; then
    if pg_dump \
      --dbname="$DB_URL" \
      --verbose \
      --format=plain \
      --no-owner \
      --no-privileges \
      > "$backup_file" 2>&1; then
      log "✅ Full backup completed: $backup_file"
    else
      log "❌ Full backup failed!"
      return 1
    fi
  else
    if [ -z "$DB_USER" ]; then
      log "❌ DATABASE_USER is required when DATABASE_URL is not set"
      return 1
    fi

    if pg_dump \
      --host="$DB_HOST" \
      --port="$DB_PORT" \
      --username="$DB_USER" \
      --dbname="$DB_NAME" \
      --verbose \
      --format=plain \
      --no-owner \
      --no-privileges \
      --no-password \
      > "$backup_file" 2>&1; then
      log "✅ Full backup completed: $backup_file"
    else
      log "❌ Full backup failed!"
      return 1
    fi
  fi

  # Compress backup
  gzip "$backup_file"
  log "✅ Backup compressed: ${backup_file}.gz"

  # Get file size
  local size=$(du -h "${backup_file}.gz" | cut -f1)
  log "Backup size: $size"
}

###############################################################################
# Incremental Backup (using WAL - Write Ahead Logs)
###############################################################################
backup_incremental() {
  log "Starting incremental backup (WAL)..."
  
  local backup_dir="$BACKUP_DIR/wal_$(date +%Y%m%d_%H%M%S)"
  mkdir -p "$backup_dir"
  
  log "Note: Incremental backups require WAL archiving to be enabled"
  log "Configure in PostgreSQL: wal_level = replica, archive_mode = on"
}

###############################################################################
# Continuous Archiving Setup
###############################################################################
setup_wal_archiving() {
  log "Setting up continuous WAL archiving..."
  
  # This is typically done at database configuration level
  # Add to postgresql.conf:
  # wal_level = replica
  # archive_mode = on
  # archive_command = 'cp %p /path/to/archive/%f'
  
  log "WAL archiving setup instructions:"
  log "1. Enable in PostgreSQL configuration (postgresql.conf)"
  log "2. Set archive_command to backup WAL files"
  log "3. Restart PostgreSQL service"
}

###############################################################################
# Restore Database
###############################################################################
restore_backup() {
  local backup_file="$1"
  
  if [ -z "$backup_file" ]; then
    log "❌ Error: Backup file not specified"
    return 1
  fi
  
  if [ ! -f "$backup_file" ]; then
    log "❌ Error: Backup file not found: $backup_file"
    return 1
  fi
  
  log "Starting database restore from: $backup_file"
  log "⚠️  WARNING: This will overwrite existing database!"
  read -p "Continue? (yes/no): " -r confirm
  
  if [[ ! $confirm =~ ^[Yy][Ee][Ss]$ ]]; then
    log "Restore cancelled"
    return 0
  fi
  
  # Decompress if needed
  local restore_file="$backup_file"
  if [[ "$backup_file" == *.gz ]]; then
    log "Decompressing backup..."
    gunzip -c "$backup_file" > "${backup_file%.gz}"
    restore_file="${backup_file%.gz}"
  fi
  
  # Restore database
  if [ -n "$DB_URL" ]; then
    if psql \
      --dbname="$DB_URL" \
      --set ON_ERROR_STOP=on \
      < "$restore_file"; then
      log "✅ Database restore completed successfully"
    else
      log "❌ Database restore failed!"
      return 1
    fi
  else
    if [ -z "$DB_USER" ]; then
      log "❌ DATABASE_USER is required when DATABASE_URL is not set"
      return 1
    fi

    if psql \
      --host="$DB_HOST" \
      --port="$DB_PORT" \
      --username="$DB_USER" \
      --dbname="$DB_NAME" \
      --no-password \
      --set ON_ERROR_STOP=on \
      < "$restore_file"; then
      log "✅ Database restore completed successfully"
    else
      log "❌ Database restore failed!"
      return 1
    fi
  fi

  # Clean up decompressed file
  if [[ "$backup_file" == *.gz ]]; then
    rm "$restore_file"
  fi
}

###############################################################################
# Verify Backup Integrity
###############################################################################
verify_backup() {
  local backup_file="$1"
  
  if [ -z "$backup_file" ]; then
    log "❌ Error: Backup file not specified"
    return 1
  fi
  
  log "Verifying backup integrity: $backup_file"
  
  # Check file exists
  if [ ! -f "$backup_file" ]; then
    log "❌ Backup file not found"
    return 1
  fi
  
  # Check file size
  local size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file")
  if [ "$size" -lt 1000 ]; then
    log "❌ Backup file appears to be too small: $size bytes"
    return 1
  fi
  
  log "✅ Backup file validation passed (size: $size bytes)"
  
  # If compressed, verify gzip integrity
  if [[ "$backup_file" == *.gz ]]; then
    if gzip -t "$backup_file" 2>/dev/null; then
      log "✅ Gzip integrity check passed"
    else
      log "❌ Gzip integrity check failed!"
      return 1
    fi
  fi
  
  return 0
}

###############################################################################
# Cleanup Old Backups
###############################################################################
cleanup_old_backups() {
  log "Cleaning up backups older than $RETENTION_DAYS days..."
  
  find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
  
  local count=$(find "$BACKUP_DIR" -name "*.sql.gz" | wc -l)
  log "✅ Cleanup completed. Retained backups: $count"
}

###############################################################################
# List Available Backups
###############################################################################
list_backups() {
  log "Available backups:"
  ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || log "No backups found"
}

###############################################################################
# Main Menu
###############################################################################
show_menu() {
  echo ""
  echo "Database Backup Management"
  echo "=========================="
  echo "1. Full backup"
  echo "2. Verify backup"
  echo "3. Restore from backup"
  echo "4. List backups"
  echo "5. Cleanup old backups"
  echo "6. Setup WAL archiving"
  echo "7. Exit"
  echo ""
}

###############################################################################
# Entry Point
###############################################################################
main() {
  log "Database Backup Script Started"
  
  # Check for required commands
  for cmd in pg_dump psql gzip; do
    if ! command -v "$cmd" &>/dev/null; then
      log "❌ Required command not found: $cmd"
      exit 1
    fi
  done
  
  # If argument provided, execute directly
  if [ $# -gt 0 ]; then
    case "$1" in
      backup) backup_full ;;
      restore) restore_backup "$2" ;;
      verify) verify_backup "$2" ;;
      list) list_backups ;;
      cleanup) cleanup_old_backups ;;
      *) log "Unknown command: $1"; exit 1 ;;
    esac
  else
    # Interactive mode
    while true; do
      show_menu
      read -p "Select option: " -r choice
      
      case $choice in
        1) backup_full ;;
        2) 
          list_backups
          read -p "Enter backup file: " -r backup_file
          verify_backup "$backup_file"
          ;;
        3)
          list_backups
          read -p "Enter backup file to restore: " -r backup_file
          restore_backup "$backup_file"
          ;;
        4) list_backups ;;
        5) cleanup_old_backups ;;
        6) setup_wal_archiving ;;
        7) 
          log "Exiting..."
          exit 0
          ;;
        *) log "Invalid option" ;;
      esac
    done
  fi
}

main "$@"
