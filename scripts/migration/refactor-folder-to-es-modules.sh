#!/bin/bash

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
done

git cl format
