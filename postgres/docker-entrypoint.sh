#!/bin/sh
chmod -R 700 "$PGDATA"
chown -R postgres "$PGDATA"

if [ -z "$(ls -A "$PGDATA")" ]; then
  gosu postgres initdb
  sed -ri "s/^#(listen_addresses\s*=\s*)\S+/\1'*'/" "$PGDATA"/postgresql.conf

  pass=
  authMethod=trust

  userSql="ALTER USER postgres WITH SUPERUSER $pass;"
  echo $userSql | gosu postgres postgres --single -jE
  echo

  echo "CREATE DATABASE geolocation;" | gosu postgres postgres --single -jE

  # internal start of server in order to allow set-up using psql-client
  # does not listen on TCP/IP and waits until start finishes
  gosu postgres pg_ctl -D "$PGDATA" \
    -o "-c listen_addresses=''" \
    -w start

  for f in ./docker-entrypoint-initdb.d/*; do
      case "$f" in
          *.sql) echo "$0: running $f"; psql -U postgres -d geolocation < "$f" && echo ;;
      esac
      echo
  done

  gosu postgres pg_ctl -D "$PGDATA" -m fast -w stop

  { echo; echo "host all all 0.0.0.0/0 $authMethod"; } >> "$PGDATA"/pg_hba.conf

fi

case "$1" in
  shell)
    bash;;
  exec)
    exec @2;;
  *)
    exec gosu postgres "$@";;
esac
