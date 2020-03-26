# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

ROOT_DIRECTORY=$(dirname "$0")
TS_LIBRARY_PATH=$(realpath $ROOT_DIRECTORY/../ts_library.py | sed 's/\//\\\//g')

rm -rf $ROOT_DIRECTORY/out/fixtures
failed=0

run_fixture() {
  local fixture_name="$1"
  local should_regen="${2:-1}"
  local build_output_file="$ROOT_DIRECTORY/fixtures/$fixture_name/build_output.txt"

  if [[ $should_regen -eq 1 ]]; then
    echo "Generating Ninja build files for $fixture_name"
    gn gen --root=$ROOT_DIRECTORY/fixtures/$fixture_name $ROOT_DIRECTORY/out/fixtures/$fixture_name
  fi

  echo "Compiling with Ninja for $fixture_name"
  autoninja -C $ROOT_DIRECTORY/out/fixtures/$fixture_name $fixture_name > "$build_output_file"

  # Replace the absolute python library path to make sure we can diff on different machines
  sed -i "" "s/$TS_LIBRARY_PATH/ts_library.py/g" $build_output_file

  local expected_build_output_file="$build_output_file.expected"

  if [[ $should_regen -eq 0 ]]; then
    expected_build_output_file="$expected_build_output_file.regen"
  fi

  diff_output=$(diff "$expected_build_output_file" "$build_output_file")

  if [[ "$diff_output" != "" ]]; then
    echo "Diff output for $fixture_name:"
    echo "$diff_output"
    failed=1
  fi
}

run_fixture "simple_dep"
run_fixture "test_dep"
run_fixture "compilation_failure_front_end"

# Test that compiling after a change works with dependencies
run_fixture "recompile"
sed -i "" "s/42/43/" $ROOT_DIRECTORY/fixtures/recompile/test/module/exporting_test.ts
run_fixture "recompile" 0
sed -i "" "s/43/42/g" $ROOT_DIRECTORY/fixtures/recompile/test/module/exporting_test.ts

# Test that compiling after a change in a dependency rebuilds only relevant libraries
run_fixture "recompile_dep"
sed -i "" "s/42/43/" $ROOT_DIRECTORY/fixtures/recompile_dep/front_end/module/module.ts
run_fixture "recompile_dep" 0
sed -i "" "s/43/42/" $ROOT_DIRECTORY/fixtures/recompile_dep/front_end/module/module.ts

# Test that ninja clean properly cleans all files
(cd $ROOT_DIRECTORY/out/fixtures/simple_dep && ninja -t clean)
files=$(find $ROOT_DIRECTORY/out/fixtures/simple_dep/gen -type f)

if [[ "$files" != "" ]]; then
  echo "Did not properly clean with \"ninja -t clean\". Unexpected files:"
  echo "$files"
  failed=1
fi

exit $failed