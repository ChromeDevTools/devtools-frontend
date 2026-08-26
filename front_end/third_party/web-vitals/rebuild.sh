#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

VERSION=6.2.1
GIT_SHA=582ee7450ca5c60a947edbfd95ad53e135ca5dde # web-vitals does not tag releases.

# Note: this is just to handle updating README.chromium.
# For the actual sources, below we checkout the repo, apply local patches, then build with tsc.
vpython3 scripts/deps/roll_front_end_third_party.py web-vitals web-vitals dist $VERSION

cd "$SCRIPT_DIR"

# As per above comment, we don't need this from npm.
rm -rf package/src package/dist

if [ ! -d tmp-repo ]; then
    git clone https://github.com/GoogleChrome/web-vitals tmp-repo
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
vpython3 ../../../third_party/typescript/typescript.py --ignoreConfig --skipLibCheck -d -t esnext -m esnext --moduleResolution bundler --strict --outDir package/dist/modules/ package/src/**/*.ts package/src/index.ts

echo "Rebuild complete."
