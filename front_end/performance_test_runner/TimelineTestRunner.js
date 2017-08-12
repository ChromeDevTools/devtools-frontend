// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

PerformanceTestRunner.timelinePropertyFormatters = {
  children: 'formatAsTypeName',
  endTime: 'formatAsTypeName',
  requestId: 'formatAsTypeName',
  startTime: 'formatAsTypeName',
  stackTrace: 'formatAsTypeName',
  url: 'formatAsURL',
  scriptName: 'formatAsTypeName',
  scriptId: 'formatAsTypeName',
  usedHeapSizeDelta: 'skip',
  mimeType: 'formatAsTypeName',
  id: 'formatAsTypeName',
  timerId: 'formatAsTypeName',
  scriptLine: 'formatAsTypeName',
  layerId: 'formatAsTypeName',
  lineNumber: 'formatAsTypeName',
  columnNumber: 'formatAsTypeName',
  frameId: 'formatAsTypeName',
  frame: 'formatAsTypeName',
  page: 'formatAsTypeName',
  encodedDataLength: 'formatAsTypeName',
  identifier: 'formatAsTypeName',
  clip: 'formatAsTypeName',
  root: 'formatAsTypeName',
  backendNodeId: 'formatAsTypeName',
  nodeId: 'formatAsTypeName',
  rootNode: 'formatAsTypeName',
  finishTime: 'formatAsTypeName',
  thread: 'formatAsTypeName',
  allottedMilliseconds: 'formatAsTypeName',
  timedOut: 'formatAsTypeName',
  networkTime: 'formatAsTypeName'
};

PerformanceTestRunner.InvalidationFormatters = {
  _tracingEvent: 'skip',
  cause: 'formatAsInvalidationCause',
  frame: 'skip',
  invalidatedSelectorId: 'skip',
  invalidationList: 'skip',
  invalidationSet: 'skip',
  linkedRecalcStyleEvent: 'skip',
  linkedLayoutEvent: 'skip',
  nodeId: 'skip',
  paintId: 'skip',
  startTime: 'skip'
};

TestRunner.formatters.formatAsInvalidationCause = function(cause) {
  if (!cause)
    return '<undefined>';

  var stackTrace;

  if (cause.stackTrace && cause.stackTrace.length) {
    stackTrace =
        TestRunner.formatters.formatAsURL(cause.stackTrace[0].url) + ':' + (cause.stackTrace[0].lineNumber + 1);
  }

  return '{reason: ' + cause.reason + ', stackTrace: ' + stackTrace + '}';
};

PerformanceTestRunner.createTracingModel = function(events) {
  var model = new SDK.TracingModel(new Bindings.TempFileBackingStorage('tracing'));
  model.addEvents(events);
  model.tracingComplete();
  return model;
};

PerformanceTestRunner.tracingModel = function() {
  return UI.panels.timeline._performanceModel.tracingModel();
};

PerformanceTestRunner.invokeWithTracing = function(functionName, callback, additionalCategories, enableJSSampling) {
  var categories =
      '-*,disabled-by-default-devtools.timeline*,devtools.timeline,' + SDK.TracingModel.TopLevelEventCategory;

  if (additionalCategories)
    categories += ',' + additionalCategories;

  var timelinePanel = UI.panels.timeline;
  var timelineController = PerformanceTestRunner.timelineController();
  timelinePanel._timelineController = timelineController;
  timelineController._startRecordingWithCategories(categories, enableJSSampling).then(tracingStarted);

  function tracingStarted() {
    timelinePanel._recordingStarted();
    TestRunner.callFunctionInPageAsync(functionName).then(onPageActionsDone);
  }

  function onPageActionsDone() {
    PerformanceTestRunner.runWhenTimelineIsReady(callback);
    timelineController.stopRecording();
  }
};

PerformanceTestRunner.performanceModel = function() {
  return UI.panels.timeline._performanceModel;
};

PerformanceTestRunner.timelineModel = function() {
  return PerformanceTestRunner.performanceModel().timelineModel();
};

PerformanceTestRunner.timelineFrameModel = function() {
  return PerformanceTestRunner.performanceModel().frameModel();
};

PerformanceTestRunner.createPerformanceModelWithEvents = function(events) {
  var tracingModel = new SDK.TracingModel(new Bindings.TempFileBackingStorage('tracing'));
  tracingModel.addEvents(events);
  tracingModel.tracingComplete();
  var performanceModel = new Timeline.PerformanceModel();
  performanceModel.setTracingModel(tracingModel);
  return performanceModel;
};

PerformanceTestRunner.timelineController = function() {
  var performanceModel = new Timeline.PerformanceModel();
  UI.panels.timeline._pendingPerformanceModel = performanceModel;
  return new Timeline.TimelineController(TestRunner.tracingManager, performanceModel, UI.panels.timeline);
};

PerformanceTestRunner.runWhenTimelineIsReady = function(callback) {
  TestRunner.addSniffer(UI.panels.timeline, 'loadingComplete', () => callback());
};

PerformanceTestRunner.startTimeline = function(callback) {
  var panel = UI.panels.timeline;
  TestRunner.addSniffer(panel, '_recordingStarted', callback);
  panel._toggleRecording();
};

PerformanceTestRunner.stopTimeline = function(callback) {
  PerformanceTestRunner.runWhenTimelineIsReady(callback);
  UI.panels.timeline._toggleRecording();
};

PerformanceTestRunner.evaluateWithTimeline = function(actions, doneCallback) {
  PerformanceTestRunner.startTimeline(step1);

  function step1() {
    TestRunner.evaluateInPage(actions, step2);
  }

  function step2() {
    PerformanceTestRunner.stopTimeline(doneCallback);
  }
};

PerformanceTestRunner.invokeAsyncWithTimeline = function(functionName, doneCallback) {
  PerformanceTestRunner.startTimeline(step1);

  function step1() {
    TestRunner.callFunctionInPageAsync(functionName).then(step2);
  }

  function step2() {
    PerformanceTestRunner.stopTimeline(TestRunner.safeWrap(doneCallback));
  }
};

PerformanceTestRunner.performActionsAndPrint = function(actions, typeName, includeTimeStamps) {
  function callback() {
    PerformanceTestRunner.printTimelineRecordsWithDetails(typeName);

    if (includeTimeStamps) {
      TestRunner.addResult('Timestamp records: ');
      PerformanceTestRunner.printTimestampRecords(typeName);
    }

    TestRunner.completeTest();
  }

  PerformanceTestRunner.evaluateWithTimeline(actions, callback);
};

PerformanceTestRunner.printTimelineRecords = function(name) {
  for (let event of PerformanceTestRunner.timelineModel().mainThreadEvents()) {
    if (event.name === name)
      PerformanceTestRunner.printTraceEventProperties(event);
  }
};

PerformanceTestRunner.printTimelineRecordsWithDetails = function(name) {
  for (let event of PerformanceTestRunner.timelineModel().mainThreadEvents()) {
    if (name === event.name)
      PerformanceTestRunner.printTraceEventPropertiesWithDetails(event);
  }
};

PerformanceTestRunner.walkTimelineEventTree = function(callback) {
  var performanceModel = PerformanceTestRunner.performanceModel();
  var view = new Timeline.EventsTimelineTreeView(UI.panels.timeline._filters, null);
  view.setModel(performanceModel);
  var selection = Timeline.TimelineSelection.fromRange(
      performanceModel.timelineModel().minimumRecordTime(), performanceModel.timelineModel().maximumRecordTime());
  view.updateContents(selection);
  PerformanceTestRunner.walkTimelineEventTreeUnderNode(callback, view._currentTree, 0);
};

PerformanceTestRunner.walkTimelineEventTreeUnderNode = function(callback, root, level) {
  var event = root.event;

  if (event)
    callback(event, level);

  for (var child of root.children().values())
    PerformanceTestRunner.walkTimelineEventTreeUnderNode(callback, child, (level || 0) + 1);
};

PerformanceTestRunner.printTimestampRecords = function(typeName) {
  var dividers = PerformanceTestRunner.timelineModel().eventDividers();

  for (var event of dividers) {
    if (event.name === typeName)
      PerformanceTestRunner.printTraceEventProperties(event);
  }
};

PerformanceTestRunner.forAllEvents = function(events, callback) {
  let eventStack = [];

  for (let event of events) {
    while (eventStack.length && eventStack.peekLast().endTime <= event.startTime)
      eventStack.pop();

    callback(event, eventStack);

    if (event.endTime)
      eventStack.push(event);
  }
};

PerformanceTestRunner.printTraceEventProperties = function(traceEvent) {
  TestRunner.addResult(traceEvent.name + ' Properties:');
  var data = traceEvent.args['beginData'] || traceEvent.args['data'];
  var frameId = data && data['frame'];

  var object = {
    data: traceEvent.args['data'] || traceEvent.args,
    endTime: traceEvent.endTime || traceEvent.startTime,
    frameId: frameId,
    stackTrace: TimelineModel.TimelineData.forEvent(traceEvent).stackTrace,
    startTime: traceEvent.startTime,
    type: traceEvent.name
  };

  for (var field in object) {
    if (object[field] === null || object[field] === undefined)
      delete object[field];
  }

  TestRunner.addObject(object, PerformanceTestRunner.timelinePropertyFormatters);
};

PerformanceTestRunner.printTraceEventPropertiesWithDetails = function(event) {
  PerformanceTestRunner.printTraceEventProperties(event);
  const details = Timeline.TimelineUIUtils.buildDetailsTextForTraceEvent(
      event, SDK.targetManager.mainTarget(), new Components.Linkifier());
  TestRunner.addResult(`Text details for ${event.name}: ${details}`);

  if (TimelineModel.TimelineData.forEvent(event).warning)
    TestRunner.addResult(`${event.name} has a warning`);
};

PerformanceTestRunner.findTimelineEvent = function(name, index) {
  return PerformanceTestRunner.timelineModel().mainThreadEvents().filter(e => e.name === name)[index || 0];
};

PerformanceTestRunner.findChildEvent = function(events, parentIndex, name) {
  var endTime = events[parentIndex].endTime;

  for (var i = parentIndex + 1; i < events.length && (!events[i].endTime || events[i].endTime <= endTime); ++i) {
    if (events[i].name === name)
      return events[i];
  }

  return null;
};

PerformanceTestRunner.dumpFrame = function(frame) {
  var fieldsToDump = [
    'cpuTime', 'duration', 'startTime', 'endTime', 'id', 'mainThreadFrameId', 'timeByCategory', 'other', 'scripting',
    'painting', 'rendering', 'committedFrom', 'idle'
  ];

  function formatFields(object) {
    var result = {};

    for (var key in object) {
      if (fieldsToDump.indexOf(key) < 0)
        continue;

      var value = object[key];

      if (typeof value === 'number')
        value = Number(value.toFixed(7));
      else if (typeof value === 'object' && value)
        value = formatFields(value);

      result[key] = value;
    }

    return result;
  }

  TestRunner.addObject(formatFields(frame));
};

PerformanceTestRunner.dumpInvalidations = function(recordType, index, comment) {
  var event = PerformanceTestRunner.findTimelineEvent(recordType, index || 0);

  TestRunner.addArray(
      TimelineModel.InvalidationTracker.invalidationEventsFor(event), PerformanceTestRunner.InvalidationFormatters, '',
      comment);
};

PerformanceTestRunner.dumpFlameChartProvider = function(provider, includeGroups) {
  var includeGroupsSet = includeGroups && new Set(includeGroups);
  var timelineData = provider.timelineData();
  var stackDepth = provider.maxStackDepth();
  var entriesByLevel = new Multimap();

  for (let i = 0; i < timelineData.entryLevels.length; ++i)
    entriesByLevel.set(timelineData.entryLevels[i], i);

  for (let groupIndex = 0; groupIndex < timelineData.groups.length; ++groupIndex) {
    const group = timelineData.groups[groupIndex];

    if (includeGroupsSet && !includeGroupsSet.has(group.name))
      continue;

    var maxLevel =
        (groupIndex + 1 < timelineData.groups.length ? timelineData.groups[groupIndex + 1].firstLevel : stackDepth);
    TestRunner.addResult(`Group: ${group.name}`);

    for (let level = group.startLevel; level < maxLevel; ++level) {
      TestRunner.addResult(`Level ${level - group.startLevel}`);
      var entries = entriesByLevel.get(level);

      for (const index of entries) {
        const title = provider.entryTitle(index);
        const color = provider.entryColor(index);
        TestRunner.addResult(`${title} (${color})`);
      }
    }
  }
};

PerformanceTestRunner.dumpTimelineFlameChart = function(includeGroups) {
  const provider = UI.panels.timeline._flameChart._mainDataProvider;
  TestRunner.addResult('Timeline Flame Chart');
  PerformanceTestRunner.dumpFlameChartProvider(provider, includeGroups);
};

PerformanceTestRunner.loadTimeline = function(timelineData) {
  var promise = new Promise(fulfill => PerformanceTestRunner.runWhenTimelineIsReady(fulfill));

  UI.panels.timeline._loadFromFile(new Blob([timelineData], {type: 'text/plain'}));

  return promise;
};

(async function() {
  await TestRunner.evaluateInPagePromise(`
    function wrapCallFunctionForTimeline(f) {
      var script = document.createElement('script');
      script.textContent = '(' + f.toString() + ')()\n//# sourceURL=wrapCallFunctionForTimeline.js';
      document.body.appendChild(script);
    }

    function generateFrames(count) {
      var promise = Promise.resolve();

      for (let i = count; i > 0; --i)
        promise = promise.then(changeBackgroundAndWaitForFrame.bind(null, i));

      return promise;

      function changeBackgroundAndWaitForFrame(i) {
        document.body.style.backgroundColor = (i & 1 ? 'rgb(200, 200, 200)' : 'rgb(240, 240, 240)');
        return waitForFrame();
      }
    }

    function waitForFrame() {
      var callback;
      var promise = new Promise(fulfill => callback = fulfill);

      if (window.testRunner)
        testRunner.capturePixelsAsyncThen(() => window.requestAnimationFrame(callback));
      else
        window.requestAnimationFrame(callback);

      return promise;
    }
  `);
})();
