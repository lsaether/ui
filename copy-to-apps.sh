#!/bin/sh

function copy_folder () {
  SRC="packages/$1/build"
  DST="apps/node_modules/@polkadot/$1"

  echo "** Copying $SRC to apps/$DST"

  rm -rf ../$DST
  cp -r $SRC ../$DST
}

yarn polkadot-dev-build-ts

copy_folder "react-identicon"
copy_folder "react-qr"
copy_folder "ui-assets"
copy_folder "ui-keyring"
copy_folder "ui-settings"
copy_folder "ui-shared"
