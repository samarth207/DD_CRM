#!/bin/bash
set -e

echo "======================================"
echo "DD CRM DigitalOcean Deployment"
echo "======================================"
echo ""

# Update system
echo "[1] Updating system..."
apt update && apt upgrade -y > /dev/null 2>&1

# Install Node.js 18
echo "[2] Installing Node.js 18..."
curl -sL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
apt install -y nodejs > /dev/null 2>&1
npm install -g pm2 > /dev/null 2>&1

# Install Nginx
echo "[3] Installing Nginx..."
apt install -y nginx > /dev/null 2>&1
systemctl start nginx
systemctl enable nginx

# Setup application directory
echo "[4] Setting up application..."
mkdir -p /var/www/dd-crm/uploads/recordings
chmod -R 755 /var/www/dd-crm/uploads
cd /var/www/dd-crm

# Install dependencies
echo "[5] Installing dependencies..."
npm install > /dev/null 2>&1

# Create .env file
if [ ! -f .env ]; then
    echo "[6] Creating .env file..."
    cat > .env << 'EOF'
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ddcrm?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_key_min_32_characters_long_change_this
CORS_ORIGIN=http://165.232.189.67
NODE_OPTIONS=--max-old-space-size=2048
EOF
fi

# Configure Nginx
echo "[7] Configuring Nginx..."
cat > /etc/nginx/sites-available/dd-crm << 'NGINX'
server {
    listen 80;
    server_name _;
    client_max_body_size 100M;
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1024;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/dd-crm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t > /dev/null 2>&1
systemctl restart nginx

# Start application with PM2
echo "[8] Starting application..."
pm2 delete dd-crm 2>/dev/null || true
pm2 start backend/server.js --name "dd-crm" --env production > /dev/null 2>&1
pm2 startup systemd -u root --hp /root > /dev/null 2>&1
pm2 save > /dev/null 2>&1

sleep 3
echo ""
pm2 status

echo ""
echo "======================================"
echo "DEPLOYMENT COMPLETE!"
echo "======================================"
echo ""
echo "Your app is running at: http://165.232.189.67"
echo ""
echo "NEXT STEPS:"
echo "1. Update .env with MongoDB and JWT secret"
echo "2. Restart: pm2 restart dd-crm"
echo "3. Login: admin@telecrm.com / admin123"
echo ""
