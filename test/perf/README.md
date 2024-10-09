# Performance Testing

These are performance tests that run benchmarks of automated userflows. The resuls are aggregated using the [Skia Perf format](https://skia.googlesource.com/buildbot/+/refs/heads/main/perf/FORMAT.md) and stored under perf-data/devtools-perf.json.

The tests are run on devtools CI on the "Standalone Linux" bot. The result of each run is [uploaded](https://source.chromium.org/chromium/infra/infra_superproject/+/main:build/recipes/recipes/devtools/devtools-frontend.py?q=publish_performance_benchmarks) to Skia Perf  so that the benchmarks can be monitored in [devtools own dashboard instance](https://devtools-frontend-perf.corp.goog/e/) .


## Quick links
* [Performance panel "TraceLoad" benchmark dashboard](https://devtools-frontend-perf.corp.goog/e/?queries=stats%3Dmean%26test%3DTraceLoad)
* [DevTools "BootPerf" benchmark dashboard](https://devtools-frontend-perf.corp.goog/e/?queries=test%3DBootPerf)
* [Peak of the GCS bucket where data is stored](https://pantheon.corp.google.com/storage/browser/devtools-frontend-perf/ingest/2024/10/08/08/client.devtools-frontend.integration/Stand-alone%20Linux/performance-tests?pageState=(%22StorageObjectListTable%22:(%22f%22:%22%255B%255D%22))&e=-13802955&mods=component_inspector&project=skia-public) (you need the "Storage Object Viewer" role for your account. You can ask the [Chrome Browser Infra team](https://g3doc.corp.google.com/company/teams/chrome/ops/engprod/browser_infra/index.md?cl=head) to grant you access).

