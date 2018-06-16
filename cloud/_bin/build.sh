#!/bin/bash

set -e
set -o pipefail

PATH=./node_modules/.bin:$PATH

SRC_DIR=src
DST_DIR=dist

# compile TS files'
tsc

npm install

