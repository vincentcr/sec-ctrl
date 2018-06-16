#!/bin/bash

IMG_NAME=lambda-builder

BUILD_CMD=${BUILD_CMD:-npm run build}
TARGET=${TARGET:-$(pwd)}

SCRIPT_PATH="$( cd "$(dirname "$0")" ; pwd -P )"
ROOT_DIR=${SCRIPT_PATH}/../..
REL_TARGET=$(python -c "import os.path; print os.path.relpath('${TARGET}', '${ROOT_DIR}')")

docker run --rm -v ${TARGET}/../..:/build -w /build/${REL_TARGET} ${IMG_NAME} ${BUILD_CMD}
