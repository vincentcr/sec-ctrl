#!/bin/bash

set -uo pipefail

SCRIPTS_DIR=$(dirname $0)
AWS_PROFILE=polymatix
SSM_ROOT=/sec_ctrl
PROD_CONFIG_FILE=config/production.json

if [ $(uname) == "Darwin" ] ; then
  MD5_CMD='md5'
else
  MD5_CMD='md5sum'
fi

SSM_CONFIG=$(aws --profile=$AWS_PROFILE ssm get-parameters-by-path --path $SSM_ROOT --recursive --max-results 10 --with-decryption)

function get_ssm_value {
  local name="$SSM_ROOT/db/$1"
  echo $SSM_CONFIG | jq ".Parameters[] | select(.Name == \"$name\")"  | jq -r .Value
}

function get_config_value {
  local name=".db.$1"
  cat $PROD_CONFIG_FILE | jq -r $name
}

DB_ADMIN_PASSWORD=$(get_ssm_value ad min_password)
DB_PASSWORD=$(get_ssm_value password)
DB_ADMIN_USER=$(get_config_value admin_user)
DB_ADMIN_DB_NAME=$(get_config_value admin_database)
DB_USER=$(get_config_value user)
DB_NAME=$(get_config_value database)
DB_HOST=$(get_config_value host)
DB_PORT=$(get_config_value port)

echo -n "${DB_PASSWORD}${DB_USER}" | eval $MD5_CMD | cut -d' ' -f1 > $SCRIPTS_DIR/md5_passwd
if [ "$?" != "0" ] ; then
  exit 1
fi

. $SCRIPTS_DIR/init-db.sh $*
rm $SCRIPTS_DIR/md5_passwd
