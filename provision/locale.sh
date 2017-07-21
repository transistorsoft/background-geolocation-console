set -e
cat << EOF > /etc/default/locale
LANG="en_US.utf8"
LANGUAGE="en_US.UTF-8"
LC_ALL="en_US.UTF-8"
EOF
