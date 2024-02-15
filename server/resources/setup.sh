#! This script runs as root.
#! This script is used to correctly configure QRLink for the server.
#! This script installs the necessary dependencies, builds the frontend and backend, and configures the server for maximum security.
#! This script only exists at /opt/QRLink/server/resources/setup.sh.

if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit
fi

echo "[SYS] Moving configuration.sh to /root"
mv /opt/QRLink/server/resources/configuration.sh /root
echo "[SYS] Moving unavailable.html to /var/www/errors"
mv /opt/QRLink/server/resources/unavailable.html /var/www/errors
cd /opt/QRLink
echo "[SYS] Installing dependencies"
npm install
cd /opt/QRLink/frontend
echo "[SYS] Building frontend"
npm run build
if [ $? -ne 0 ]; then
  echo "[SYS] Frontend build failed"
  exit 1
fi
cd /opt/QRLink/backend
echo "[SYS] Building backend"
npm run build
if [ $? -ne 0 ]; then
  echo "[SYS] Backend build failed"
  exit 1
fi
cd /root
echo "[SYS] Running configuration.sh"
bash /root/configuration.sh
systemctl daemon-reload
echo "[SYS] Restarting QRLink.service"
systemctl restart QRLink

echo "[SYS] Setup complete"