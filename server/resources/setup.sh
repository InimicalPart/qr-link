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

echo "[SYS] Installing dependencies"
cd /opt/QRLink
npm install

echo "[SYS] Building frontend"
cd /opt/QRLink/NextJS
npm run build
if [ $? -ne 0 ]; then
  echo "[SYS] frontend build failed"
  echo "[SYS] Cleaning up"
  rm -rf /opt/QRLink
  exit 1
fi

echo "[SYS] Running configuration.sh"
cd /root
bash /root/configuration.sh

cd /opt/QRLink/NextJS
echo "[SYS] Patching NextJS for WS (as appuser)"
sudo -u appuser /usr/bin/npx next-ws-cli@latest patch --yes

cd /root
echo "[SYS] configuration.sh has finished configuring QRLink for maximum security"
systemctl daemon-reload

echo "[SYS] Restarting QRLink.service"
systemctl restart QRLink


echo "[SYS] Setup complete"