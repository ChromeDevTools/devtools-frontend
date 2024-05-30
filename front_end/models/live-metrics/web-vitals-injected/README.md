# Using the `web-vitals` library

[`web-vitals`](https://github.com/GoogleChrome/web-vitals-extension) is a Google-maintained library that measures CWV metrics using their canonical definition. We use it to ensure we are using consistent implementations for measuring CWV across Google. It can also measure performance metrics of the current page *after* the they happen (See [`PerformanceObserver` buffered setting](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe#buffered)). See [go/cpq:rpp-metric-observations](http://go/cpq:rpp-metric-observations) for more information.

The web-vitals library needs to be run in the target page (although it can be used in an isolated execution context). We therefore need to create a JS binary that can be injected via `Page.evaluate`/`Page.addScriptToEvaluateOnNewDocument`. See `BUILD.gn` and `rollup.config.js` for how we bundle the JS binary.
