#!/bin/bash

# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

if [ -z "$1" ]; then
  echo "Must supply folder name"
  exit
fi

MIGRATION_SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_PATH="$MIGRATION_SCRIPT_DIR/../.."
FRONT_END_PATH="$ROOT_PATH/front_end"
BUILD_GN_PATH="$ROOT_PATH/BUILD.gn"

FOLDER_PATH="$FRONT_END_PATH/$1"

if [ ! -d "$FOLDER_PATH" ]; then
  echo "Folder on location $FOLDER_PATH does not exist"
  exit
fi

FILES=$(find $FOLDER_PATH/*.js | xargs -n 1 basename -s .js)

npm run build

MODULE_FILE="$FRONT_END_PATH/$1/$1.js"

touch "$MODULE_FILE"

echo "// Copyright 2019 The Chromium Authors. All rights reserved." >> $MODULE_FILE
echo "// Use of this source code is governed by a BSD-style license that can be" >> $MODULE_FILE
echo "// found in the LICENSE file." >> $MODULE_FILE
echo "" >> $MODULE_FILE

for FILE in $FILES
do
  npm run migrate -- $1 $FILE
  # Remove old reference in all_devtools_files variable
  # The start of the substitution reads the whole file, which is necessary to remove the newline characters
  sed -i -e ":a;N;\$!ba;s/\"front\_end\/$1\/$FILE.js\"\,\n//g" "$BUILD_GN_PATH"

  # Add to all_devtools_modules
  sed -i -e "s/all\_devtools\_modules = \[/all\_devtools\_modules = \[ \"front\_end\/$1\/$FILE.js\"\,/" "$BUILD_GN_PATH"
  # Add to copied_devtools_modules
  sed -i -e "s/copied\_devtools\_modules = \[/copied\_devtools\_modules = \[ \"\$resources\_out\_dir\/$1\/$FILE.js\"\,/" "$BUILD_GN_PATH"

  echo "import * as $FILE from './$FILE.js';" >> $MODULE_FILE
done

# Add module entrypoint to GN variables
sed -i -e "s/all\_devtools\_modules = \[/all\_devtools\_modules = \[ \"front\_end\/$1\/$1.js\"\,/" "$BUILD_GN_PATH"
sed -i -e "s/copied\_devtools\_modules = \[/copied\_devtools\_modules = \[ \"\$resources\_out\_dir\/$1\/$1.js\"\,/" "$BUILD_GN_PATH"

echo "" >> $MODULE_FILE
echo "export {" >> $MODULE_FILE

for FILE in $FILES
do
  echo "  $FILE," >> $MODULE_FILE
done

echo "};" >> $MODULE_FILE

git cl format
