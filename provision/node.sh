set -e
which nave || (
    apt-get update
    apt-get -y install curl
    curl -L https://raw.github.com/isaacs/nave/master/nave.sh | sudo tee /usr/bin/nave
    chmod +x /usr/bin/nave
)
sudo nave usemain 7.6.0
which pm2 || npm install -g pm2
which python || sudo apt-get -y install python
which g++ || sudo apt-get -y install build-essential g++
