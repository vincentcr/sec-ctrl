#!/bin/sh

set -e

PATH=./node_modules/.bin:$PATH

TMP_DIR=$(mktemp -d)
CUR_DIR=$(pwd)
PKG="$(mktemp)-$(date +'%Y%m%d%H%M%S').zip"
OUT_DIR=$TMP_DIR/dist

# echo TMP_DIR=$TMP_DIR CUR_DIR=$CUR_DIR PKG=$PKG

# delete old archive
rm -f $PKG

npm run test >&2

# compile TS files
tsc --outDir $OUT_DIR

# copy non-TS files
for src in $( find src -not -name *.ts -type f ); do
  dst=$OUT_DIR/$(echo $src | sed -n -e 's|src/\(.*\)|\1|p')
  mkdir -p $(dirname $dst)
  cp $src $dst
done

# install production node modules
cp package-lock.json package.json $TMP_DIR
cd $TMP_DIR
npm install --silent --production >&2

# zip everything into an archive
zip -q -r $PKG .  >&2

rm -rf $TMP_DIR

echo $PKG
