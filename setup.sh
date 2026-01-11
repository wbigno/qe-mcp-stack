#!/bin/bash
# QE MCP Stack - One-Command Setup
# Run this after cloning the repo: ./setup.sh
# Usage: ./setup.sh [OPTIONS]
#   --skip-build      Skip Docker image building
#   --skip-health     Skip health checks at the end
#   --quick           Quick mode (skip build, useful for restarts)
#   --help            Show this help message

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration flags
SKIP_BUILD=false
SKIP_HEALTH=false
QUICK_MODE=false
NEEDS_ENV_EDIT=false

print_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                ║${NC}"
    echo -e "${CYAN}║          QE MCP Stack - Quick Setup            ║${NC}"
    echo -e "${CYAN}║                                                ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${BLUE}$(printf '═%.0s' {1..50})${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

show_help() {
    echo ""
    echo "QE MCP Stack Setup Script"
    echo ""
    echo "Usage: ./setup.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --skip-build      Skip Docker image building (use existing images)"
    echo "  --skip-health     Skip health checks at the end"
    echo "  --quick           Quick mode: skip build, go straight to start"
    echo "  --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./setup.sh                    # Full setup (first time)"
    echo "  ./setup.sh --skip-build       # Start with existing images"
    echo "  ./setup.sh --quick            # Quick restart"
    echo ""
}

# Parse command-line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-health)
                SKIP_HEALTH=true
                shift
                ;;
            --quick)
                QUICK_MODE=true
                SKIP_BUILD=true
                SKIP_HEALTH=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Check if running with correct permissions
check_permissions() {
    if [ ! -w "." ]; then
        print_error "Cannot write to current directory"
        print_info "Make sure you have write permissions"
        exit 1
    fi
}

# Cleanup on error
cleanup_on_error() {
    print_error "Setup failed. Cleaning up..."
    docker compose down 2>/dev/null || true
    print_info "You can retry setup by running: ./setup.sh"
    exit 1
}

# Set error trap
trap cleanup_on_error ERR

# Check prerequisites
check_prerequisites() {
    print_step "Checking Prerequisites"

    local all_good=true

    # Check Docker
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            docker_version=$(docker --version | cut -d' ' -f3 | sed 's/,//')
            print_success "Docker is installed and running (v${docker_version})"
        else
            print_error "Docker is installed but not running"
            print_info "Please start Docker Desktop and run this script again"
            all_good=false
        fi
    else
        print_error "Docker is not installed"
        print_info "Install Docker Desktop from: https://www.docker.com/products/docker-desktop"
        all_good=false
    fi

    # Check Docker Compose
    if docker compose version &> /dev/null; then
        compose_version=$(docker compose version --short)
        print_success "Docker Compose is available (v${compose_version})"
    else
        print_error "Docker Compose not found"
        print_info "Docker Compose is required. Install Docker Desktop which includes it."
        all_good=false
    fi

    # Check Node.js (optional but recommended)
    if command -v node &> /dev/null; then
        node_version=$(node --version)
        print_success "Node.js installed: ${node_version}"
    else
        print_warning "Node.js not installed (optional for local development)"
    fi

    # Check npm (optional)
    if command -v npm &> /dev/null; then
        npm_version=$(npm --version)
        print_success "npm installed: v${npm_version}"
    fi

    if [ "$all_good" = false ]; then
        echo ""
        print_error "Prerequisites check failed. Please fix the issues above."
        exit 1
    fi
}

# Setup configuration files
setup_config() {
    print_step "Setting Up Configuration Files"

    # Create .env in root (not config/)
    if [ ! -f ".env" ]; then
        if [ -f "config/.env.example" ]; then
            cp config/.env.example .env
            print_success "Created .env from template"
            NEEDS_ENV_EDIT=true
        elif [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Created .env from template"
            NEEDS_ENV_EDIT=true
        else
            print_warning ".env.example not found, creating minimal .env"
            cat > .env << 'EOF'
# Azure DevOps Configuration
AZURE_DEVOPS_PAT=YOUR_PAT_HERE
AZURE_DEVOPS_ORG=YOUR_ORG_HERE
AZURE_DEVOPS_PROJECT=YOUR_PROJECT_HERE

# API Keys (optional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
EOF
            NEEDS_ENV_EDIT=true
        fi
    else
        print_success ".env already exists"
    fi

    # Check config/.env for backwards compatibility
    if [ -f "config/.env" ] && [ ! -f ".env" ]; then
        print_info "Found config/.env, copying to root .env"
        cp config/.env .env
    fi

    # Check if configs need updating
    if [ -f "config/apps.json" ]; then
        if grep -q "YOUR_" config/apps.json 2>/dev/null; then
            print_warning "config/apps.json needs to be configured with your app paths"
        else
            print_success "config/apps.json looks configured"
        fi
    fi

    if [ -f "config/ado-config.json" ]; then
        if grep -q "YOUR_" config/ado-config.json 2>/dev/null; then
            print_warning "config/ado-config.json needs your Azure DevOps details"
        else
            print_success "config/ado-config.json looks configured"
        fi
    fi
}

# Validate configuration
validate_config() {
    print_step "Validating Configuration"

    if [ -f ".env" ]; then
        # Check for placeholder values
        if grep -q "YOUR_PAT_HERE\|YOUR_ORG_HERE\|YOUR_PROJECT_HERE\|PLACEHOLDER\|TODO\|CHANGE_ME" .env 2>/dev/null; then
            print_error "Configuration contains placeholder values"
            print_info "Please edit .env with real credentials"
            echo ""
            print_info "Required variables:"
            print_info "  - AZURE_DEVOPS_PAT (Personal Access Token)"
            print_info "  - AZURE_DEVOPS_ORG (Organization name)"
            print_info "  - AZURE_DEVOPS_PROJECT (Project name)"
            echo ""

            read -p "Open .env for editing now? (y/N): " edit_now
            if [[ "$edit_now" =~ ^[Yy]$ ]]; then
                ${EDITOR:-nano} .env

                # Re-validate after editing
                if grep -q "YOUR_PAT_HERE\|YOUR_ORG_HERE\|YOUR_PROJECT_HERE\|PLACEHOLDER\|TODO\|CHANGE_ME" .env 2>/dev/null; then
                    print_warning "Placeholders still detected. You can continue but some features may not work."
                    read -p "Continue anyway? (y/N): " continue_anyway
                    if [[ ! "$continue_anyway" =~ ^[Yy]$ ]]; then
                        print_info "Edit .env and run: ./setup.sh"
                        exit 1
                    fi
                else
                    print_success "Configuration validated"
                fi
            else
                print_warning "Continuing with placeholder values - some features may not work"
                NEEDS_ENV_EDIT=true
            fi
        else
            print_success "Configuration validated"
        fi
    else
        print_error ".env file not found"
        exit 1
    fi
}

# Setup data directories (inlined, no external script needed)
setup_data_dirs() {
    print_step "Setting Up Persistent Data Directories"

    if [ -d "data" ]; then
        print_success "Data directories already exist"
    else
        print_info "Creating data directories..."

        # Create main data directory
        mkdir -p data

        # Create data directories for services
        local services=("third-party" "test-plan-manager")

        for service in "${services[@]}"; do
            mkdir -p "data/$service"
            touch "data/$service/.gitkeep"
            print_info "  Created: data/$service"
        done

        # Update .gitignore
        if [ ! -f ".gitignore" ]; then
            touch .gitignore
        fi

        if ! grep -q "^data/\*" .gitignore 2>/dev/null; then
            cat >> .gitignore << 'EOF'

# QE MCP Stack - Persistent Data
data/*
!data/.gitkeep
!data/*/.gitkeep
EOF
            print_info "  Updated .gitignore"
        fi

        print_success "Data directories created"
    fi
}

# Build Docker images
build_images() {
    print_step "Building Docker Images"

    print_info "This may take 10-15 minutes on first run..."
    echo ""

    if docker compose build; then
        print_success "Docker images built successfully"
    else
        print_error "Docker build failed"
        print_info "Check the output above for errors"
        exit 1
    fi
}

# Start services
start_services() {
    print_step "Starting Services"

    if docker compose up -d; then
        print_success "Services started"
    else
        print_error "Failed to start services"
        print_info "Check logs with: docker compose logs"
        exit 1
    fi
}

# Wait for services with health checks
wait_for_services() {
    print_step "Waiting for Services to be Ready"

    local max_attempts=30
    local attempt=0

    print_info "Checking orchestrator health..."

    while [ $attempt -lt $max_attempts ]; do
        if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
            echo ""
            print_success "Orchestrator is healthy"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done

    echo ""
    print_warning "Services may still be starting (timeout after 60s)"
    print_info "Check status with: docker compose ps"
    return 0
}

# Show service URLs
show_urls() {
    print_step "🎉 Setup Complete!"

    echo ""
    echo -e "${GREEN}Your QE MCP Stack is running!${NC}"
    echo ""
    echo -e "${CYAN}📊 Dashboards:${NC}"
    echo "  ADO Dashboard:        http://localhost:5173"
    echo "  Code Dashboard:       http://localhost:8081"
    echo "  Infrastructure:       http://localhost:8082"
    echo "  API Documentation:    http://localhost:8000"
    echo ""
    echo -e "${CYAN}🔧 Core Services:${NC}"
    echo "  Orchestrator:         http://localhost:3000"
    echo "  Health Check:         http://localhost:3000/health"
    echo ""
    echo -e "${CYAN}🔌 Integration MCPs (8100-8199):${NC}"
    echo "  Azure DevOps:         http://localhost:8100"
    echo "  Third Party:          http://localhost:8101"
    echo "  Test Plan Manager:    http://localhost:8102"
    echo "  Browser Control:      http://localhost:8103"
    echo ""
    echo -e "${CYAN}📊 Code Analysis MCPs (8200-8299):${NC}"
    echo "  Code Quality:         http://localhost:8200"
    echo "  Coverage:             http://localhost:8201"
    echo "  Migration:            http://localhost:8203"
    echo "  JS Code Analyzer:     http://localhost:8204"
    echo "  JS Coverage:          http://localhost:8205"
    echo ""
    echo -e "${CYAN}🔍 Quality Analysis MCPs (8300-8399):${NC}"
    echo "  Risk Analyzer:        http://localhost:8300"
    echo "  Integration Mapper:   http://localhost:8301"
    echo "  Test Selector:        http://localhost:8302"
    echo ""
    echo -e "${CYAN}🎭 Playwright MCPs (8400-8499):${NC}"
    echo "  Generator:            http://localhost:8400"
    echo "  Analyzer:             http://localhost:8401"
    echo "  Healer:               http://localhost:8402"
    echo ""
    echo -e "${CYAN}📋 Useful Commands:${NC}"
    echo "  View logs:            docker compose logs -f"
    echo "  Stop stack:           docker compose down"
    echo "  Restart service:      docker compose restart <service-name>"
    echo "  Check status:         docker compose ps"
    echo "  Test MCPs:            ./test-all-mcps.sh"
    echo ""
}

# Show next steps
show_next_steps() {
    echo -e "${CYAN}📚 Next Steps:${NC}"

    if [ "$NEEDS_ENV_EDIT" = true ]; then
        echo ""
        print_warning "Configuration needs attention:"
        echo "  1. Edit .env with: ${EDITOR:-nano} .env"
        echo "  2. Update Azure DevOps credentials"
        echo "  3. Restart services: docker compose restart"
        echo ""
    fi

    echo "  1. Open http://localhost:5173 to use the ADO Dashboard"
    echo "  2. Open http://localhost:8081 for Code Analysis Dashboard"
    echo "  3. Review http://localhost:8000 for complete API docs"

    if [ "$SKIP_HEALTH" = false ]; then
        echo "  4. Run ./test-all-mcps.sh to verify all MCPs"
    fi

    echo ""
}

# Run health checks
run_health_checks() {
    if [ -f "test-all-mcps.sh" ]; then
        echo ""
        read -p "Run health checks now? (y/N): " run_checks

        if [[ "$run_checks" =~ ^[Yy]$ ]]; then
            chmod +x test-all-mcps.sh
            echo ""
            ./test-all-mcps.sh
        else
            print_info "You can run health checks later with: ./test-all-mcps.sh"
        fi
    else
        print_warning "test-all-mcps.sh not found, skipping health checks"
    fi
}

# Main setup flow
main() {
    print_banner

    parse_arguments "$@"

    if [ "$QUICK_MODE" = true ]; then
        print_info "Quick mode: skipping build, restarting services..."
    fi

    check_permissions
    check_prerequisites
    setup_config

    if [ "$QUICK_MODE" = false ]; then
        validate_config
    fi

    setup_data_dirs

    if [ "$SKIP_BUILD" = false ]; then
        build_images
    else
        print_info "Skipping Docker build (using existing images)"
    fi

    start_services
    wait_for_services
    show_urls
    show_next_steps

    if [ "$SKIP_HEALTH" = false ] && [ "$QUICK_MODE" = false ]; then
        run_health_checks
    fi

    echo ""
    print_success "Setup complete! Happy testing! 🚀"
    echo ""
}

# Run main setup
main "$@"
