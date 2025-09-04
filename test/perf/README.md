# Performance Testing

These are performance tests that run benchmarks of automated userflows. The resuls are aggregated using the [Skia Perf format](https://skia.googlesource.com/buildbot/+/refs/heads/main/perf/FORMAT.md) and stored under perf-data/devtools-perf.json.

The tests are run on devtools CI on the "Standalone Linux" bot. The result of each run is [uploaded](https://source.chromium.org/chromium/infra/infra_superproject/+/main:build/recipes/recipes/devtools/devtools-frontend.py?q=publish_performance_benchmarks) to Skia Perf  so that the benchmarks can be monitored in [devtools own dashboard instance](https://devtools-frontend-perf.corp.goog/e/) .

## Dashboards

* These links load one of median/mean/p90/p99, selected randomly. ¯\_(ツ)_/¯
  * ["LargeDOMTraceLoad" benchmark](https://devtools-frontend-perf.corp.goog/e/?queries=test%LargeDOMTraceLoad)
  * ["BootPerf" benchmark](https://devtools-frontend-perf.corp.goog/e/?queries=test%BootPerf)
  * ["LargeCPULoad" benchmark](https://devtools-frontend-perf.corp.goog/e/?queries=test%LargeCPULoad)
* Build your own custom query: https://devtools-frontend-perf.corp.goog/e/ ([read the docs](http://go/perf-user-doc) as the UI is tricky). In short:
  - click "stats" and p50 or p90 or mean
  - click "tests" and select given test.
  - click plot

## Infra
* [GCS bucket where data is stored](https://pantheon.corp.google.com/storage/browser/devtools-frontend-perf/ingest/2024/10/08/08/client.devtools-frontend.integration/Stand-alone%20Linux/performance-tests?pageState=(%22StorageObjectListTable%22:(%22f%22:%22%255B%255D%22))&e=-13802955&mods=component_inspector&project=skia-public)
  - (you need the "Storage Object Viewer" role for your account. You can ask the [Chrome Browser Infra team](https://g3doc.corp.google.com/company/teams/chrome/ops/engprod/browser_infra/index.md?cl=head) to grant you access).
