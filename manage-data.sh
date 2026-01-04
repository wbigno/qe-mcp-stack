#!/bin/bash
# QE MCP Stack - Data Management Utility
# Manage persistent data directories

set -e

BACKUP_DIR="./backups"
DATA_DIR="./data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  QE MCP Stack - Data Management Utility${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

show_usage() {
    print_header
    echo "Usage: ./manage-data.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  status              Show disk usage and data statistics"
    echo "  backup              Create a backup of all persistent data"
    echo "  restore <file>      Restore data from a backup file"
    echo "  clear [service]     Clear all data (or specific service)"
    echo "  list                List all data directories and contents"
    echo "  verify              Verify data directory structure"
    echo ""
    echo "Examples:"
    echo "  ./manage-data.sh status"
    echo "  ./manage-data.sh backup"
    echo "  ./manage-data.sh clear code-analyzer"
    echo "  ./manage-data.sh restore backups/backup-20250101.tar.gz"
    echo ""
}

check_data_dir() {
    if [ ! -d "$DATA_DIR" ]; then
        echo -e "${RED}❌ Data directory not found!${NC}"
        echo "Run ./setup-data-dirs.sh first"
        exit 1
    fi
}

show_status() {
    print_header
    echo -e "${GREEN}📊 Data Directory Status${NC}"
    echo ""
    
    # Total disk usage
    echo "Total data directory size:"
    du -sh "$DATA_DIR"
    echo ""
    
    # Individual service disk usage
    echo "Per-service disk usage:"
    du -sh "$DATA_DIR"/* | sort -h
    echo ""
    
    # File counts
    echo "File counts per service:"
    for dir in "$DATA_DIR"/*; do
        if [ -d "$dir" ]; then
            service=$(basename "$dir")
            count=$(find "$dir" -type f ! -name ".gitkeep" | wc -l)
            echo "  $service: $count files"
        fi
    done
    echo ""
    
    # Recent activity
    echo "Recently modified (last 24 hours):"
    find "$DATA_DIR" -type f -mtime -1 ! -name ".gitkeep" | head -10 || echo "  No recent activity"
    echo ""
}

create_backup() {
    print_header
    check_data_dir
    
    # Create backups directory
    mkdir -p "$BACKUP_DIR"
    
    # Generate backup filename with timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_file="$BACKUP_DIR/qe-mcp-data-backup-$timestamp.tar.gz"
    
    echo -e "${YELLOW}Creating backup...${NC}"
    echo "Source: $DATA_DIR"
    echo "Target: $backup_file"
    echo ""
    
    # Create compressed backup
    tar -czf "$backup_file" -C . data/
    
    # Show backup info
    backup_size=$(du -sh "$backup_file" | cut -f1)
    
    echo -e "${GREEN}✅ Backup created successfully!${NC}"
    echo ""
    echo "Backup file: $backup_file"
    echo "Backup size: $backup_size"
    echo ""
    
    # List all backups
    echo "All backups:"
    ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
    echo ""
}

restore_backup() {
    print_header
    
    if [ -z "$1" ]; then
        echo -e "${RED}❌ Error: Please specify a backup file${NC}"
        echo "Usage: ./manage-data.sh restore <backup-file>"
        echo ""
        echo "Available backups:"
        ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "  No backups found"
        exit 1
    fi
    
    backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}❌ Error: Backup file not found: $backup_file${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}⚠️  WARNING: This will overwrite all current data!${NC}"
    echo "Backup file: $backup_file"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Restore cancelled"
        exit 0
    fi
    
    echo ""
    echo -e "${YELLOW}Restoring backup...${NC}"
    
    # Stop services first
    echo "Stopping services..."
    docker compose down
    
    # Remove old data
    echo "Removing old data..."
    rm -rf "$DATA_DIR"
    
    # Extract backup
    echo "Extracting backup..."
    tar -xzf "$backup_file" -C .
    
    # Restart services
    echo "Starting services..."
    docker compose up -d
    
    echo ""
    echo -e "${GREEN}✅ Restore completed successfully!${NC}"
    echo ""
}

clear_data() {
    print_header
    check_data_dir
    
    service="$1"
    
    if [ -z "$service" ]; then
        # Clear all data
        echo -e "${RED}⚠️  WARNING: This will delete ALL persistent data!${NC}"
        echo "All analysis results, cache, and history will be lost."
        echo ""
        read -p "Are you sure you want to continue? (yes/no): " confirm
        
        if [ "$confirm" != "yes" ]; then
            echo "Clear cancelled"
            exit 0
        fi
        
        echo ""
        echo -e "${YELLOW}Clearing all data...${NC}"
        
        for dir in "$DATA_DIR"/*; do
            if [ -d "$dir" ]; then
                service=$(basename "$dir")
                echo "  Clearing $service..."
                find "$dir" -type f ! -name ".gitkeep" -delete
            fi
        done
        
        echo ""
        echo -e "${GREEN}✅ All data cleared${NC}"
    else
        # Clear specific service
        service_dir="$DATA_DIR/$service"
        
        if [ ! -d "$service_dir" ]; then
            echo -e "${RED}❌ Error: Service not found: $service${NC}"
            echo ""
            echo "Available services:"
            ls -1 "$DATA_DIR"
            exit 1
        fi
        
        echo -e "${YELLOW}⚠️  WARNING: This will delete all data for: $service${NC}"
        echo ""
        read -p "Are you sure you want to continue? (yes/no): " confirm
        
        if [ "$confirm" != "yes" ]; then
            echo "Clear cancelled"
            exit 0
        fi
        
        echo ""
        echo -e "${YELLOW}Clearing $service data...${NC}"
        find "$service_dir" -type f ! -name ".gitkeep" -delete
        
        echo -e "${GREEN}✅ Data cleared for $service${NC}"
        
        # Optionally restart the service
        echo ""
        read -p "Restart $service container? (yes/no): " restart
        if [ "$restart" = "yes" ]; then
            docker compose restart "qe-$service" 2>/dev/null || docker compose restart "$service" 2>/dev/null || echo "Could not restart service"
        fi
    fi
    echo ""
}

list_data() {
    print_header
    check_data_dir
    
    echo -e "${GREEN}📁 Data Directory Contents${NC}"
    echo ""
    
    for dir in "$DATA_DIR"/*; do
        if [ -d "$dir" ]; then
            service=$(basename "$dir")
            file_count=$(find "$dir" -type f ! -name ".gitkeep" | wc -l)
            
            echo -e "${BLUE}$service${NC} ($file_count files):"
            
            if [ "$file_count" -eq 0 ]; then
                echo "  (empty)"
            else
                find "$dir" -type f ! -name ".gitkeep" -exec ls -lh {} \; | \
                    awk '{print "  " $9 " (" $5 ")"}' | head -5
                
                if [ "$file_count" -gt 5 ]; then
                    echo "  ... and $((file_count - 5)) more files"
                fi
            fi
            echo ""
        fi
    done
}

verify_structure() {
    print_header
    check_data_dir
    
    echo -e "${GREEN}🔍 Verifying Data Directory Structure${NC}"
    echo ""
    
    services=(
        "orchestrator"
        "code-analyzer"
        "coverage-analyzer"
        "azure-devops"
        "playwright-analyzer"
        "playwright-generator"
        "playwright-healer"
        "architecture-analyzer"
        "integration-mapper"
        "data-model-analyzer"
        "risk-analyzer"
        "workflow-analyzer"
        "quality-metrics-analyzer"
        "security-analyzer"
    )
    
    all_good=true
    
    for service in "${services[@]}"; do
        if [ -d "$DATA_DIR/$service" ]; then
            echo -e "  ${GREEN}✓${NC} $service"
        else
            echo -e "  ${RED}✗${NC} $service (missing)"
            all_good=false
        fi
    done
    
    echo ""
    if [ "$all_good" = true ]; then
        echo -e "${GREEN}✅ All directories present${NC}"
    else
        echo -e "${YELLOW}⚠️  Some directories are missing${NC}"
        echo "Run ./setup-data-dirs.sh to fix"
    fi
    echo ""
}

# Main script logic
case "${1:-}" in
    status)
        show_status
        ;;
    backup)
        create_backup
        ;;
    restore)
        restore_backup "$2"
        ;;
    clear)
        clear_data "$2"
        ;;
    list)
        list_data
        ;;
    verify)
        verify_structure
        ;;
    *)
        show_usage
        ;;
esac
