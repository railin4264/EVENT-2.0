#!/bin/bash

# EventConnect 2.0 - Production Deployment Script
# Automated deployment script for EventConnect backend

set -e  # Exit on any error

# Configuration
APP_NAME="eventconnect"
DOMAIN="eventconnect.com"
API_DOMAIN="api.eventconnect.com"
DEPLOY_USER="deploy"
BACKUP_DIR="/var/backups/eventconnect"
LOG_FILE="/var/log/eventconnect-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root"
fi

# Pre-deployment checks
pre_deployment_checks() {
    log "Starting pre-deployment checks..."

    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running"
    fi

    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        error "docker-compose is not installed"
    fi

    # Check if environment file exists
    if [ ! -f ".env" ]; then
        error "Environment file (.env) not found"
    fi

    # Check if SSL certificates exist
    if [ ! -f "/etc/nginx/ssl/${DOMAIN}.crt" ]; then
        warning "SSL certificate for ${DOMAIN} not found"
    fi

    success "Pre-deployment checks completed"
}

# Create backup
create_backup() {
    log "Creating backup..."

    BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_DATE}"

    # Create backup directory
    sudo mkdir -p "$BACKUP_PATH"

    # Backup database
    if docker ps | grep -q mongodb; then
        log "Backing up MongoDB database..."
        docker exec mongodb mongodump --out "/backup/mongodb_${BACKUP_DATE}" --authenticationDatabase=admin -u "$MONGODB_USERNAME" -p "$MONGODB_PASSWORD"
        sudo docker cp mongodb:/backup/mongodb_${BACKUP_DATE} "$BACKUP_PATH/"
    fi

    # Backup uploads directory
    if [ -d "uploads" ]; then
        log "Backing up uploads directory..."
        sudo cp -r uploads "$BACKUP_PATH/"
    fi

    # Backup current configuration
    sudo cp .env "$BACKUP_PATH/"
    sudo cp docker-compose.yml "$BACKUP_PATH/"

    success "Backup created at $BACKUP_PATH"
}

# Health check function
health_check() {
    local url=$1
    local max_attempts=30
    local attempt=1

    log "Performing health check on $url..."

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null; then
            success "Health check passed for $url"
            return 0
        fi

        log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done

    error "Health check failed for $url after $max_attempts attempts"
}

# Deploy application
deploy_application() {
    log "Starting application deployment..."

    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose pull

    # Stop current containers
    log "Stopping current containers..."
    docker-compose down --remove-orphans

    # Start new containers
    log "Starting new containers..."
    docker-compose up -d

    # Wait for services to be ready
    sleep 30

    # Run database setup
    log "Running database setup..."
    docker exec eventconnect-backend node backend-api/scripts/setup-production-db.js

    # Health checks
    health_check "http://localhost/health"
    health_check "http://localhost/api/health"

    success "Application deployment completed"
}

# Setup SSL certificates with Let's Encrypt
setup_ssl() {
    log "Setting up SSL certificates..."

    # Create directories
    sudo mkdir -p /etc/nginx/ssl
    sudo mkdir -p /var/www/certbot

    # Generate certificates for all domains
    docker-compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$SSL_EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        -d "$API_DOMAIN"

    # Copy certificates to nginx directory
    sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "/etc/nginx/ssl/$DOMAIN.crt"
    sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "/etc/nginx/ssl/$DOMAIN.key"

    # Set proper permissions
    sudo chmod 600 "/etc/nginx/ssl/$DOMAIN.key"
    sudo chmod 644 "/etc/nginx/ssl/$DOMAIN.crt"

    success "SSL certificates configured"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."

    # Enable UFW
    sudo ufw --force enable

    # Allow SSH
    sudo ufw allow ssh

    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp

    # Allow specific ports for monitoring
    sudo ufw allow 9090/tcp  # Prometheus
    sudo ufw allow 3001/tcp  # Grafana

    # Deny all other incoming connections
    sudo ufw default deny incoming
    sudo ufw default allow outgoing

    success "Firewall configured"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."

    # Start monitoring containers
    docker-compose up -d prometheus grafana node-exporter

    # Wait for services
    sleep 20

    # Health check monitoring services
    health_check "http://localhost:9090"  # Prometheus
    health_check "http://localhost:3001"  # Grafana

    success "Monitoring setup completed"
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old Docker images and containers..."

    # Remove unused containers
    docker container prune -f

    # Remove unused images
    docker image prune -f

    # Remove unused volumes (be careful with this)
    docker volume prune -f

    # Remove old backups (keep last 7 days)
    find "$BACKUP_DIR" -type d -mtime +7 -exec sudo rm -rf {} \; 2>/dev/null || true

    success "Cleanup completed"
}

# Setup log rotation
setup_log_rotation() {
    log "Setting up log rotation..."

    # Create logrotate configuration
    sudo tee /etc/logrotate.d/eventconnect << EOF
$LOG_FILE {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}

/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        docker exec nginx nginx -s reload
    endscript
}
EOF

    success "Log rotation configured"
}

# Setup cron jobs
setup_cron_jobs() {
    log "Setting up cron jobs..."

    # Add cron job for SSL certificate renewal
    (crontab -l 2>/dev/null; echo "0 3 * * * docker-compose run --rm certbot renew --quiet && docker exec nginx nginx -s reload") | crontab -

    # Add cron job for database backup
    (crontab -l 2>/dev/null; echo "0 2 * * * $PWD/scripts/backup.sh") | crontab -

    # Add cron job for cleanup
    (crontab -l 2>/dev/null; echo "0 4 * * 0 docker system prune -f") | crontab -

    success "Cron jobs configured"
}

# Main deployment function
main() {
    log "Starting EventConnect 2.0 deployment..."

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --ssl)
                SETUP_SSL=true
                shift
                ;;
            --monitoring)
                SETUP_MONITORING=true
                shift
                ;;
            --no-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --force)
                FORCE_DEPLOY=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --ssl           Setup SSL certificates"
                echo "  --monitoring    Setup monitoring stack"
                echo "  --no-backup     Skip backup creation"
                echo "  --force         Force deployment without confirmations"
                echo "  -h, --help      Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done

    # Confirmation prompt (unless forced)
    if [ "$FORCE_DEPLOY" != true ]; then
        echo -e "${YELLOW}This will deploy EventConnect 2.0 to production.${NC}"
        echo -e "${YELLOW}This may cause downtime during the deployment process.${NC}"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Deployment cancelled by user"
            exit 0
        fi
    fi

    # Run deployment steps
    pre_deployment_checks

    if [ "$SKIP_BACKUP" != true ]; then
        create_backup
    fi

    if [ "$SETUP_SSL" = true ]; then
        setup_ssl
    fi

    configure_firewall
    deploy_application

    if [ "$SETUP_MONITORING" = true ]; then
        setup_monitoring
    fi

    setup_log_rotation
    setup_cron_jobs
    cleanup

    success "EventConnect 2.0 deployment completed successfully!"

    # Display important information
    echo
    echo -e "${GREEN}=== DEPLOYMENT SUMMARY ===${NC}"
    echo -e "Application URL: https://$DOMAIN"
    echo -e "API URL: https://$API_DOMAIN"
    echo -e "Monitoring: http://localhost:3001 (Grafana)"
    echo -e "Metrics: http://localhost:9090 (Prometheus)"
    echo -e "Logs: $LOG_FILE"
    echo
    echo -e "${YELLOW}Please update your DNS records to point to this server:${NC}"
    echo -e "A record: $DOMAIN -> $(curl -s ifconfig.me)"
    echo -e "A record: $API_DOMAIN -> $(curl -s ifconfig.me)"
    echo
}

# Run main function with all arguments
main "$@"