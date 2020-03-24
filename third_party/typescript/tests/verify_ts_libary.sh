# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

ROOT_DIRECTORY=$(dirname "$0")
TS_LIBRARY_PATH=$(realpath $ROOT_DIRECTORY/../ts_library.py | sed 's/\//\\\//g')

rm -rf $ROOT_DIRECTORY/out/fixtures
failed=0

run_fixture() {
  local fixture_name="$1"
  local build_output_file="$ROOT_DIRECTORY/fixtures/$fixture_name/build_output.txt"

  echo "Generating Ninja build files for $fixture_name"
  gn gen --root=$ROOT_DIRECTORY/fixtures/$fixture_name $ROOT_DIRECTORY/out/fixtures/$fixture_name

  echo "Compiling with Ninja for $fixture_name"
  autoninja -C $ROOT_DIRECTORY/out/fixtures/$fixture_name $fixture_name > "$build_output_file"

  # Replace the absolute python library path to make sure we can diff on different machines
  sed -i "" "s/$TS_LIBRARY_PATH/ts_library.py/g" $build_output_file

  diff_output=$(diff "$build_output_file.expected" "$build_output_file")

  if [[ "$diff_output" != "" ]]; then
    echo "Diff output for $fixture_name:"
    echo "$diff_output"
    failed=1
  fi
}

run_fixture "simple_dep"
run_fixture "test_dep"
run_fixture "compilation_failure_front_end"

exit $failed