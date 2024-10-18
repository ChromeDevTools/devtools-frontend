#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Roll the latest version of the package from NPM
python3 scripts/deps/roll_front_end_third_party.py web-vitals web-vitals dist

# We need this one helper function to be exported, so modify the source .ts and then rebuild
sed -i '' -e 's/^const attributeINP/export const attributeINP/g' $SCRIPT_DIR/package/src/attribution/onINP.ts

# rough tsc version of https://github.com/GoogleChrome/web-vitals/blob/main/tsconfig.json
# Minor variations in the *.d.ts files are fine, but make sure the only change to onINP.js is the
# `export` added above.
node_modules/.bin/tsc -d -t esnext -m nodenext --moduleResolution nodenext --lib es2017,DOM --outDir $SCRIPT_DIR/package/dist/modules/ $SCRIPT_DIR/package/src/**/*.ts
