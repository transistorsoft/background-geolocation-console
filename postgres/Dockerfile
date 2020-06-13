FROM gliderlabs/alpine:3.6

EXPOSE 5432

ENV LANG en_US.utf8
ENV PGDATA /var/lib/postgresql/data
ENV DB_LOGIN postgres

WORKDIR /usr/src/

RUN mkdir ./docker-entrypoint-initdb.d && \
    mkdir -p "$PGDATA"

COPY ./docker-entrypoint.sh .
COPY ./create.sql ./docker-entrypoint-initdb.d

RUN echo "http://nl.alpinelinux.org/alpine/v3.6/main" > /etc/apk/repositories && \
    apk update && apk add vim bash nano curl git ca-certificates make "postgresql-dev>9.5" tzdata "postgresql>9.5" "postgresql-contrib>9.5" && \
    curl -o /usr/local/bin/gosu -sSL "https://github.com/tianon/gosu/releases/download/1.10/gosu-amd64" && \
    chmod +x /usr/local/bin/gosu && \
    chmod +s /usr/local/bin/gosu && \
    # time zone
    cp /usr/share/zoneinfo/UTC /etc/localtime && \
    echo "UTC" > /etc/timezone && \
    mkdir -p "$PGDATA" && \
    chmod -R 700 $PGDATA && \
    chown -R postgres $PGDATA && \
    mkdir /run/postgresql && \
    chown -R postgres /run/postgresql && \
    chmod +x ./docker-entrypoint.sh && \
    git clone https://github.com/michelp/pgjwt.git && \
    cd pgjwt && \
    make install && \
    cd .. && \
    rm -Rf pgjwt


ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["postgres"]
