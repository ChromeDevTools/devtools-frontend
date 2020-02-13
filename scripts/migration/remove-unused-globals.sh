#!/bin/bash
script_full_path=$(dirname "$0")

directories=$(find "$script_full_path/../../front_end/" -type d -maxdepth 1 -mindepth 1 -printf '%f\n')

cd $script_full_path

npm run build

for file in $directories; do
  npm run remove-unused $file
done
