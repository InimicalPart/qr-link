This folder's main purpose is to show other collaborators what's running on the server without having the need to log into the server and find out. This folder also acts like a backup in-case stuff breaks. The server will also access certain files from this folder, so most of the server configuration can be done completely from GitHub.

Here are some good one-liners for uploading and configurating QRLink: (add to `~/.bashrc` and then run `source ~/.bashrc`)
```bash
# ~/.bashrc
export sshuser="user"                           # EDIT
export server='qrlink.server.com'               # EDIT
export QRLinkDIR='/home/user/Desktop/QRLink'    # EDIT

alias connectQRL='ssh $sshuser@$server'
alias rmQRL="connectQRL rm -rf /opt/QRLink"
alias uploadQRL='rmQRL && rsync -azvhP --delete --exclude="**/node_modules" --exclude="NextJS/build" --exclude "MongoQRL/dist" --exclude ".git" --exclude ".history" $QRLinkDIR $sshuser@$server:/opt'
alias configureQRL='connectQRL sudo -S bash /opt/QRLink/server/resources/setup.sh' # Warning! When asked for password, it will not be covered!


# Terminal

# Uploads and configures QRLink (will ask for password (will be shown in plain-text))
uploadQRL && configureQRL

# !--- OR ---! #

# Uploads and configures QRLink (will not ask for password and won't be shown in plain-text)
uploadQRL && echo $(echo "<base64 encoded password>" | base64 -d -) | configureQRL 


```