(function () {
  'use strict';

  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/bfcache.js
  var bfcacheRestoreTime = -1;
  var getBFCacheRestoreTime = () => bfcacheRestoreTime;
  var onBFCacheRestore = (cb) => {
    addEventListener("pageshow", (event) => {
      if (event.persisted) {
        bfcacheRestoreTime = event.timeStamp;
        cb(event);
      }
    }, true);
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/bindReporter.js
  var getRating = (value, thresholds) => {
    if (value > thresholds[1]) {
      return "poor";
    }
    if (value > thresholds[0]) {
      return "needs-improvement";
    }
    return "good";
  };
  var bindReporter = (callback, metric, thresholds, reportAllChanges) => {
    let prevValue;
    let delta;
    return (forceReport) => {
      if (metric.value >= 0) {
        if (forceReport || reportAllChanges) {
          delta = metric.value - (prevValue ?? 0);
          if (delta || prevValue === void 0) {
            prevValue = metric.value;
            metric.delta = delta;
            metric.rating = getRating(metric.value, thresholds);
            callback(metric);
          }
        }
      }
    };
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/doubleRAF.js
  var doubleRAF = (cb) => {
    requestAnimationFrame(() => requestAnimationFrame(() => cb()));
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/generateUniqueID.js
  var generateUniqueID = () => {
    return `v5-${Date.now()}-${Math.floor(Math.random() * (9e12 - 1)) + 1e12}`;
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/getNavigationEntry.js
  var getNavigationEntry = () => {
    const navigationEntry = performance.getEntriesByType("navigation")[0];
    if (navigationEntry && navigationEntry.responseStart > 0 && navigationEntry.responseStart < performance.now()) {
      return navigationEntry;
    }
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/getActivationStart.js
  var getActivationStart = () => {
    const navEntry = getNavigationEntry();
    return navEntry?.activationStart ?? 0;
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/initMetric.js
  var initMetric = (name, value = -1) => {
    const navEntry = getNavigationEntry();
    let navigationType = "navigate";
    if (getBFCacheRestoreTime() >= 0) {
      navigationType = "back-forward-cache";
    } else if (navEntry) {
      if (document.prerendering || getActivationStart() > 0) {
        navigationType = "prerender";
      } else if (document.wasDiscarded) {
        navigationType = "restore";
      } else if (navEntry.type) {
        navigationType = navEntry.type.replace(/_/g, "-");
      }
    }
    const entries = [];
    return {
      name,
      value,
      rating: "good",
      // If needed, will be updated when reported. `const` to keep the type from widening to `string`.
      delta: 0,
      entries,
      id: generateUniqueID(),
      navigationType
    };
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/initUnique.js
  var instanceMap = /* @__PURE__ */ new WeakMap();
  function initUnique(identityObj, ClassObj) {
    if (!instanceMap.get(identityObj)) {
      instanceMap.set(identityObj, new ClassObj());
    }
    return instanceMap.get(identityObj);
  }

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/LayoutShiftManager.js
  var LayoutShiftManager = class {
    _onAfterProcessingUnexpectedShift;
    _sessionValue = 0;
    _sessionEntries = [];
    _processEntry(entry) {
      if (entry.hadRecentInput)
        return;
      const firstSessionEntry = this._sessionEntries[0];
      const lastSessionEntry = this._sessionEntries.at(-1);
      if (this._sessionValue && firstSessionEntry && lastSessionEntry && entry.startTime - lastSessionEntry.startTime < 1e3 && entry.startTime - firstSessionEntry.startTime < 5e3) {
        this._sessionValue += entry.value;
        this._sessionEntries.push(entry);
      } else {
        this._sessionValue = entry.value;
        this._sessionEntries = [entry];
      }
      this._onAfterProcessingUnexpectedShift?.(entry);
    }
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/observe.js
  var observe = (type, callback, opts = {}) => {
    try {
      if (PerformanceObserver.supportedEntryTypes.includes(type)) {
        const po2 = new PerformanceObserver((list) => {
          Promise.resolve().then(() => {
            callback(list.getEntries());
          });
        });
        po2.observe({ type, buffered: true, ...opts });
        return po2;
      }
    } catch {
    }
    return;
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/runOnce.js
  var runOnce = (cb) => {
    let called = false;
    return () => {
      if (!called) {
        cb();
        called = true;
      }
    };
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/getVisibilityWatcher.js
  var firstHiddenTime = -1;
  var onHiddenFunctions = /* @__PURE__ */ new Set();
  var initHiddenTime = () => {
    return document.visibilityState === "hidden" && !document.prerendering ? 0 : Infinity;
  };
  var onVisibilityUpdate = (event) => {
    if (document.visibilityState === "hidden") {
      if (event.type === "visibilitychange") {
        for (const onHiddenFunction of onHiddenFunctions) {
          onHiddenFunction();
        }
      }
      if (!isFinite(firstHiddenTime)) {
        firstHiddenTime = event.type === "visibilitychange" ? event.timeStamp : 0;
        removeEventListener("prerenderingchange", onVisibilityUpdate, true);
      }
    }
  };
  var getVisibilityWatcher = () => {
    if (firstHiddenTime < 0) {
      const activationStart = getActivationStart();
      const firstVisibilityStateHiddenTime = !document.prerendering ? globalThis.performance.getEntriesByType("visibility-state").filter((e) => e.name === "hidden" && e.startTime > activationStart)[0]?.startTime : void 0;
      firstHiddenTime = firstVisibilityStateHiddenTime ?? initHiddenTime();
      addEventListener("visibilitychange", onVisibilityUpdate, true);
      addEventListener("prerenderingchange", onVisibilityUpdate, true);
      onBFCacheRestore(() => {
        setTimeout(() => {
          firstHiddenTime = initHiddenTime();
        });
      });
    }
    return {
      get firstHiddenTime() {
        return firstHiddenTime;
      },
      onHidden(cb) {
        onHiddenFunctions.add(cb);
      }
    };
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/whenActivated.js
  var whenActivated = (callback) => {
    if (document.prerendering) {
      addEventListener("prerenderingchange", () => callback(), true);
    } else {
      callback();
    }
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/onFCP.js
  var FCPThresholds = [1800, 3e3];
  var onFCP = (onReport, opts = {}) => {
    whenActivated(() => {
      const visibilityWatcher = getVisibilityWatcher();
      let metric = initMetric("FCP");
      let report;
      const handleEntries = (entries) => {
        for (const entry of entries) {
          if (entry.name === "first-contentful-paint") {
            po2.disconnect();
            if (entry.startTime < visibilityWatcher.firstHiddenTime) {
              metric.value = Math.max(entry.startTime - getActivationStart(), 0);
              metric.entries.push(entry);
              report(true);
            }
          }
        }
      };
      const po2 = observe("paint", handleEntries);
      if (po2) {
        report = bindReporter(onReport, metric, FCPThresholds, opts.reportAllChanges);
        onBFCacheRestore((event) => {
          metric = initMetric("FCP");
          report = bindReporter(onReport, metric, FCPThresholds, opts.reportAllChanges);
          doubleRAF(() => {
            metric.value = performance.now() - event.timeStamp;
            report(true);
          });
        });
      }
    });
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/onCLS.js
  var CLSThresholds = [0.1, 0.25];
  var onCLS$1 = (onReport, opts = {}) => {
    const visibilityWatcher = getVisibilityWatcher();
    onFCP(runOnce(() => {
      let metric = initMetric("CLS", 0);
      let report;
      const layoutShiftManager = initUnique(opts, LayoutShiftManager);
      const handleEntries = (entries) => {
        for (const entry of entries) {
          layoutShiftManager._processEntry(entry);
        }
        if (layoutShiftManager._sessionValue > metric.value) {
          metric.value = layoutShiftManager._sessionValue;
          metric.entries = layoutShiftManager._sessionEntries;
          report();
        }
      };
      const po2 = observe("layout-shift", handleEntries);
      if (po2) {
        report = bindReporter(onReport, metric, CLSThresholds, opts.reportAllChanges);
        visibilityWatcher.onHidden(() => {
          handleEntries(po2.takeRecords());
          report(true);
        });
        onBFCacheRestore(() => {
          layoutShiftManager._sessionValue = 0;
          metric = initMetric("CLS", 0);
          report = bindReporter(onReport, metric, CLSThresholds, opts.reportAllChanges);
          doubleRAF(() => report());
        });
        setTimeout(report);
      }
    }));
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/polyfills/interactionCountPolyfill.js
  var interactionCountEstimate = 0;
  var minKnownInteractionId = Infinity;
  var maxKnownInteractionId = 0;
  var updateEstimate = (entries) => {
    for (const entry of entries) {
      if (entry.interactionId) {
        minKnownInteractionId = Math.min(minKnownInteractionId, entry.interactionId);
        maxKnownInteractionId = Math.max(maxKnownInteractionId, entry.interactionId);
        interactionCountEstimate = maxKnownInteractionId ? (maxKnownInteractionId - minKnownInteractionId) / 7 + 1 : 0;
      }
    }
  };
  var po;
  var getInteractionCount = () => {
    return po ? interactionCountEstimate : performance.interactionCount ?? 0;
  };
  var initInteractionCountPolyfill = () => {
    if ("interactionCount" in performance || po)
      return;
    po = observe("event", updateEstimate, {
      type: "event",
      buffered: true,
      durationThreshold: 0
    });
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/InteractionManager.js
  var MAX_INTERACTIONS_TO_CONSIDER = 10;
  var prevInteractionCount = 0;
  var getInteractionCountForNavigation = () => {
    return getInteractionCount() - prevInteractionCount;
  };
  var InteractionManager = class {
    /**
     * A list of longest interactions on the page (by latency) sorted so the
     * longest one is first. The list is at most MAX_INTERACTIONS_TO_CONSIDER
     * long.
     */
    _longestInteractionList = [];
    /**
     * A mapping of longest interactions by their interaction ID.
     * This is used for faster lookup.
     */
    _longestInteractionMap = /* @__PURE__ */ new Map();
    _onBeforeProcessingEntry;
    _onAfterProcessingINPCandidate;
    _resetInteractions() {
      prevInteractionCount = getInteractionCount();
      this._longestInteractionList.length = 0;
      this._longestInteractionMap.clear();
    }
    /**
     * Returns the estimated p98 longest interaction based on the stored
     * interaction candidates and the interaction count for the current page.
     */
    _estimateP98LongestInteraction() {
      const candidateInteractionIndex = Math.min(this._longestInteractionList.length - 1, Math.floor(getInteractionCountForNavigation() / 50));
      return this._longestInteractionList[candidateInteractionIndex];
    }
    /**
     * Takes a performance entry and adds it to the list of worst interactions
     * if its duration is long enough to make it among the worst. If the
     * entry is part of an existing interaction, it is merged and the latency
     * and entries list is updated as needed.
     */
    _processEntry(entry) {
      this._onBeforeProcessingEntry?.(entry);
      if (!(entry.interactionId || entry.entryType === "first-input"))
        return;
      const minLongestInteraction = this._longestInteractionList.at(-1);
      let interaction = this._longestInteractionMap.get(entry.interactionId);
      if (interaction || this._longestInteractionList.length < MAX_INTERACTIONS_TO_CONSIDER || // If the above conditions are false, `minLongestInteraction` will be set.
      entry.duration > minLongestInteraction._latency) {
        if (interaction) {
          if (entry.duration > interaction._latency) {
            interaction.entries = [entry];
            interaction._latency = entry.duration;
          } else if (entry.duration === interaction._latency && entry.startTime === interaction.entries[0].startTime) {
            interaction.entries.push(entry);
          }
        } else {
          interaction = {
            id: entry.interactionId,
            entries: [entry],
            _latency: entry.duration
          };
          this._longestInteractionMap.set(interaction.id, interaction);
          this._longestInteractionList.push(interaction);
        }
        this._longestInteractionList.sort((a, b) => b._latency - a._latency);
        if (this._longestInteractionList.length > MAX_INTERACTIONS_TO_CONSIDER) {
          const removedInteractions = this._longestInteractionList.splice(MAX_INTERACTIONS_TO_CONSIDER);
          for (const interaction2 of removedInteractions) {
            this._longestInteractionMap.delete(interaction2.id);
          }
        }
        this._onAfterProcessingINPCandidate?.(interaction);
      }
    }
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/whenIdleOrHidden.js
  var whenIdleOrHidden = (cb) => {
    const rIC = globalThis.requestIdleCallback || setTimeout;
    if (document.visibilityState === "hidden") {
      cb();
    } else {
      cb = runOnce(cb);
      addEventListener("visibilitychange", cb, { once: true, capture: true });
      rIC(() => {
        cb();
        removeEventListener("visibilitychange", cb, { capture: true });
      });
    }
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/onINP.js
  var INPThresholds = [200, 500];
  var DEFAULT_DURATION_THRESHOLD = 40;
  var onINP$1 = (onReport, opts = {}) => {
    if (!(globalThis.PerformanceEventTiming && "interactionId" in PerformanceEventTiming.prototype)) {
      return;
    }
    const visibilityWatcher = getVisibilityWatcher();
    whenActivated(() => {
      initInteractionCountPolyfill();
      let metric = initMetric("INP");
      let report;
      const interactionManager = initUnique(opts, InteractionManager);
      const handleEntries = (entries) => {
        whenIdleOrHidden(() => {
          for (const entry of entries) {
            interactionManager._processEntry(entry);
          }
          const inp = interactionManager._estimateP98LongestInteraction();
          if (inp && inp._latency !== metric.value) {
            metric.value = inp._latency;
            metric.entries = inp.entries;
            report();
          }
        });
      };
      const po2 = observe("event", handleEntries, {
        // Event Timing entries have their durations rounded to the nearest 8ms,
        // so a duration of 40ms would be any event that spans 2.5 or more frames
        // at 60Hz. This threshold is chosen to strike a balance between usefulness
        // and performance. Running this callback for any interaction that spans
        // just one or two frames is likely not worth the insight that could be
        // gained.
        durationThreshold: opts.durationThreshold ?? DEFAULT_DURATION_THRESHOLD
      });
      report = bindReporter(onReport, metric, INPThresholds, opts.reportAllChanges);
      if (po2) {
        po2.observe({ type: "first-input", buffered: true });
        visibilityWatcher.onHidden(() => {
          handleEntries(po2.takeRecords());
          report(true);
        });
        onBFCacheRestore(() => {
          interactionManager._resetInteractions();
          metric = initMetric("INP");
          report = bindReporter(onReport, metric, INPThresholds, opts.reportAllChanges);
        });
      }
    });
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/LCPEntryManager.js
  var LCPEntryManager = class {
    _onBeforeProcessingEntry;
    _processEntry(entry) {
      this._onBeforeProcessingEntry?.(entry);
    }
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/onLCP.js
  var LCPThresholds = [2500, 4e3];
  var onLCP$1 = (onReport, opts = {}) => {
    whenActivated(() => {
      const visibilityWatcher = getVisibilityWatcher();
      let metric = initMetric("LCP");
      let report;
      const lcpEntryManager = initUnique(opts, LCPEntryManager);
      const handleEntries = (entries) => {
        if (!opts.reportAllChanges) {
          entries = entries.slice(-1);
        }
        for (const entry of entries) {
          lcpEntryManager._processEntry(entry);
          if (entry.startTime < visibilityWatcher.firstHiddenTime) {
            metric.value = Math.max(entry.startTime - getActivationStart(), 0);
            metric.entries = [entry];
            report();
          }
        }
      };
      const po2 = observe("largest-contentful-paint", handleEntries);
      if (po2) {
        report = bindReporter(onReport, metric, LCPThresholds, opts.reportAllChanges);
        const stopListening = runOnce(() => {
          handleEntries(po2.takeRecords());
          po2.disconnect();
          report(true);
        });
        const stopListeningWrapper = (event) => {
          if (event.isTrusted) {
            whenIdleOrHidden(stopListening);
            removeEventListener(event.type, stopListeningWrapper, {
              capture: true
            });
          }
        };
        for (const type of ["keydown", "click", "visibilitychange"]) {
          addEventListener(type, stopListeningWrapper, {
            capture: true
          });
        }
        onBFCacheRestore((event) => {
          metric = initMetric("LCP");
          report = bindReporter(onReport, metric, LCPThresholds, opts.reportAllChanges);
          doubleRAF(() => {
            metric.value = performance.now() - event.timeStamp;
            report(true);
          });
        });
      }
    });
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/onTTFB.js
  var TTFBThresholds = [800, 1800];
  var whenReady = (callback) => {
    if (document.prerendering) {
      whenActivated(() => whenReady(callback));
    } else if (document.readyState !== "complete") {
      addEventListener("load", () => whenReady(callback), true);
    } else {
      setTimeout(callback);
    }
  };
  var onTTFB = (onReport, opts = {}) => {
    let metric = initMetric("TTFB");
    let report = bindReporter(onReport, metric, TTFBThresholds, opts.reportAllChanges);
    whenReady(() => {
      const navigationEntry = getNavigationEntry();
      if (navigationEntry) {
        metric.value = Math.max(navigationEntry.responseStart - getActivationStart(), 0);
        metric.entries = [navigationEntry];
        report(true);
        onBFCacheRestore(() => {
          metric = initMetric("TTFB", 0);
          report = bindReporter(onReport, metric, TTFBThresholds, opts.reportAllChanges);
          report(true);
        });
      }
    });
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/attribution/index.js
  var attribution_exports = {};
  __export(attribution_exports, {
    CLSThresholds: () => CLSThresholds,
    FCPThresholds: () => FCPThresholds,
    INPThresholds: () => INPThresholds,
    LCPThresholds: () => LCPThresholds,
    TTFBThresholds: () => TTFBThresholds,
    onCLS: () => onCLS2,
    onFCP: () => onFCP2,
    onINP: () => onINP2,
    onLCP: () => onLCP2,
    onTTFB: () => onTTFB2
  });

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/getLoadState.js
  var getLoadState = (timestamp) => {
    if (document.readyState === "loading") {
      return "loading";
    } else {
      const navigationEntry = getNavigationEntry();
      if (navigationEntry) {
        if (timestamp < navigationEntry.domInteractive) {
          return "loading";
        } else if (navigationEntry.domContentLoadedEventStart === 0 || timestamp < navigationEntry.domContentLoadedEventStart) {
          return "dom-interactive";
        } else if (navigationEntry.domComplete === 0 || timestamp < navigationEntry.domComplete) {
          return "dom-content-loaded";
        }
      }
    }
    return "complete";
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/lib/getSelector.js
  var getName = (node) => {
    const name = node.nodeName;
    return node.nodeType === 1 ? name.toLowerCase() : name.toUpperCase().replace(/^#/, "");
  };
  var MAX_LEN = 100;
  var getSelector = (node) => {
    let sel = "";
    try {
      while (node?.nodeType !== 9) {
        const el = node;
        const part = el.id ? "#" + el.id : [getName(el), ...Array.from(el.classList).sort()].join(".");
        if (sel.length + part.length > MAX_LEN - 1) {
          return sel || part;
        }
        sel = sel ? part + ">" + sel : part;
        if (el.id) {
          break;
        }
        node = el.parentNode;
      }
    } catch {
    }
    return sel;
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/attribution/onCLS.js
  var getLargestLayoutShiftEntry = (entries) => {
    return entries.reduce((a, b) => a.value > b.value ? a : b);
  };
  var getLargestLayoutShiftSource = (sources) => {
    return sources.find((s) => s.node?.nodeType === 1) || sources[0];
  };
  var onCLS2 = (onReport, opts = {}) => {
    opts = Object.assign({}, opts);
    const layoutShiftManager = initUnique(opts, LayoutShiftManager);
    const layoutShiftTargetMap = /* @__PURE__ */ new WeakMap();
    layoutShiftManager._onAfterProcessingUnexpectedShift = (entry) => {
      if (entry?.sources?.length) {
        const largestSource = getLargestLayoutShiftSource(entry.sources);
        const node = largestSource?.node;
        if (node) {
          const customTarget = opts.generateTarget?.(node) ?? getSelector(node);
          layoutShiftTargetMap.set(largestSource, customTarget);
        }
      }
    };
    const attributeCLS = (metric) => {
      let attribution = {};
      if (metric.entries.length) {
        const largestEntry = getLargestLayoutShiftEntry(metric.entries);
        if (largestEntry?.sources?.length) {
          const largestSource = getLargestLayoutShiftSource(largestEntry.sources);
          if (largestSource) {
            attribution = {
              largestShiftTarget: layoutShiftTargetMap.get(largestSource),
              largestShiftTime: largestEntry.startTime,
              largestShiftValue: largestEntry.value,
              largestShiftSource: largestSource,
              largestShiftEntry: largestEntry,
              loadState: getLoadState(largestEntry.startTime)
            };
          }
        }
      }
      const metricWithAttribution = Object.assign(metric, { attribution });
      return metricWithAttribution;
    };
    onCLS$1((metric) => {
      const metricWithAttribution = attributeCLS(metric);
      onReport(metricWithAttribution);
    }, opts);
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/attribution/onFCP.js
  var attributeFCP = (metric) => {
    let attribution = {
      timeToFirstByte: 0,
      firstByteToFCP: metric.value,
      loadState: getLoadState(getBFCacheRestoreTime())
    };
    if (metric.entries.length) {
      const navigationEntry = getNavigationEntry();
      const fcpEntry = metric.entries.at(-1);
      if (navigationEntry) {
        const activationStart = navigationEntry.activationStart || 0;
        const ttfb = Math.max(0, navigationEntry.responseStart - activationStart);
        attribution = {
          timeToFirstByte: ttfb,
          firstByteToFCP: metric.value - ttfb,
          loadState: getLoadState(metric.entries[0].startTime),
          navigationEntry,
          fcpEntry
        };
      }
    }
    const metricWithAttribution = Object.assign(metric, { attribution });
    return metricWithAttribution;
  };
  var onFCP2 = (onReport, opts = {}) => {
    onFCP((metric) => {
      const metricWithAttribution = attributeFCP(metric);
      onReport(metricWithAttribution);
    }, opts);
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/attribution/onINP.js
  var MAX_PREVIOUS_FRAMES = 50;
  var onINP2 = (onReport, opts = {}) => {
    opts = Object.assign({}, opts);
    const interactionManager = initUnique(opts, InteractionManager);
    let pendingLoAFs = [];
    let pendingEntriesGroups = [];
    let latestProcessingEnd = 0;
    const entryToEntriesGroupMap = /* @__PURE__ */ new WeakMap();
    const interactionTargetMap = /* @__PURE__ */ new WeakMap();
    let cleanupPending = false;
    const handleLoAFEntries = (entries) => {
      pendingLoAFs = pendingLoAFs.concat(entries);
      queueCleanup();
    };
    const saveInteractionTarget = (interaction) => {
      if (!interactionTargetMap.get(interaction)) {
        const node = interaction.entries[0].target;
        if (node) {
          const customTarget = opts.generateTarget?.(node) ?? getSelector(node);
          interactionTargetMap.set(interaction, customTarget);
        }
      }
    };
    const groupEntriesByRenderTime = (entry) => {
      const renderTime = entry.startTime + entry.duration;
      let group;
      latestProcessingEnd = Math.max(latestProcessingEnd, entry.processingEnd);
      for (let i = pendingEntriesGroups.length - 1; i >= 0; i--) {
        const potentialGroup = pendingEntriesGroups[i];
        if (Math.abs(renderTime - potentialGroup.renderTime) <= 8) {
          group = potentialGroup;
          group.startTime = Math.min(entry.startTime, group.startTime);
          group.processingStart = Math.min(entry.processingStart, group.processingStart);
          group.processingEnd = Math.max(entry.processingEnd, group.processingEnd);
          group.entries.push(entry);
          break;
        }
      }
      if (!group) {
        group = {
          startTime: entry.startTime,
          processingStart: entry.processingStart,
          processingEnd: entry.processingEnd,
          renderTime,
          entries: [entry]
        };
        pendingEntriesGroups.push(group);
      }
      if (entry.interactionId || entry.entryType === "first-input") {
        entryToEntriesGroupMap.set(entry, group);
      }
      queueCleanup();
    };
    const queueCleanup = () => {
      if (!cleanupPending) {
        whenIdleOrHidden(cleanupEntries);
        cleanupPending = true;
      }
    };
    const cleanupEntries = () => {
      const longestInteractionGroups = interactionManager._longestInteractionList.map((i) => {
        return entryToEntriesGroupMap.get(i.entries[0]);
      });
      const minIndex = pendingEntriesGroups.length - MAX_PREVIOUS_FRAMES;
      pendingEntriesGroups = pendingEntriesGroups.filter((group, index) => {
        if (index >= minIndex)
          return true;
        return longestInteractionGroups.includes(group);
      });
      const loafsToKeep = /* @__PURE__ */ new Set();
      for (const group of pendingEntriesGroups) {
        const loafs = getIntersectingLoAFs(group.startTime, group.processingEnd);
        for (const loaf of loafs) {
          loafsToKeep.add(loaf);
        }
      }
      const prevFrameIndexCutoff = pendingLoAFs.length - 1 - MAX_PREVIOUS_FRAMES;
      pendingLoAFs = pendingLoAFs.filter((loaf, index) => {
        if (loaf.startTime > latestProcessingEnd && index > prevFrameIndexCutoff) {
          return true;
        }
        return loafsToKeep.has(loaf);
      });
      cleanupPending = false;
    };
    async function handleOnEachInteractionCallback(entry) {
      if (!opts.onEachInteraction) {
        return;
      }
      void await Promise.resolve();
      if (!entry.interactionId) {
        return;
      }
      const interaction = attributeINP({
        entries: [entry],
        // The only value we really need for `attributeINP` is `entries`
        // Everything else is included to fill out the type.
        name: "INP",
        rating: "good",
        value: entry.duration,
        delta: entry.duration,
        navigationType: "navigate",
        id: "N/A"
      });
      opts.onEachInteraction(interaction);
    }
    interactionManager._onBeforeProcessingEntry = (entry) => {
      void handleOnEachInteractionCallback(entry);
      groupEntriesByRenderTime(entry);
    };
    interactionManager._onAfterProcessingINPCandidate = saveInteractionTarget;
    const getIntersectingLoAFs = (start, end) => {
      const intersectingLoAFs = [];
      for (const loaf of pendingLoAFs) {
        if (loaf.startTime + loaf.duration < start)
          continue;
        if (loaf.startTime > end)
          break;
        intersectingLoAFs.push(loaf);
      }
      return intersectingLoAFs;
    };
    const attributeLoAFDetails = (attribution) => {
      if (!attribution.longAnimationFrameEntries?.length) {
        return;
      }
      const interactionTime = attribution.interactionTime;
      const inputDelay = attribution.inputDelay;
      const processingDuration = attribution.processingDuration;
      let totalScriptDuration = 0;
      let totalStyleAndLayoutDuration = 0;
      let totalPaintDuration = 0;
      let longestScriptDuration = 0;
      let longestScriptEntry;
      let longestScriptSubpart;
      for (const loafEntry of attribution.longAnimationFrameEntries) {
        totalStyleAndLayoutDuration = totalStyleAndLayoutDuration + loafEntry.startTime + loafEntry.duration - loafEntry.styleAndLayoutStart;
        for (const script of loafEntry.scripts) {
          const scriptEndTime = script.startTime + script.duration;
          if (scriptEndTime < interactionTime) {
            continue;
          }
          const intersectingScriptDuration = scriptEndTime - Math.max(interactionTime, script.startTime);
          const intersectingForceStyleAndLayoutDuration = script.duration ? intersectingScriptDuration / script.duration * script.forcedStyleAndLayoutDuration : 0;
          totalScriptDuration += intersectingScriptDuration - intersectingForceStyleAndLayoutDuration;
          totalStyleAndLayoutDuration += intersectingForceStyleAndLayoutDuration;
          if (intersectingScriptDuration > longestScriptDuration) {
            longestScriptSubpart = script.startTime < interactionTime + inputDelay ? "input-delay" : script.startTime >= interactionTime + inputDelay + processingDuration ? "presentation-delay" : "processing-duration";
            longestScriptEntry = script;
            longestScriptDuration = intersectingScriptDuration;
          }
        }
      }
      const lastLoAF = attribution.longAnimationFrameEntries.at(-1);
      const lastLoAFEndTime = lastLoAF ? lastLoAF.startTime + lastLoAF.duration : 0;
      if (lastLoAFEndTime >= interactionTime + inputDelay + processingDuration) {
        totalPaintDuration = attribution.nextPaintTime - lastLoAFEndTime;
      }
      if (longestScriptEntry && longestScriptSubpart) {
        attribution.longestScript = {
          entry: longestScriptEntry,
          subpart: longestScriptSubpart,
          intersectingDuration: longestScriptDuration
        };
      }
      attribution.totalScriptDuration = totalScriptDuration;
      attribution.totalStyleAndLayoutDuration = totalStyleAndLayoutDuration;
      attribution.totalPaintDuration = totalPaintDuration;
      attribution.totalUnattributedDuration = attribution.nextPaintTime - interactionTime - totalScriptDuration - totalStyleAndLayoutDuration - totalPaintDuration;
    };
    const attributeINP = (metric) => {
      const firstEntry = metric.entries[0];
      const group = entryToEntriesGroupMap.get(firstEntry);
      const processingStart = firstEntry.processingStart;
      const nextPaintTime = Math.max(firstEntry.startTime + firstEntry.duration, processingStart);
      const processingEnd = Math.min(group.processingEnd, nextPaintTime);
      const processedEventEntries = group.entries.sort((a, b) => {
        return a.processingStart - b.processingStart;
      });
      const longAnimationFrameEntries = getIntersectingLoAFs(firstEntry.startTime, processingEnd);
      const interaction = interactionManager._longestInteractionMap.get(firstEntry.interactionId);
      const attribution = {
        // TS flags the next line because `interactionTargetMap.get()` might
        // return `undefined`, but we ignore this assuming the user knows what
        // they are doing.
        interactionTarget: interactionTargetMap.get(interaction),
        interactionType: firstEntry.name.startsWith("key") ? "keyboard" : "pointer",
        interactionTime: firstEntry.startTime,
        nextPaintTime,
        processedEventEntries,
        longAnimationFrameEntries,
        inputDelay: processingStart - firstEntry.startTime,
        processingDuration: processingEnd - processingStart,
        presentationDelay: nextPaintTime - processingEnd,
        loadState: getLoadState(firstEntry.startTime),
        longestScript: void 0,
        totalScriptDuration: void 0,
        totalStyleAndLayoutDuration: void 0,
        totalPaintDuration: void 0,
        totalUnattributedDuration: void 0
      };
      attributeLoAFDetails(attribution);
      const metricWithAttribution = Object.assign(metric, { attribution });
      return metricWithAttribution;
    };
    observe("long-animation-frame", handleLoAFEntries);
    onINP$1((metric) => {
      const metricWithAttribution = attributeINP(metric);
      onReport(metricWithAttribution);
    }, opts);
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/attribution/onLCP.js
  var onLCP2 = (onReport, opts = {}) => {
    opts = Object.assign({}, opts);
    const lcpEntryManager = initUnique(opts, LCPEntryManager);
    const lcpTargetMap = /* @__PURE__ */ new WeakMap();
    lcpEntryManager._onBeforeProcessingEntry = (entry) => {
      const node = entry.element;
      if (node) {
        const customTarget = opts.generateTarget?.(node) ?? getSelector(node);
        lcpTargetMap.set(entry, customTarget);
      }
    };
    const attributeLCP = (metric) => {
      let attribution = {
        timeToFirstByte: 0,
        resourceLoadDelay: 0,
        resourceLoadDuration: 0,
        elementRenderDelay: metric.value
      };
      if (metric.entries.length) {
        const navigationEntry = getNavigationEntry();
        if (navigationEntry) {
          const activationStart = navigationEntry.activationStart || 0;
          const lcpEntry = metric.entries.at(-1);
          const lcpResourceEntry = lcpEntry.url && performance.getEntriesByType("resource").filter((e) => e.name === lcpEntry.url)[0];
          const ttfb = Math.max(0, navigationEntry.responseStart - activationStart);
          const lcpRequestStart = Math.max(
            ttfb,
            // Prefer `requestStart` (if TOA is set), otherwise use `startTime`.
            lcpResourceEntry ? (lcpResourceEntry.requestStart || lcpResourceEntry.startTime) - activationStart : 0
          );
          const lcpResponseEnd = Math.min(
            // Cap at LCP time (videos continue downloading after LCP for example)
            metric.value,
            Math.max(lcpRequestStart, lcpResourceEntry ? lcpResourceEntry.responseEnd - activationStart : 0)
          );
          attribution = {
            target: lcpTargetMap.get(lcpEntry),
            timeToFirstByte: ttfb,
            resourceLoadDelay: lcpRequestStart - ttfb,
            resourceLoadDuration: lcpResponseEnd - lcpRequestStart,
            elementRenderDelay: metric.value - lcpResponseEnd,
            navigationEntry,
            lcpEntry
          };
          if (lcpEntry.url) {
            attribution.url = lcpEntry.url;
          }
          if (lcpResourceEntry) {
            attribution.lcpResourceEntry = lcpResourceEntry;
          }
        }
      }
      const metricWithAttribution = Object.assign(metric, { attribution });
      return metricWithAttribution;
    };
    onLCP$1((metric) => {
      const metricWithAttribution = attributeLCP(metric);
      onReport(metricWithAttribution);
    }, opts);
  };

  // gen/front_end/third_party/web-vitals/package/dist/modules/attribution/onTTFB.js
  var attributeTTFB = (metric) => {
    let attribution = {
      waitingDuration: 0,
      cacheDuration: 0,
      dnsDuration: 0,
      connectionDuration: 0,
      requestDuration: 0
    };
    if (metric.entries.length) {
      const navigationEntry = metric.entries[0];
      const activationStart = navigationEntry.activationStart || 0;
      const waitEnd = Math.max((navigationEntry.workerStart || navigationEntry.fetchStart) - activationStart, 0);
      const dnsStart = Math.max(navigationEntry.domainLookupStart - activationStart, 0);
      const connectStart = Math.max(navigationEntry.connectStart - activationStart, 0);
      const connectEnd = Math.max(navigationEntry.connectEnd - activationStart, 0);
      attribution = {
        waitingDuration: waitEnd,
        cacheDuration: dnsStart - waitEnd,
        // dnsEnd usually equals connectStart but use connectStart over dnsEnd
        // for dnsDuration in case there ever is a gap.
        dnsDuration: connectStart - dnsStart,
        connectionDuration: connectEnd - connectStart,
        // There is often a gap between connectEnd and requestStart. Attribute
        // that to requestDuration so connectionDuration remains 0 for
        // service worker controlled requests were connectStart and connectEnd
        // are the same.
        requestDuration: metric.value - connectEnd,
        navigationEntry
      };
    }
    const metricWithAttribution = Object.assign(metric, { attribution });
    return metricWithAttribution;
  };
  var onTTFB2 = (onReport, opts = {}) => {
    onTTFB((metric) => {
      const metricWithAttribution = attributeTTFB(metric);
      onReport(metricWithAttribution);
    }, opts);
  };

  // Copyright 2024 The Chromium Authors
  // Use of this source code is governed by a BSD-style license that can be
  // found in the LICENSE file.
  function onEachLayoutShift$1(callback) {
      const eventObserver = new PerformanceObserver(list => {
          const entries = list.getEntries().filter((entry) => 'hadRecentInput' in entry);
          for (const entry of entries) {
              if (entry.hadRecentInput) {
                  continue;
              }
              const affectedNodes = entry.sources.map(source => source.node).filter(node => node instanceof Node);
              callback({
                  attribution: {
                      affectedNodes,
                  },
                  entry,
                  value: entry.value,
              });
          }
      });
      eventObserver.observe({
          type: 'layout-shift',
          buffered: true,
      });
  }

  var OnEachLayoutShift = /*#__PURE__*/Object.freeze({
    __proto__: null,
    onEachLayoutShift: onEachLayoutShift$1
  });

  // gen/front_end/models/live-metrics/web-vitals-injected/spec/spec.prebundle.js
  var EVENT_BINDING_NAME = "__chromium_devtools_metrics_reporter";
  var INTERNAL_KILL_SWITCH = "__chromium_devtools_kill_live_metrics";
  var SCRIPTS_PER_LOAF_LIMIT = 10;
  var LOAF_LIMIT = 5;
  function getUniqueLayoutShiftId(entry) {
    return `layout-shift-${entry.value}-${entry.startTime}`;
  }

  // Copyright 2024 The Chromium Authors
  // Use of this source code is governed by a BSD-style license that can be
  // found in the LICENSE file.
  const { onLCP, onCLS, onINP } = attribution_exports;
  const { onEachLayoutShift } = OnEachLayoutShift;
  const windowListeners = [];
  const documentListeners = [];
  const observers = [];
  const originalWindowAddListener = Window.prototype.addEventListener;
  Window.prototype.addEventListener = function (...args) {
      windowListeners.push(args);
      return originalWindowAddListener.call(this, ...args);
  };
  const originalDocumentAddListener = Document.prototype.addEventListener;
  Document.prototype.addEventListener = function (...args) {
      documentListeners.push(args);
      return originalDocumentAddListener.call(this, ...args);
  };
  class InternalPerformanceObserver extends PerformanceObserver {
      constructor(...args) {
          super(...args);
          observers.push(this);
      }
  }
  globalThis.PerformanceObserver = InternalPerformanceObserver;
  let killed = false;
  /**
   * This is a hack solution to remove any listeners that were added by web-vitals.js
   * or additional services in this bundle. Once this function is called, the execution
   * context should be considered dead and a new one will need to be created for live metrics
   * to be served again.
   */
  window[INTERNAL_KILL_SWITCH] = () => {
      if (killed) {
          return;
      }
      for (const observer of observers) {
          observer.disconnect();
      }
      for (const args of windowListeners) {
          window.removeEventListener(...args);
      }
      for (const args of documentListeners) {
          document.removeEventListener(...args);
      }
      killed = true;
  };
  function sendEventToDevTools(event) {
      const payload = JSON.stringify(event);
      window[EVENT_BINDING_NAME](payload);
  }
  const nodeList = [];
  function establishNodeIndex(node) {
      const index = nodeList.length;
      nodeList.push(new WeakRef(node));
      return index;
  }
  /**
   * The data sent over the event binding needs to be JSON serializable, so we
   * can't send DOM nodes directly. Instead we create an ID for each node (see
   * `establishNodeIndex`) that we can later use to retrieve a remote object
   * for that node.
   *
   * This function is used by `Runtime.evaluate` calls to get a remote object
   * for the specified index.
   */
  window.getNodeForIndex = (index) => {
      return nodeList[index].deref();
  };
  function limitScripts(loafs) {
      return loafs.map(loaf => {
          const longestScripts = [];
          for (const script of loaf.scripts) {
              if (longestScripts.length < SCRIPTS_PER_LOAF_LIMIT) {
                  longestScripts.push(script);
                  continue;
              }
              const shorterIndex = longestScripts.findIndex(s => s.duration < script.duration);
              if (shorterIndex === -1) {
                  continue;
              }
              longestScripts[shorterIndex] = script;
          }
          longestScripts.sort((a, b) => a.startTime - b.startTime);
          loaf.scripts = longestScripts;
          return loaf;
      });
  }
  function isPrerendered() {
      if (document.prerendering) {
          return true;
      }
      const firstNavStart = self.performance.getEntriesByType?.('navigation')[0]?.activationStart;
      return firstNavStart !== undefined && firstNavStart > 0;
  }
  let startedHidden = null;
  function initialize() {
      sendEventToDevTools({ name: 'reset' });
      new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
              if (startedHidden === null && !isPrerendered()) {
                  startedHidden = entry.name === 'hidden';
              }
          }
      }).observe({ type: 'visibility-state', buffered: true });
      // We want to treat bfcache navigations like a standard navigations, so emit
      // a reset event when bfcache is restored.
      //
      // Metric functions will also re-emit their values using this listener's callback.
      // To ensure this event is fired before those values are emitted, register this
      // callback before any others.
      onBFCacheRestore(() => {
          startedHidden = false;
          sendEventToDevTools({ name: 'reset' });
      });
      onLCP(metric => {
          const event = {
              name: 'LCP',
              value: metric.value,
              startedHidden: Boolean(startedHidden),
              phases: {
                  timeToFirstByte: metric.attribution.timeToFirstByte,
                  resourceLoadDelay: metric.attribution.resourceLoadDelay,
                  resourceLoadTime: metric.attribution.resourceLoadDuration,
                  elementRenderDelay: metric.attribution.elementRenderDelay,
              },
          };
          const element = metric.attribution.lcpEntry?.element;
          if (element) {
              event.nodeIndex = establishNodeIndex(element);
          }
          sendEventToDevTools(event);
      }, { reportAllChanges: true });
      onCLS(metric => {
          const event = {
              name: 'CLS',
              value: metric.value,
              clusterShiftIds: metric.entries.map(getUniqueLayoutShiftId),
          };
          sendEventToDevTools(event);
      }, { reportAllChanges: true });
      function onEachInteraction(interaction) {
          // Multiple `InteractionEntry` events can be emitted for the same `uniqueInteractionId`
          // However, it is easier to combine these entries in the DevTools client rather than in
          // this injected code.
          const event = {
              name: 'InteractionEntry',
              duration: interaction.value,
              phases: {
                  inputDelay: interaction.attribution.inputDelay,
                  processingDuration: interaction.attribution.processingDuration,
                  presentationDelay: interaction.attribution.presentationDelay,
              },
              startTime: interaction.entries[0].startTime,
              entryGroupId: interaction.entries[0].interactionId,
              nextPaintTime: interaction.attribution.nextPaintTime,
              interactionType: interaction.attribution.interactionType,
              eventName: interaction.entries[0].name,
              // To limit the amount of events, just get the last 5 LoAFs
              longAnimationFrameEntries: limitScripts(interaction.attribution.longAnimationFrameEntries.slice(-LOAF_LIMIT).map(loaf => loaf.toJSON())),
          };
          const target = interaction.attribution.interactionTarget;
          if (target) {
              event.nodeIndex = Number(target);
          }
          sendEventToDevTools(event);
      }
      onINP(metric => {
          const event = {
              name: 'INP',
              value: metric.value,
              phases: {
                  inputDelay: metric.attribution.inputDelay,
                  processingDuration: metric.attribution.processingDuration,
                  presentationDelay: metric.attribution.presentationDelay,
              },
              startTime: metric.entries[0].startTime,
              entryGroupId: metric.entries[0].interactionId,
              interactionType: metric.attribution.interactionType,
          };
          sendEventToDevTools(event);
      }, {
          reportAllChanges: true,
          durationThreshold: 0,
          onEachInteraction,
          generateTarget(el) {
              if (el) {
                  return String(establishNodeIndex(el));
              }
              return undefined;
          },
      });
      onEachLayoutShift(layoutShift => {
          const event = {
              name: 'LayoutShift',
              score: layoutShift.value,
              uniqueLayoutShiftId: getUniqueLayoutShiftId(layoutShift.entry),
              affectedNodeIndices: layoutShift.attribution.affectedNodes.map(establishNodeIndex),
          };
          sendEventToDevTools(event);
      });
  }
  initialize();

})();
