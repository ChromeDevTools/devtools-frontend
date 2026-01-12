# Performance testing

Performance tests run in Chromium infra to measure panel loading times. The `devtools_frontend` Crossbench benchmark collects the load time for the five major panels (elements, console, network, sources, resources) against three pages: [blank](about:blank), [speedometertests](https://chromium-workloads.web.app/speedometer/v3.1/?iterationCount=1&startAutomatically&suites=TodoMVC-Angular-Complex-DOM,TodoMVC-JavaScript-ES5-Complex-DOM,TodoMVC-React-Complex-DOM), and [dailybroadcast](https://browserben.ch/speedometer/v3.1/resources/newssite/news-next/dist/index.html).

Official results can be viewed on this [Skia-perf page](https://chrome-perf.corp.goog/m?begin=1767637318&end=1768242118&shortcut=53b911343bb42697c4a8e9f750aa421d&totalGraphs=1).

## How to run perf benchmark locally

Crossbench is available within the Chromium repository at `./tools/perf` and is kept up-to-date by running `gclient sync`. Alternatively you can clone the Crossbench [repo](sso://chromium/crossbench). The Crossbench executable is named `cb.py`.

To execute the full DevTools benchmark:
`./cb.py devtools_frontend --repeat=N`.
When --repeat argument is missing we run every scenario 2 times.

To execute the benchmark against a subset of panels and/or sites:
`./cb.py devtools_frontend --panels=elements,resources --sites=blank,dailybroadcast`

To run the benchmark against a local Chromium build, specify the path to your browser executable:
`./cb.py devtools_frontend --browser=path/to/chrome`

To run the benchmark against your local DevTools build:
`./cb.py devtools-frontend --browser=path/to/chrome -- --custom-devtools-frontend=file://$(realpath ./path/to/devtools)`

At the end of each run, Crossbench generates a report and outputs its path. Review the `devtools_frontend_load_time.json` file in the report folder and compare your numbers with the official performance runs.