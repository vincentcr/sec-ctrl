#!/bin/sh

set -e

SCRIPT_DIR=$(dirname $0)
PKG="$(mktemp)-$(date +'%Y%m%d%H%M%S').zip"

${SCRIPT_DIR}/lambda-build.sh >&2

zip -q -r $PKG . >&2
echo $PKG