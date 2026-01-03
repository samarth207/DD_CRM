# Update Server with Latest Code

## Step 1: SSH into your server
```bash
ssh -i "C:\Users\samth\.ssh\id_ed25519" root@165.232.189.67
```

## Step 2: Navigate to app directory
```bash
cd /var/www/dd-crm
```

## Step 3: Pull latest code (if using Git on server)
```bash
git pull origin main
```

## Step 4: Restart the application
```bash
pm2 restart dd-crm
```

## Step 5: Clear Nginx cache (if any)
```bash
systemctl reload nginx
```

---

## Alternative: Manual Upload via SCP

If Git is not set up on the server, upload files manually:

### Upload frontend files:
```bash
scp -i "C:\Users\samth\.ssh\id_ed25519" -r frontend/* root@165.232.189.67:/var/www/dd-crm/frontend/
```

### Upload backend files:
```bash
scp -i "C:\Users\samth\.ssh\id_ed25519" -r backend/* root@165.232.189.67:/var/www/dd-crm/backend/
```

### Restart the app:
```bash
ssh -i "C:\Users\samth\.ssh\id_ed25519" root@165.232.189.67 "cd /var/www/dd-crm && pm2 restart dd-crm"
```

---

## Verify Update

After deployment, check:
1. Visit http://165.232.189.67
2. Open browser DevTools (F12) → Network tab
3. Check if CSS/JS files have `?v=2.5` in the URL
4. Hard refresh (Ctrl+Shift+R) to bypass browser cache
