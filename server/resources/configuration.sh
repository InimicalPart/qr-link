#! This script runs as root.
#! This script is used to configure the files correctly for maximum security, shall be run after building and before running the server.
#! This script only exists at /opt/QRLink/server/resources/configuration.sh.

if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit
fi


echo "[SYS] Configuring QRLink for maximum security"

echo "[SYS] Configuring /opt"
chmod g+w /opt

echo "[SYS] Configuring /opt/QRLink"
# /opt/QRLink shall be owned by root
chown -R root:project-manager /opt/QRLink
# /opt/QRLink shall only permit root to rwx, group to rwx, and others to rx
chmod -R ug=rwX,o= /opt/QRLink
chmod o=rX /opt/QRLink
# /opt should allow group members to write to it (for uploading purposes)

echo "[SYS] Configuring /opt/QRLink/frontend"
# (default) user 'appuser' can read, and execute files and directories in /opt/QRLink/frontend (X = only execute if it previously had execute permissions)
setfacl -R -d -m u:appuser:r-X /opt/QRLink/frontend
# user 'appuser' can read, and execute files and directories in /opt/QRLink/frontend (X = only execute if it previously had execute permissions)
setfacl -R -m u:appuser:r-X /opt/QRLink/frontend
# other shall be allowed to read /opt/QRLink/frontend
chmod o=rX /opt/QRLink/frontend
# Remove execute from all files in /opt/QRLink/frontend that arent .sh files
find /opt/QRLink -name node_modules -prune -o -name build -prune -o -type f ! -name "*.sh" -exec chmod -x {} \;
# Set the setuid bit on the frontend directory so that new files and directories inherit the group of the parent directory
chmod g+s /opt/QRLink/frontend

echo "[SYS] Configuring /opt/QRLink/frontend/build"
chmod -R u=rX,g=rwX,o= /opt/QRLink/frontend/build
# (default) owner (root) can read, write to all files and directories in /opt/QRLink/frontend/build
# (default) group (project-manager) can read, write to all files and directories in /opt/QRLink/frontend/build
# (default) user 'appuser' can read, and execute files and directories in /opt/QRLink/frontend/build (X = only execute if it previously had execute permissions)
# (default) group 'project-manager' can read, write, and execute files and directories in /opt/QRLink/frontend/build (X = only execute if it previously had execute permissions)
# (default) others cannot read, write, or execute files and directories in /opt/QRLink/frontend/build
setfacl -R -d -m u::rw,g::rw,u:appuser:r-X,g:project-manager:rwX,o::--- /opt/QRLink/frontend/build

# owner (root) can read, write to all files and directories in /opt/QRLink/frontend/build (X = only execute if it previously had execute permissions)
# group (project-manager) can read, write to all files and directories in /opt/QRLink/frontend/build (X = only execute if it previously had execute permissions)
# user 'appuser' can read, and execute files and directories in /opt/QRLink/frontend/build (X = only execute if it previously had execute permissions)
# group 'project-manager' can read, write, and execute files and directories in /opt/QRLink/frontend/build (X = only execute if it previously had execute permissions)
# others cannot read, write, or execute files and directories in /opt/QRLink/frontend/build
setfacl -R -m u::rwX,g::rwX,u:appuser:r-X,g:project-manager:rwX,o::--- /opt/QRLink/frontend/build

# owner (root) and group (project-manager) can read, write to all files and directories in /opt/QRLink/frontend/build, others can't do anything (X = only execute if it previously had execute permissions)
chmod -R ug=rwX,o= /opt/QRLink/frontend/build


echo "[SYS] Configuring /opt/QRLink/frontend/build/cache"
# (default) user 'appuser' can write to all files and directories in /opt/QRLink/frontend/build/cache
setfacl -R -d -m u:appuser:rwX /opt/QRLink/frontend/build/cache
# user 'appuser' can write to all files and directories in /opt/QRLink/frontend/build/cache
setfacl -R -m u:appuser:rwX /opt/QRLink/frontend/build/cache

echo "[SYS] Removing execute from all files in /opt/QRLink/frontend/build that arent .sh files"
# remove execute from all files in /opt/QRLink that arent .sh files
find /opt/QRLink -name node_modules -prune -o -name build -prune -o -type f ! -name "*.sh" -exec chmod -x {} \;






#! Use when testing configuration.sh
# mkdir -p /opt/QRLink/frontend/build
# mkdir -p /opt/QRLink/frontend/src
# touch /opt/QRLink/frontend/somefile.txt
# touch /opt/QRLink/frontend/build/somefile.txt
# touch /opt/QRLink/frontend/src/somefile.txt
# mkdir -p /opt/QRLink/backend/build
# mkdir -p /opt/QRLink/backend/src
# touch /opt/QRLink/backend/somefile.txt
# touch /opt/QRLink/backend/build/somefile.txt
# touch /opt/QRLink/backend/src/somefile.txt