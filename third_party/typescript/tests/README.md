# `ts_library` tests

These tests verify that the compilation succeeds/fails with the correct messages as part of the GN build.

It includes a `.gn` file which specifies this is a GN root, to run `gn gen` on the correct directory.

It includes a `BUILDCONFIG.gn` which includes the minimal Chromium configuration to work with `autoninja`.

It includes a `toolchain/BUILD.gn` which specifies an (unused) toolchain, which is required by Ninja to succesfully run a build.

All tests are fixtures in the [fixtures/](fixtures/) directory, which are compiled by `verify_ts_library.sh` and checked against their output.