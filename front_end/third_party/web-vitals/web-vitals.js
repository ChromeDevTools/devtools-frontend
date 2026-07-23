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
  requestAnimationFrame(() => requestAnimationFrame(cb));
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
  return getNavigationEntry()?.activationStart ?? 0;
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
var getVisibilityWatcher = (reset = false) => {
  if (reset) {
    firstHiddenTime = Infinity;
  }
  if (firstHiddenTime < 0) {
    const activationStart = getActivationStart();
    const firstVisibilityStateHiddenTime = !document.prerendering ? globalThis.performance.getEntriesByType("visibility-state").find((e) => e.name === "hidden" && e.startTime >= activationStart)?.startTime : void 0;
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

// gen/front_end/third_party/web-vitals/package/dist/modules/lib/generateUniqueID.js
var generateUniqueID = () => {
  return `v6-${Date.now()}-${Math.floor(Math.random() * (9e12 - 1)) + 1e12}`;
};

// gen/front_end/third_party/web-vitals/package/dist/modules/lib/initMetric.js
var initMetric = (name, value = -1, navigationType, navigationId = 0, navigationInteractionId, navigationURL, navigationStartTime) => {
  const hardNavEntry = getNavigationEntry();
  const hardNavId = hardNavEntry?.navigationId || 0;
  let _navigationType = "navigate";
  if (navigationType) {
    _navigationType = navigationType;
  } else if (getBFCacheRestoreTime() >= 0) {
    _navigationType = "back-forward-cache";
  } else if (hardNavEntry) {
    if (document.prerendering || getActivationStart() > 0) {
      _navigationType = "prerender";
    } else if (document.wasDiscarded) {
      _navigationType = "restore";
    } else if (hardNavEntry.type) {
      _navigationType = hardNavEntry.type.replace(/_/g, "-");
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
    navigationType: _navigationType,
    navigationId: navigationId || hardNavId,
    navigationInteractionId,
    navigationURL: navigationURL || hardNavEntry?.name,
    navigationStartTime: navigationStartTime || 0
  };
};

// gen/front_end/third_party/web-vitals/package/dist/modules/lib/initUnique.js
var instanceMap = /* @__PURE__ */ new WeakMap();
function initUnique(identityObj, ClassObj) {
  let classInstances = instanceMap.get(ClassObj);
  if (!classInstances) {
    classInstances = /* @__PURE__ */ new WeakMap();
    instanceMap.set(ClassObj, classInstances);
  }
  if (!classInstances.get(identityObj)) {
    classInstances.set(identityObj, new ClassObj());
  }
  return classInstances.get(identityObj);
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
var observe = (types, callback, opts = {}) => {
  try {
    const supportedTypes = types.filter((t) => PerformanceObserver.supportedEntryTypes.includes(t));
    if (supportedTypes.length > 0) {
      const po2 = new PerformanceObserver((list) => {
        queueMicrotask(() => {
          const entries = list.getEntries();
          if (supportedTypes.length > 1) {
            entries.sort((a, b) => {
              const scoreA = a.startTime + a.duration;
              const scoreB = b.startTime + b.duration;
              return scoreA - scoreB;
            });
          }
          callback(entries);
        });
      });
      for (const t of supportedTypes) {
        po2.observe({ type: t, buffered: true, ...opts });
      }
      return po2;
    }
  } catch {
  }
  return;
};

// gen/front_end/third_party/web-vitals/package/dist/modules/lib/softNavs.js
var checkSoftNavsEnabled = (opts) => {
  return PerformanceObserver.supportedEntryTypes.includes("soft-navigation") && // Older implementations expose the value as an attribute rather than the
  // method. We only support the newer method as that was what was launched
  // to stable unflagged.
  typeof globalThis.PerformanceSoftNavigation?.prototype?.getLargestInteractionContentfulPaint === "function" && opts && opts.reportSoftNavs;
};
var storeSoftNavEntry = (map, entry) => {
  map.set(entry.navigationId, entry);
  if (map.size > 2) {
    const firstKey = map.keys().next().value;
    if (firstKey !== void 0) {
      map.delete(firstKey);
    }
  }
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

// gen/front_end/third_party/web-vitals/package/dist/modules/lib/FCPEntryManager.js
var FCPEntryManager = class {
  _softNavigationEntryMap;
};

// gen/front_end/third_party/web-vitals/package/dist/modules/lib/whenActivated.js
var whenActivated = (callback) => {
  if (document.prerendering) {
    addEventListener("prerenderingchange", callback, true);
  } else {
    callback();
  }
};

// gen/front_end/third_party/web-vitals/package/dist/modules/onFCP.js
var FCPThresholds = [1800, 3e3];
var onFCP = (onReport, opts = {}) => {
  const softNavsEnabled = checkSoftNavsEnabled(opts);
  whenActivated(() => {
    const fcpEntryManager = initUnique(opts, FCPEntryManager);
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
            metric.navigationId = entry.navigationId || metric.navigationId;
            report(true);
          }
        }
      }
    };
    const po2 = observe(["paint"], handleEntries);
    if (po2) {
      report = bindReporter(onReport, metric, FCPThresholds, opts.reportAllChanges);
      onBFCacheRestore((event) => {
        metric = initMetric("FCP", -1, "back-forward-cache", metric.navigationId, metric.navigationInteractionId, metric.navigationURL, getBFCacheRestoreTime());
        report = bindReporter(onReport, metric, FCPThresholds, opts.reportAllChanges);
        doubleRAF(() => {
          metric.value = performance.now() - event.timeStamp;
          report(true);
        });
      });
    }
    if (softNavsEnabled) {
      const handleSoftNavEntries = (entries) => {
        entries.forEach((entry) => {
          if (fcpEntryManager._softNavigationEntryMap && entry.navigationId) {
            storeSoftNavEntry(fcpEntryManager._softNavigationEntryMap, entry);
          }
          const FCPTime = Math.max((entry.presentationTime || entry.paintTime || 0) - entry.startTime, 0);
          metric = initMetric("FCP", FCPTime, "soft-navigation", entry.navigationId, entry.interactionId, entry.name, entry.startTime);
          report = bindReporter(onReport, metric, FCPThresholds, opts.reportAllChanges);
          report(true);
        });
      };
      observe(["soft-navigation"], handleSoftNavEntries, opts);
    }
  });
};

// gen/front_end/third_party/web-vitals/package/dist/modules/onCLS.js
var CLSThresholds = [0.1, 0.25];
var onCLS = (onReport, opts = {}) => {
  const visibilityWatcher = getVisibilityWatcher();
  onFCP(runOnce(() => {
    let metric = initMetric("CLS", 0);
    let report;
    const layoutShiftManager = initUnique(opts, LayoutShiftManager);
    const initNewCLSMetric = (navigationType, navigationId, navigationInteractionId, navigationURL, navigationStartTime) => {
      metric = initMetric("CLS", 0, navigationType, navigationId, navigationInteractionId, navigationURL, navigationStartTime);
      layoutShiftManager._sessionValue = 0;
      report = bindReporter(onReport, metric, CLSThresholds, opts.reportAllChanges);
    };
    const updateAndReportMetric = (forceReport = false) => {
      if (layoutShiftManager._sessionValue > metric.value) {
        metric.value = layoutShiftManager._sessionValue;
        metric.entries = layoutShiftManager._sessionEntries;
      }
      report(forceReport);
    };
    const handleSoftNavEntry = (entry) => {
      updateAndReportMetric(true);
      initNewCLSMetric("soft-navigation", entry.navigationId, entry.interactionId, entry.name, entry.startTime);
    };
    const handleEntries = (entries) => {
      for (const entry of entries) {
        if (entry.entryType === "soft-navigation") {
          handleSoftNavEntry(entry);
          continue;
        }
        layoutShiftManager._processEntry(entry);
      }
      updateAndReportMetric();
    };
    const types = ["layout-shift"];
    if (checkSoftNavsEnabled(opts)) {
      types.push("soft-navigation");
    }
    const po2 = observe(types, handleEntries);
    if (po2) {
      report = bindReporter(onReport, metric, CLSThresholds, opts.reportAllChanges);
      visibilityWatcher.onHidden(() => {
        handleEntries(po2.takeRecords());
        report(true);
      });
      onBFCacheRestore(() => {
        initNewCLSMetric("back-forward-cache", metric.navigationId, metric.navigationInteractionId, metric.navigationURL, getBFCacheRestoreTime());
        doubleRAF(report);
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
  po = observe(["event"], updateEstimate, {
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
  _estimateP98LongestInteraction(navigationType) {
    const interactionCountForNavigation = getInteractionCountForNavigation();
    const candidateInteractionIndex = Math.min(this._longestInteractionList.length - 1, Math.floor(interactionCountForNavigation / 50));
    if (interactionCountForNavigation && candidateInteractionIndex === -1 && (navigationType === "soft-navigation" || navigationType === "back-forward-cache")) {
      return {
        _latency: 8,
        id: -1,
        entries: []
      };
    }
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
  const timeout = "requestIdleCallback" in globalThis ? 1e3 : 0;
  const rIC = globalThis.requestIdleCallback || setTimeout;
  const cIC = globalThis.cancelIdleCallback || clearTimeout;
  if (document.visibilityState === "hidden") {
    cb();
  } else {
    const wrappedCb = runOnce(cb);
    let idleHandle = -1;
    const onHidden = () => {
      cIC(idleHandle);
      wrappedCb();
    };
    addEventListener("visibilitychange", onHidden, { once: true, capture: true });
    idleHandle = rIC(() => {
      removeEventListener("visibilitychange", onHidden, { capture: true });
      wrappedCb();
    }, { timeout });
  }
};

// gen/front_end/third_party/web-vitals/package/dist/modules/onINP.js
var INPThresholds = [200, 500];
var DEFAULT_DURATION_THRESHOLD = 40;
var onINP = (onReport, opts = {}) => {
  if (!(globalThis.PerformanceEventTiming && "interactionId" in PerformanceEventTiming.prototype)) {
    return;
  }
  const visibilityWatcher = getVisibilityWatcher();
  whenActivated(() => {
    initInteractionCountPolyfill();
    let metric = initMetric("INP");
    let report;
    const interactionManager = initUnique(opts, InteractionManager);
    const initNewINPMetric = (navigationType, navigationId, navigationInteractionId, navigationURL, navigationStartTime) => {
      interactionManager._resetInteractions();
      metric = initMetric("INP", -1, navigationType, navigationId, navigationInteractionId, navigationURL, navigationStartTime);
      report = bindReporter(onReport, metric, INPThresholds, opts.reportAllChanges);
    };
    const updateINPMetric = () => {
      const inp = interactionManager._estimateP98LongestInteraction(metric.navigationType);
      if (inp && inp._latency !== metric.value) {
        metric.value = inp._latency;
        metric.entries = inp.entries;
        report();
      }
    };
    const handleSoftNavEntry = (entry) => {
      updateINPMetric();
      report(true);
      initNewINPMetric("soft-navigation", entry.navigationId, entry.interactionId, entry.name, entry.startTime);
    };
    const handleEntries = (entries, forceReport = false) => {
      whenIdleOrHidden(() => {
        for (const entry of entries) {
          if (entry.entryType === "soft-navigation") {
            handleSoftNavEntry(entry);
            continue;
          }
          interactionManager._processEntry(entry);
        }
        updateINPMetric();
        if (forceReport) {
          report(true);
        }
      });
    };
    const types = ["event", "first-input"];
    if (checkSoftNavsEnabled(opts)) {
      types.push("soft-navigation");
    }
    const po2 = observe(types, handleEntries, {
      ...opts,
      durationThreshold: opts.durationThreshold ?? DEFAULT_DURATION_THRESHOLD
    });
    report = bindReporter(onReport, metric, INPThresholds, opts.reportAllChanges);
    if (po2) {
      visibilityWatcher.onHidden(() => {
        handleEntries(po2.takeRecords(), true);
      });
      onBFCacheRestore(() => {
        initNewINPMetric("back-forward-cache", metric.navigationId, metric.navigationInteractionId, metric.navigationURL, getBFCacheRestoreTime());
      });
    }
  });
};

// gen/front_end/third_party/web-vitals/package/dist/modules/lib/LCPEntryManager.js
var LCPEntryManager = class {
  _onBeforeProcessingEntry;
  _softNavigationEntryMap;
  _processEntry(entry) {
    this._onBeforeProcessingEntry?.(entry);
  }
};

// gen/front_end/third_party/web-vitals/package/dist/modules/onLCP.js
var LCPThresholds = [2500, 4e3];
var onLCP = (onReport, opts = {}) => {
  let isFinalized = false;
  const softNavsEnabled = checkSoftNavsEnabled(opts);
  whenActivated(() => {
    let visibilityWatcher = getVisibilityWatcher();
    let metric = initMetric("LCP");
    let report;
    const lcpEntryManager = initUnique(opts, LCPEntryManager);
    const initNewLCPMetric = (navigation, navigationId, navigationInteractionId, navigationURL, navigationStartTime) => {
      metric = initMetric("LCP", -1, navigation, navigationId, navigationInteractionId, navigationURL, navigationStartTime);
      report = bindReporter(onReport, metric, LCPThresholds, opts.reportAllChanges);
      isFinalized = false;
      if (navigation === "soft-navigation") {
        visibilityWatcher = getVisibilityWatcher(true);
      }
    };
    const handleSoftNavEntry = (entry) => {
      if (lcpEntryManager._softNavigationEntryMap && entry.navigationId) {
        storeSoftNavEntry(lcpEntryManager._softNavigationEntryMap, entry);
      }
      if (!isFinalized)
        report(true);
      initNewLCPMetric("soft-navigation", entry.navigationId, entry.interactionId, entry.name, entry.startTime);
      const largestInteractionContentfulPaint = entry.getLargestInteractionContentfulPaint?.();
      if (largestInteractionContentfulPaint) {
        handleEntries([largestInteractionContentfulPaint]);
      }
    };
    const handleEntries = (entries) => {
      if (!opts.reportAllChanges && !softNavsEnabled) {
        entries = entries.slice(-1);
      }
      for (const entry of entries) {
        if (!entry)
          continue;
        if (entry.entryType === "soft-navigation") {
          handleSoftNavEntry(entry);
          continue;
        }
        let value = 0;
        let metricEntries = [];
        let renderTime = entry.startTime;
        if (entry.entryType === "largest-contentful-paint") {
          value = Math.max(entry.startTime - getActivationStart(), 0);
          lcpEntryManager._processEntry(entry);
          metricEntries = [entry];
        } else if (entry.entryType === "interaction-contentful-paint") {
          const ICPEntry = entry;
          if (!metric.navigationId)
            continue;
          if ("interactionId" in ICPEntry && ICPEntry.interactionId != metric.navigationInteractionId) {
            continue;
          }
          renderTime = ICPEntry.largestContentfulPaint?.renderTime || 0;
          value = Math.max(renderTime - entry.startTime, 0);
          if (ICPEntry.largestContentfulPaint) {
            lcpEntryManager._processEntry(ICPEntry.largestContentfulPaint);
            metricEntries = [ICPEntry.largestContentfulPaint];
          }
        }
        if (renderTime < visibilityWatcher.firstHiddenTime) {
          metric.value = value;
          metric.entries = metricEntries;
          report();
        }
      }
    };
    const types = ["largest-contentful-paint"];
    if (softNavsEnabled) {
      types.push("interaction-contentful-paint", "soft-navigation");
    }
    const po2 = observe(types, handleEntries);
    if (po2) {
      report = bindReporter(onReport, metric, LCPThresholds, opts.reportAllChanges);
      const finalizeEventTypes = ["keydown", "click", "visibilitychange"];
      const finalizeLCP = (event) => {
        if (event.isTrusted && !isFinalized) {
          const metricIdToFinalize = metric.id;
          whenIdleOrHidden(() => {
            if (!isFinalized) {
              if (!softNavsEnabled) {
                po2.disconnect();
                for (const type of finalizeEventTypes) {
                  removeEventListener(type, finalizeLCP, { capture: true });
                }
              }
              if (metricIdToFinalize === metric.id) {
                isFinalized = true;
                report(true);
              }
            }
          });
        }
      };
      for (const type of finalizeEventTypes) {
        addEventListener(type, finalizeLCP, {
          capture: true
        });
      }
      onBFCacheRestore((event) => {
        initNewLCPMetric("back-forward-cache", metric.navigationId, metric.navigationInteractionId, metric.navigationURL, getBFCacheRestoreTime());
        report = bindReporter(onReport, metric, LCPThresholds, opts.reportAllChanges);
        doubleRAF(() => {
          metric.value = performance.now() - event.timeStamp;
          isFinalized = true;
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
  const softNavsEnabled = checkSoftNavsEnabled(opts);
  let metric = initMetric("TTFB");
  let report = bindReporter(onReport, metric, TTFBThresholds, opts.reportAllChanges);
  whenReady(() => {
    const hardNavEntry = getNavigationEntry();
    if (hardNavEntry) {
      const responseStart = hardNavEntry.responseStart;
      metric.value = Math.max(responseStart - getActivationStart(), 0);
      metric.entries = [hardNavEntry];
      report(true);
      onBFCacheRestore(() => {
        metric = initMetric("TTFB", 0, "back-forward-cache", metric.navigationId, metric.navigationInteractionId, metric.navigationURL, getBFCacheRestoreTime());
        report = bindReporter(onReport, metric, TTFBThresholds, opts.reportAllChanges);
        report(true);
      });
      if (softNavsEnabled) {
        const reportSoftNavTTFBs = (entries) => {
          entries.forEach((entry) => {
            if (entry.navigationId) {
              metric = initMetric("TTFB", 0, "soft-navigation", entry.navigationId, entry.interactionId, entry.name, entry.startTime);
              metric.entries = [entry];
              report = bindReporter(onReport, metric, TTFBThresholds, opts.reportAllChanges);
              report(true);
            }
          });
        };
        observe(["soft-navigation"], reportSoftNavTTFBs, opts);
      }
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
  }
  const hardNavEntry = getNavigationEntry();
  if (hardNavEntry) {
    if (timestamp < hardNavEntry.domInteractive) {
      return "loading";
    } else if (hardNavEntry.domContentLoadedEventStart === 0 || timestamp < hardNavEntry.domContentLoadedEventStart) {
      return "dom-interactive";
    } else if (hardNavEntry.domComplete === 0 || timestamp < hardNavEntry.domComplete) {
      return "dom-content-loaded";
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
      const part = el.id ? "#" + el.id : [getName(el), ...Array.from(el.classList ?? []).sort()].join(".");
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
    return Object.assign(metric, { attribution });
  };
  onCLS((metric) => {
    onReport(attributeCLS(metric));
  }, opts);
};

// gen/front_end/third_party/web-vitals/package/dist/modules/attribution/onFCP.js
var onFCP2 = (onReport, opts = {}) => {
  opts = Object.assign({}, opts);
  const fcpEntryManager = initUnique(opts, FCPEntryManager);
  if (checkSoftNavsEnabled(opts)) {
    fcpEntryManager._softNavigationEntryMap = /* @__PURE__ */ new Map();
  }
  const attributeFCP = (metric) => {
    let attribution = {
      timeToFirstByte: 0,
      firstByteToFCP: metric.value,
      loadState: getLoadState(getBFCacheRestoreTime())
    };
    if (metric.navigationType !== "soft-navigation") {
      if (metric.entries.length) {
        const navigationEntry = getNavigationEntry();
        const fcpEntry = metric.entries.at(-1);
        if (navigationEntry) {
          const responseStart = navigationEntry.responseStart;
          const activationStart = navigationEntry.activationStart || 0;
          const ttfb = Math.max(0, responseStart - activationStart);
          attribution = {
            timeToFirstByte: ttfb,
            firstByteToFCP: metric.value - ttfb,
            loadState: getLoadState(metric.entries[0].startTime),
            navigationEntry,
            fcpEntry
          };
        }
      }
    } else {
      const navigationEntry = fcpEntryManager._softNavigationEntryMap?.get(metric.navigationId);
      if (navigationEntry) {
        attribution = {
          timeToFirstByte: 0,
          firstByteToFCP: metric.value,
          loadState: "complete",
          navigationEntry
        };
      }
    }
    const metricWithAttribution = Object.assign(metric, { attribution });
    return metricWithAttribution;
  };
  onFCP((metric) => {
    onReport(attributeFCP(metric));
  }, opts);
};

// gen/front_end/third_party/web-vitals/package/dist/modules/attribution/onINP.js
var MAX_PENDING_FRAMES = 10;
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
      const node = interaction.entries.find((e) => e.target)?.target;
      if (node) {
        const customTarget = opts.generateTarget?.(node) ?? getSelector(node);
        interactionTargetMap.set(interaction, customTarget);
      } else {
        const selector = interaction.entries.find((e) => e.targetSelector)?.targetSelector;
        if (selector) {
          interactionTargetMap.set(interaction, selector);
        }
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
        if (opts.includeProcessedEventEntries) {
          group.entries.push(entry);
        }
        break;
      }
    }
    if (!group) {
      group = {
        startTime: entry.startTime,
        processingStart: entry.processingStart,
        processingEnd: entry.processingEnd,
        renderTime,
        // processedEventEntries can be quite large, so only include them if
        // the user explicitly requests them (default is to include).
        entries: opts.includeProcessedEventEntries ? [entry] : []
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
    const longestInteractionGroups = new Set(interactionManager._longestInteractionList.map((i) => {
      return entryToEntriesGroupMap.get(i.entries[0]);
    }));
    const minIndexToKeep = pendingEntriesGroups.length - MAX_PENDING_FRAMES;
    pendingEntriesGroups = pendingEntriesGroups.filter((group, i) => {
      return i >= minIndexToKeep || longestInteractionGroups.has(group);
    });
    const intersectingLoAFs = /* @__PURE__ */ new Set();
    for (const group of pendingEntriesGroups) {
      const loafs = getIntersectingLoAFs(group.startTime, group.processingEnd);
      for (const loaf of loafs) {
        intersectingLoAFs.add(loaf);
      }
    }
    pendingLoAFs = pendingLoAFs.filter((loaf) => {
      return (
        // Compare times first because it's faster.
        loaf.startTime > latestProcessingEnd || intersectingLoAFs.has(loaf)
      );
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
      navigationId: entry.navigationId,
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
    const interactionTime = attribution.interactionTime;
    const nextPaintTime = attribution.nextPaintTime;
    if (!attribution.longAnimationFrameEntries?.length || !interactionTime || !nextPaintTime) {
      return;
    }
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
      totalPaintDuration = nextPaintTime - lastLoAFEndTime;
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
    attribution.totalUnattributedDuration = nextPaintTime - interactionTime - totalScriptDuration - totalStyleAndLayoutDuration - totalPaintDuration;
  };
  const attributeINP = (metric) => {
    if (metric.entries.length === 0) {
      const navStartTime = metric.navigationStartTime || 0;
      const attribution2 = {
        processedEventEntries: [],
        longAnimationFrameEntries: [],
        inputDelay: 0,
        processingDuration: 0,
        presentationDelay: metric.value,
        loadState: getLoadState(navStartTime)
      };
      return Object.assign(metric, { attribution: attribution2 });
    }
    const firstEntry = metric.entries[0];
    const group = entryToEntriesGroupMap.get(firstEntry);
    const processingStart = group.processingStart;
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
    return Object.assign(metric, { attribution });
  };
  observe(["long-animation-frame"], handleLoAFEntries, opts);
  onINP((metric) => {
    onReport(attributeINP(metric));
  }, opts);
};

// gen/front_end/third_party/web-vitals/package/dist/modules/attribution/onLCP.js
var onLCP2 = (onReport, opts = {}) => {
  opts = Object.assign({}, opts);
  const lcpEntryManager = initUnique(opts, LCPEntryManager);
  const lcpTargetMap = /* @__PURE__ */ new WeakMap();
  if (checkSoftNavsEnabled(opts)) {
    lcpEntryManager._softNavigationEntryMap = /* @__PURE__ */ new Map();
  }
  lcpEntryManager._onBeforeProcessingEntry = (entry) => {
    const node = entry.element;
    if (node) {
      const customTarget = opts.generateTarget?.(node) ?? getSelector(node);
      lcpTargetMap.set(entry, customTarget);
    } else if (entry.id) {
      lcpTargetMap.set(entry, `#${entry.id}`);
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
      const lcpEntry = metric.entries.at(-1);
      const lcpResourceEntry = lcpEntry.url && performance.getEntriesByType("resource").find((e) => e.name === lcpEntry.url);
      attribution.target = lcpTargetMap.get(lcpEntry);
      attribution.lcpEntry = lcpEntry;
      if (lcpEntry.url) {
        attribution.url = lcpEntry.url;
      }
      if (lcpResourceEntry) {
        attribution.lcpResourceEntry = lcpResourceEntry;
      }
      let navigationEntry;
      let activationStart = 0;
      let responseStart = 0;
      if (metric.navigationType !== "soft-navigation") {
        navigationEntry = getNavigationEntry();
        activationStart = navigationEntry?.activationStart ?? 0;
        responseStart = navigationEntry?.responseStart ?? 0;
      } else {
        activationStart = metric.navigationStartTime || 0;
        navigationEntry = lcpEntryManager._softNavigationEntryMap?.get(metric.navigationId);
      }
      if (navigationEntry) {
        const ttfb = Math.max(0, responseStart - activationStart);
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
          ...attribution,
          timeToFirstByte: ttfb,
          resourceLoadDelay: lcpRequestStart - ttfb,
          resourceLoadDuration: lcpResponseEnd - lcpRequestStart,
          elementRenderDelay: metric.value - lcpResponseEnd,
          navigationEntry
        };
      }
    }
    return Object.assign(metric, { attribution });
  };
  onLCP((metric) => {
    onReport(attributeLCP(metric));
  }, opts);
};

// gen/front_end/third_party/web-vitals/package/dist/modules/attribution/onTTFB.js
var attributeTTFB = (metric) => {
  const navigationEntry = metric.entries[0];
  let attribution = {
    waitingDuration: 0,
    cacheDuration: 0,
    dnsDuration: 0,
    connectionDuration: 0,
    requestDuration: 0,
    // There should only be one instance per TTFB metric
    navigationEntry
  };
  if (metric.entries.length) {
    if (navigationEntry instanceof PerformanceNavigationTiming) {
      const activationStart = navigationEntry.activationStart || 0;
      const waitEnd = Math.max((navigationEntry.workerStart || navigationEntry.fetchStart || 0) - activationStart, 0);
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
  }
  const metricWithAttribution = Object.assign(metric, { attribution });
  return metricWithAttribution;
};
var onTTFB2 = (onReport, opts = {}) => {
  onTTFB((metric) => {
    onReport(attributeTTFB(metric));
  }, opts);
};
export {
  attribution_exports as Attribution,
  CLSThresholds,
  FCPThresholds,
  INPThresholds,
  LCPThresholds,
  TTFBThresholds,
  onBFCacheRestore,
  onCLS,
  onFCP,
  onINP,
  onLCP,
  onTTFB
};
//# sourceMappingURL=web-vitals.js.map
