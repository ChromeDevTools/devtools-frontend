#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

VERSION=5.1.0
GIT_SHA=1b872cf5f2159e8ace0e98d55d8eb54fb09adfbe # web-vitals does not tag releases.

# Note: this is just to handle updating README.chromium.
# For the actual sources, below we checkout the repo, apply local patches, then build with tsc.
vpython3 scripts/deps/roll_front_end_third_party.py web-vitals web-vitals dist $VERSION

cd "$SCRIPT_DIR"

# As per above comment, we don't need this from npm.
rm -rf package/src package/dist

if [ ! -d tmp-repo ]; then
    git clone http://github.com/GoogleChrome/web-vitals tmp-repo
fi

cd tmp-repo
rm -fr .git/rebase-apply
git checkout main
git reset --hard $GIT_SHA
git am ../patches/*.patch
# Note: to modify the local patches applied, exit the script at this point:
#    exit 1
# then cd into tmp-repo, make whatever modifications you need, then write the patches back:
#    git format-patch -o ../patches origin/main
cd -

# Copy the source files to our repo, and build it.
cp -r tmp-repo/src package/src
../../../node_modules/.bin/tsc -d -t esnext -m esnext --moduleResolution node --strict --outDir package/dist/modules/ package/src/**/*.ts package/src/index.ts

echo "Rebuild complete."
