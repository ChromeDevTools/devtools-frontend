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
# Verify that compiling again with no changes results in "no work to do"
run_fixture "simple_dep" 0

run_fixture "test_dep"
run_fixture "compilation_failure_front_end"

# Test that compiling after a change works with dependencies
run_fixture "recompile"
touch $ROOT_DIRECTORY/fixtures/recompile/test/module/exporting_test.ts
# We need to force read from this directory to make sure autoninja actually picks up the change
(find $ROOT_DIRECTORY/fixtures/recompile/ > /dev/null)
run_fixture "recompile" 0

# Test that compiling after a change in a dependency rebuilds only relevant libraries
run_fixture "recompile_dep"
touch $ROOT_DIRECTORY/fixtures/recompile_dep/front_end/module/module.ts
# We need to force read from this directory to make sure autoninja actually picks up the change
(find $ROOT_DIRECTORY/fixtures/recompile_dep/ > /dev/null)
run_fixture "recompile_dep" 0

# Test that ninja clean properly cleans all files
(cd $ROOT_DIRECTORY/out/fixtures/simple_dep && ninja -t clean)
files=$(find $ROOT_DIRECTORY/out/fixtures/simple_dep/gen -type f)

if [[ "$files" != "" ]]; then
  echo "Did not properly clean with \"ninja -t clean\". Unexpected files:"
  echo "$files"
  failed=1
fi

# Test that the .tsbuildinfo is deterministic
(cd $ROOT_DIRECTORY/out/fixtures/recompile_dep && ninja -t clean)
run_fixture "recompile_dep"

generated_tsbuildinfo="$ROOT_DIRECTORY/out/fixtures/recompile_dep/gen/test/module/module-tsconfig.json.tsbuildinfo"
expected_tsbuildinfo="$ROOT_DIRECTORY/fixtures/recompile_dep/expected.tsbuildinfo"

tsbuildinfo_diff_output=$(diff "$generated_tsbuildinfo" "$expected_tsbuildinfo")

if [[ "$tsbuildinfo_diff_output" != "" ]]; then
  echo ".tsbuildinfo is non-deterministic (crbug.com/1054494)"
  echo "$tsbuildinfo_diff_output"
  failed=1
fi

exit $failed