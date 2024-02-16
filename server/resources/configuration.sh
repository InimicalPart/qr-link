#! This script runs as root.
#! This script is used to configure the files correctly for maximum security, shall be run after building and before running the server.
#! This script only exists at /opt/QRLink/server/resources/configuration.sh.

if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit
fi


echo "[CFG] Configuring QRLink for maximum security"

echo "[CFG] Configuring /opt"
chmod g+w /opt

echo "[CFG] Configuring /opt/QRLink"
# /opt/QRLink shall be owned by root
chown -R root:project-manager /opt/QRLink
# /opt/QRLink shall only permit root to rwx, group to rwx, and others to rx
chmod -R ug=rwX,o= /opt/QRLink
chmod o=rX /opt/QRLink
# /opt should allow group members to write to it (for uploading purposes)

echo "[CFG] Configuring /opt/QRLink/NextJS"
# (default) user 'appuser' can read, and execute files and directories in /opt/QRLink/NextJS (X = only execute if it previously had execute permissions)
setfacl -R -d -m u:appuser:r-X /opt/QRLink/NextJS
# user 'appuser' can read, and execute files and directories in /opt/QRLink/NextJS (X = only execute if it previously had execute permissions)
setfacl -R -m u:appuser:r-X /opt/QRLink/NextJS
# other shall be allowed to read /opt/QRLink/NextJS
chmod o=rX /opt/QRLink/NextJS
# Remove execute from all files in /opt/QRLink/NextJS that arent .sh files
find /opt/QRLink -name node_modules -prune -o -name build -prune -o -type f ! -name "*.sh" -exec chmod -x {} \;
# Set the setuid bit on the NextJS directory so that new files and directories inherit the group of the parent directory
chmod g+s /opt/QRLink/NextJS

echo "[CFG] Configuring /opt/QRLink/NextJS/build"
chmod -R u=rX,g=rwX,o= /opt/QRLink/NextJS/build
# (default) owner (root) can read, write to all files and directories in /opt/QRLink/NextJS/build
# (default) group (project-manager) can read, write to all files and directories in /opt/QRLink/NextJS/build
# (default) user 'appuser' can read, and execute files and directories in /opt/QRLink/NextJS/build (X = only execute if it previously had execute permissions)
# (default) group 'project-manager' can read, write, and execute files and directories in /opt/QRLink/NextJS/build (X = only execute if it previously had execute permissions)
# (default) others cannot read, write, or execute files and directories in /opt/QRLink/NextJS/build
setfacl -R -d -m u::rw,g::rw,u:appuser:r-X,g:project-manager:rwX,o::--- /opt/QRLink/NextJS/build

# owner (root) can read, write to all files and directories in /opt/QRLink/NextJS/build (X = only execute if it previously had execute permissions)
# group (project-manager) can read, write to all files and directories in /opt/QRLink/NextJS/build (X = only execute if it previously had execute permissions)
# user 'appuser' can read, and execute files and directories in /opt/QRLink/NextJS/build (X = only execute if it previously had execute permissions)
# group 'project-manager' can read, write, and execute files and directories in /opt/QRLink/NextJS/build (X = only execute if it previously had execute permissions)
# others cannot read, write, or execute files and directories in /opt/QRLink/NextJS/build
setfacl -R -m u::rwX,g::rwX,u:appuser:r-X,g:project-manager:rwX,o::--- /opt/QRLink/NextJS/build

# owner (root) and group (project-manager) can read, write to all files and directories in /opt/QRLink/NextJS/build, others can't do anything (X = only execute if it previously had execute permissions)
chmod -R ug=rwX,o= /opt/QRLink/NextJS/build


echo "[CFG] Configuring /opt/QRLink/NextJS/build/cache"
# (default) user 'appuser' can write to all files and directories in /opt/QRLink/NextJS/build/cache
setfacl -R -d -m u:appuser:rwX /opt/QRLink/NextJS/build/cache
# user 'appuser' can write to all files and directories in /opt/QRLink/NextJS/build/cache
setfacl -R -m u:appuser:rwX /opt/QRLink/NextJS/build/cache

echo "[CFG] Removing execute from all files in /opt/QRLink/NextJS/build that arent .sh files"
# remove execute from all files in /opt/QRLink that arent .sh files
find /opt/QRLink -name node_modules -prune -o -name build -prune -o -type f ! -name "*.sh" -exec chmod -x {} \;


echo "[CFG] Configuring permissions for /srv/QRLink" #? /srv/QRLink, for any readers out there, is where the "qrcodes.jsonc" file will be stored if the backend can't connect to the database
mkdir -p /srv/QRLink
# /srv/QRLink shall be owned by root, and group project-manager, but user appuser shall be able to read and write to/from it
chown root:project-manager /srv/QRLink
chmod -R ug=rwX,o= /srv/QRLink # others are not allowed to read from /srv/QRLink, as it is a sensitive directory
chmod g+s /srv/QRLink # Set the setuid bit on the /srv/QRLink directory so that new files and directories inherit the group of the parent directory
setfacl -R -d -m u:appuser:rwX /srv/QRLink
setfacl -R -m u:appuser:rwX /srv/QRLink




#! Use when testing configuration.sh
# mkdir -p /opt/QRLink/NextJS/build
# mkdir -p /opt/QRLink/NextJS/src
# touch /opt/QRLink/NextJS/somefile.txt
# touch /opt/QRLink/NextJS/build/somefile.txt
# touch /opt/QRLink/NextJS/src/somefile.txt
# mkdir -p /opt/QRLink/backend/build
