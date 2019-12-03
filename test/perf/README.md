# To run the test manually.

You can either run this via the Python script, which will start the DevTools frontend in hosted mode automatically.

```
python scripts/test/run_boot_perf_check.py --chrome-binary=/path/to/Chromium
```

Or you can run the test via Node, but you will need to launch the server prior.

1. Run the DevTools frontend server: `npm run server`
1. Exec the test: `node test/bootperf/bootperf.js --chrome-binary=/path/to/Chromium`

If you want to look at the flags for bootperf run it with `--help`.
