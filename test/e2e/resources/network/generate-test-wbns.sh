#!/bin/sh

set -e

if ! command -v gen-bundle > /dev/null 2>&1; then

    echo "gen-bundle is not installed. Please run:"
    echo "  go get -u github.com/WICG/webpackage/go/bundle/cmd/..."
    echo '  export PATH=$PATH:$(go env GOPATH)/bin'
    exit 1
fi

gen-bundle \
  -version b2 \
  -har webbundle.har \
  -primaryURL uuid-in-package:020111b3-437a-4c5c-ae07-adb6bbffb720 \
  -o webbundle.wbn

cp webbundle.wbn webbundle_bad_metadata.wbn

# corrupt magic bytes
echo 'XX' | dd of=webbundle_bad_metadata.wbn bs=1 count=2 conv=notrunc

cp webbundle.wbn webbundle_bad_inner_request.wbn
# corrupt headers
echo 'XXXX'  | dd of=webbundle_bad_inner_request.wbn bs=1 seek=170 count=4 conv=notrunc
