#!/bin/bash

# ==============================================================================
# Nexus Vendor Portal - Automated Deployment Script
# Run this script on your production Ubuntu/Debian server using: sudo bash deploy.sh
# ==============================================================================

echo "Starting automated deployment..."

# 1. Ensure we are in the right directory
PROJECT_DIR="/var/www/Vendor-Management"
if [ ! -d "$PROJECT_DIR" ]; then
    PROJECT_DIR="/var/www/vendor-management"
fi

if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Error: Could not find the project directory in /var/www/"
    exit 1
fi

cd "$PROJECT_DIR"
echo "✅ Found project directory at $PROJECT_DIR"

# 2. Build the React Frontend
echo "📦 Building the React Frontend..."
npm install
npm run build

if [ ! -d "$PROJECT_DIR/dist" ]; then
    echo "❌ Error: React build failed. 'dist' directory not found."
    exit 1
fi
echo "✅ React frontend built successfully."

# 3. Setup the Backend
echo "⚙️ Setting up the Node.js Backend..."
cd server
npm install
npm install -g pm2

# Stop existing PM2 process if it exists
pm2 stop nexus-backend 2>/dev/null
pm2 delete nexus-backend 2>/dev/null

# Start the backend via PM2
pm2 start src/server.js --name "nexus-backend"
pm2 save
pm2 startup
echo "✅ Backend started on port 3001 with PM2."

# 4. Setup Nginx Configuration (Skipped as Certbot handles app.finnovo.io config separately)
echo "🌐 Nginx configuration is handled separately for SSL (app.finnovo.io)."

# 5. Fix Permissions (Crucial for fixing 500 errors)
echo "🔒 Fixing File Permissions..."
chown -R www-data:www-data $PROJECT_DIR/dist
chmod -R 755 $PROJECT_DIR/dist

# 6. Restart Nginx
echo "🔄 Restarting Nginx..."
nginx -t
if [ $? -eq 0 ]; then
    systemctl restart nginx
    echo "✅ Nginx restarted successfully."
else
    echo "❌ Nginx configuration test failed. Please check the config."
    exit 1
fi

echo "=============================================================================="
echo "🎉 DEPLOYMENT COMPLETE! 🎉"
echo "Your application should now be live at https://app.finnovo.io"
echo "If you still see a 500 error, run: sudo tail -50 /var/log/nginx/error.log"
echo "=============================================================================="
