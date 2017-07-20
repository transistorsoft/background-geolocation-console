#deploys the current code to the server
#requires your ssh key, so run it directly from your mac, not from the vagrant
export SERVER='root@104.236.224.126'
echo "This deploys the APP to the $SERVER"
[ -z "$SERVER" ] && exit
rm -rf build
scp provision/* $SERVER:/tmp
ssh $SERVER <<"ENDSSH"
    bash -l /tmp/mount-vagrant.sh
    bash -l /tmp/locale.sh
    bash -l /tmp/pg_prod.sh
    bash -l /tmp/node.sh
    bash -l /tmp/swap.sh
ENDSSH

ssh $SERVER 'pm2 stop server'

rsync --delete -rav -e ssh \
    --exclude='build' \
    --exclude='*.git' \
    --exclude=".vagrant" \
    --exclude="node_modules" \
    . $SERVER:/vagrant

ssh $SERVER <<"ENDSSH"
    sudo chmod -R 755 /vagrant
ENDSSH


ssh $SERVER <<"ENDSSH"
    cd /vagrant/
    npm install
    npm run heroku-postbuild
    ./node_modules/.bin/babel --presets='node6' server.js  -d compiled
    ./node_modules/.bin/babel --presets='node6' src/server -d compiled/src/server
ENDSSH

ssh $SERVER 'cd /vagrant; pm2 start compiled/server.js'
