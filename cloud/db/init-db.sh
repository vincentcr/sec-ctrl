#!/bin/bash
set -e

help=$(cat <<"_EOF_"
create database and or schemas
  -d create database
  -s create schemas
_EOF_
)

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_PASSWORD_HASH=md5$(cat $SCRIPTS_DIR/md5_passwd)


function main {
  while getopts dsh opt ; do
    case "$opt" in
      d) create_db ;;
      s) create_schema ;;
      h) echo "$help" ;;
    esac
  done
}

function create_db {
  PGPASSWORD=$DB_ADMIN_PASSWORD exec_sql --user $DB_ADMIN_USER  -d $DB_ADMIN_DB_NAME -f $SCRIPTS_DIR/db.sql
}

function create_schema {
  PGPASSWORD=$DB_PASSWORD exec_sql --user $DB_USER -d $DB_NAME -f $SCRIPTS_DIR/tables.sql
  PGPASSWORD=$DB_PASSWORD exec_sql --user $DB_USER -d $DB_NAME -f $SCRIPTS_DIR/functions.sql
}

function exec_sql {
  psql \
  --host $DB_HOST \
  --port $DB_PORT \
  -v ON_ERROR_STOP=1 \
  -v DB_NAME=$DB_NAME \
  -v DB_PASSWORD_HASH=$DB_PASSWORD_HASH \
  -v DB_USER=$DB_USER \
  -v DB_ADMIN_USER=$DB_ADMIN_USER \
  $*
}

opts=${*:-"-ds"}
main $opts
