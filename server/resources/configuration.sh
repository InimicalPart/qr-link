#! This script runs as root.
#! This script is used to configure the files correctly for maximum security, shall be run after building and before running the server.
#! This script can be found at /root/configuration.sh

if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit
fi

# /opt/QRLink shall be owned by root
chown -R root:project-manager /opt/QRLink
# /opt/QRLink shall only permit root to rwx, group to rwx, and others to rx
chmod -R ug=rwX,o= /opt/QRLink
chmod o=rX /opt/QRLink
# /opt should allow group members to write to it (for uploading purposes)
chmod g+w /opt

# /opt/QRLink/frontend/build shall be owned by appuser:project-manager, and new files and directories shall inherit these permissions
# chown -R appuser:project-manager /opt/QRLink/frontend/build
chmod -R u=rX,g=rwX,o= /opt/QRLink/frontend/build
chmod o=rX /opt/QRLink/frontend
# Remove execute from all files in /opt/QRLink/frontend that arent .sh files
find /opt/QRLink/frontend -type f ! -name "*.sh" -exec chmod -x {} \;

# (default) owner (root) can read, write to all files and directories in /opt/QRLink/frontend/build
setfacl -R -d -m u::rw /opt/QRLink/frontend/build
# (default) group (project-manager) can read, write to all files and directories in /opt/QRLink/frontend/build
setfacl -R -d -m g::rw /opt/QRLink/frontend/build
# (default) user 'appuser' can read, and execute files and directories in /opt/QRLink/frontend/build (X = only execute if it previously had execute permissions)
setfacl -R -d -m u:appuser:r-X /opt/QRLink/frontend/build
# (default) group 'project-manager' can read, write, and execute files and directories in /opt/QRLink/frontend/build (X = only execute if it previously had execute permissions)
setfacl -R -d -m g:project-manager:rwX /opt/QRLink/frontend/build
# (default) others cannot read, write, or execute files and directories in /opt/QRLink/frontend/build
setfacl -R -d -m o::--- /opt/QRLink/frontend/build
# (default) user 'appuser' can read, and execute files and directories in /opt/QRLink/frontend (X = only execute if it previously had execute permissions)
setfacl -R -d -m u:appuser:r-X /opt/QRLink/frontend

# owner (root) can read, write to all files and directories in /opt/QRLink/frontend/build (X = only execute if it previously had execute permissions)
setfacl -R -m u::rwX /opt/QRLink/frontend/build
# group (project-manager) can read, write to all files and directories in /opt/QRLink/frontend/build (X = only execute if it previously had execute permissions)
setfacl -R -m g::rwX /opt/QRLink/frontend/build
# user 'appuser' can read, and execute files and directories in /opt/QRLink/frontend/build (X = only execute if it previously had execute permissions)
setfacl -R -m u:appuser:r-X /opt/QRLink/frontend/build
# group 'project-manager' can read, write, and execute files and directories in /opt/QRLink/frontend/build (X = only execute if it previously had execute permissions)
setfacl -R -m g:project-manager:rwx /opt/QRLink/frontend/build
# others cannot read, write, or execute files and directories in /opt/QRLink/frontend/build
setfacl -R -m o::--- /opt/QRLink/frontend/build
# user 'appuser' can read, and execute files and directories in /opt/QRLink/frontend (X = only execute if it previously had execute permissions)
setfacl -R -m u:appuser:r-X /opt/QRLink/frontend

# owner (root) and group (project-manager) can read, write to all files and directories in /opt/QRLink/frontend/build, others can't do anything (X = only execute if it previously had execute permissions)
chmod -R ug=rwX,o= /opt/QRLink/frontend/build

# Set the setuid bit on the frontend directory so that new files and directories inherit the group of the parent directory
chmod g+s /opt/QRLink/frontend






# remove execute from all files in /opt/QRLink that arent .sh files
find /opt/QRLink -type f ! -name "*.sh" -exec chmod -x {} \;


ln 



#setfacl -R -m u:appuser:rwx,d:u:appuser:rwx /opt/QRLink/frontend/build

exit 0

mkdir -p /opt/QRLink/frontend/build
mkdir -p /opt/QRLink/frontend/src
touch /opt/QRLink/frontend/somefile.txt
touch /opt/QRLink/frontend/build/somefile.txt
touch /opt/QRLink/frontend/src/somefile.txt
mkdir -p /opt/QRLink/backend/build
mkdir -p /opt/QRLink/backend/src
touch /opt/QRLink/backend/somefile.txt
touch /opt/QRLink/backend/build/somefile.txt
touch /opt/QRLink/backend/src/somefile.txt