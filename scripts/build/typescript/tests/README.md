# `ts_library` tests

These tests verify that TypeScript compilation rules succeed and compile correctly as part of the GN build.

All tests are fixtures in the [fixtures/](fixtures/) directory and are defined as GN targets included in `//scripts/build:tests`.

To run the fixture tests, build the target with Ninja:

```bash
autoninja -C out/Default scripts/build:tests
```
