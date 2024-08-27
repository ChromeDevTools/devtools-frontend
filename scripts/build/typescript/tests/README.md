# `ts_library` tests

These tests verify that the compilation succeeds/fails with the correct messages as part of the GN build.

All tests are fixtures in the [fixtures/](fixtures/) directory, which are compiled by `verify_ts_library.sh` and checked against their output.

Each test fixture contains the following:
- A `.gn` file which specifies this is a GN root, to run `gn gen` on the correct directory.
- A `BUILDCONFIG.gn` which includes the minimal Chromium configuration to work with `autoninja`.
- A `toolchain/BUILD.gn` which specifies an (otherwise unused) toolchain, as it is required by Ninja to succesfully run a build.
