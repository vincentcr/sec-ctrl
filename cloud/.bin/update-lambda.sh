#!/bin/sh

ARCHIVE=$( $(dirname $0)/build-lambda.sh )

echo ARCHIVE=$ARCHIVE

aws --profile polymatix lambda update-function-code --function-name test1 --zip-file fileb://$ARCHIVE
