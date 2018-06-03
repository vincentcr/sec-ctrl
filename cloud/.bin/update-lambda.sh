#!/bin/sh

set -e

ARCHIVE=$( $(dirname $0)/build-lambda.sh )

if [ -z "$LAMBDA_NAME" ] ; then
  echo "LAMBDA_NAME env var required"
  exit 1
fi

if [ -z "$AWS_PROFILE" ] ; then
  echo "AWS_PROFILE env var required"
  exit 1
fi

aws --profile $AWS_PROFILE \
  lambda update-function-code \
  --function-name $LAMBDA_NAME \
  --zip-file fileb://$ARCHIVE

rm $ARCHIVE
