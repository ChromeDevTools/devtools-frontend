// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

SourcesTestRunner.BreakpointManager = {};

SourcesTestRunner.createWorkspace = function() {
  SourcesTestRunner.testTargetManager = new SDK.TargetManager();
  SourcesTestRunner.testWorkspace = new Workspace.Workspace();
  SourcesTestRunner.testNetworkProjectManager =
      new Bindings.NetworkProjectManager(SourcesTestRunner.testTargetManager, SourcesTestRunner.testWorkspace);
  SourcesTestRunner.testResourceMapping =
      new Bindings.ResourceMapping(SourcesTestRunner.testTargetManager, SourcesTestRunner.testWorkspace);
  SourcesTestRunner.testDebuggerWorkspaceBinding =
      new Bindings.DebuggerWorkspaceBinding(SourcesTestRunner.testTargetManager, SourcesTestRunner.testWorkspace);
  Bindings.resourceMapping = SourcesTestRunner.testResourceMapping;
};

function resourceMappingModelInfoForTarget(target) {
  var resourceTreeModel = target.model(SDK.ResourceTreeModel);
  var binding = (resourceTreeModel ? SourcesTestRunner.testResourceMapping._modelToInfo.get(resourceTreeModel) : null);
  return binding;
}

SourcesTestRunner.createMockTarget = function(id) {
  var capabilities = SDK.Target.Capability.AllForTests;

  var target = SourcesTestRunner.testTargetManager.createTarget(
      'mock-target-id-' + id, 'mock-target-' + id, capabilities & ~SDK.Target.Capability.JS,
      params => new SDK.StubConnection(params), null);

  SourcesTestRunner.testNetworkProject = Bindings.NetworkProject.forTarget(target);
  SourcesTestRunner.testResourceMappingModelInfo = resourceMappingModelInfoForTarget(target);
  target._capabilitiesMask = capabilities;
  target._inspectedURL = TestRunner.mainTarget.inspectedURL();
  target.resourceTreeModel = target.model(SDK.ResourceTreeModel);
  target.resourceTreeModel._cachedResourcesProcessed = true;
  target.resourceTreeModel._frameAttached('42', 0);
  target.runtimeModel = target.model(SDK.RuntimeModel);
  target.debuggerModel = new SourcesTestRunner.DebuggerModelMock(target);
  target._modelByConstructor.set(SDK.DebuggerModel, target.debuggerModel);
  SourcesTestRunner.testTargetManager.modelAdded(target, SDK.DebuggerModel, target.debuggerModel);
  return target;
};

SourcesTestRunner.uiSourceCodes = {};

SourcesTestRunner.initializeDefaultMappingOnTarget = function(target) {
  var defaultMapping = {
    rawLocationToUILocation: function(rawLocation) {
      return null;
    },

    uiLocationToRawLocation: function(uiSourceCode, lineNumber) {
      if (!SourcesTestRunner.uiSourceCodes[uiSourceCode.url()])
        return null;

      return new SDK.DebuggerModel.Location(target.debuggerModel, uiSourceCode.url(), lineNumber, 0);
    },

    isIdentity: function() {
      return true;
    }
  };

  target.defaultMapping = defaultMapping;
};

SourcesTestRunner.DebuggerModelMock = class extends SDK.SDKModel {
  sourceMapManager() {
    return this._sourceMapManager;
  }

  constructor(target) {
    super(target);
    this._sourceMapManager = new SDK.SourceMapManager();
    this._target = target;
    this._breakpointResolvedEventTarget = new Common.Object();
    this._scripts = {};
    this._breakpoints = {};
    this._debuggerWorkspaceBinding = SourcesTestRunner.testDebuggerWorkspaceBinding;
  }

  target() {
    return this._target;
  }

  runtimeModel() {
    return this._target.runtimeModel;
  }

  setBeforePausedCallback(callback) {
  }

  debuggerEnabled() {
    return true;
  }

  scriptsForSourceURL(url) {
    var script = this._scriptForURL(url);
    return (script ? [script] : []);
  }

  _addScript(scriptId, url) {
    var script = new SDK.Script(this, scriptId, url);
    this._scripts[scriptId] = script;
    var modelData = this._debuggerWorkspaceBinding._debuggerModelToData.get(this);

    modelData._defaultMapping._parsedScriptSource({data: script});

    modelData._resourceMapping._parsedScriptSource({data: script});
  }

  _scriptForURL(url) {
    for (var scriptId in this._scripts) {
      var script = this._scripts[scriptId];

      if (script.sourceURL === url)
        return script;
    }
  }

  _scheduleSetBeakpointCallback(breakpointId, locations) {
    setTimeout(innerCallback.bind(this), 0);

    function innerCallback() {
      if (window.setBreakpointCallback) {
        var savedCallback = window.setBreakpointCallback;
        delete window.setBreakpointCallback;
        savedCallback();
      }
    }
  }

  createRawLocation(script, line, column) {
    return new SDK.DebuggerModel.Location(this, script.scriptId, line, column);
  }

  createRawLocationByURL(url, line, column) {
    var script = this._scriptForURL(url);

    if (!script)
      return null;

    return new SDK.DebuggerModel.Location(this, script.scriptId, line, column);
  }

  setBreakpointByURL(url, lineNumber, columnNumber, condition) {
    TestRunner.addResult('    debuggerModel.setBreakpoint(' + [url, lineNumber, condition].join(':') + ')');
    var breakpointId = url + ':' + lineNumber;

    if (this._breakpoints[breakpointId]) {
      this._scheduleSetBeakpointCallback(null);
      return {breakpointId: null, locations: []};
    }

    this._breakpoints[breakpointId] = true;

    if (lineNumber >= 2000) {
      this._scheduleSetBeakpointCallback(breakpointId, []);
      return {breakpointId: breakpointId, locations: []};
    }

    if (lineNumber >= 1000) {
      var shiftedLocation = new SDK.DebuggerModel.Location(this, url, lineNumber + 10, columnNumber);
      this._scheduleSetBeakpointCallback(breakpointId, [shiftedLocation]);
      return {breakpointId: breakpointId, locations: [shiftedLocation]};
    }

    var locations = [];
    var script = this._scriptForURL(url);

    if (script) {
      var location = new SDK.DebuggerModel.Location(this, script.scriptId, lineNumber, 0);
      locations.push(location);
    }

    this._scheduleSetBeakpointCallback(breakpointId, locations);
    return {breakpointId: breakpointId, locations: locations};
  }

  async removeBreakpoint(breakpointId) {
    TestRunner.addResult('    debuggerModel.removeBreakpoint(' + breakpointId + ')');
    delete this._breakpoints[breakpointId];
  }

  setBreakpointsActive() {
  }

  scriptForId(scriptId) {
    return this._scripts[scriptId];
  }

  reset() {
    TestRunner.addResult('  Resetting debugger.');
    this._scripts = {};
    this._debuggerWorkspaceBinding._reset(this);
  }

  addBreakpointListener(breakpointId, listener, thisObject) {
    this._breakpointResolvedEventTarget.addEventListener(breakpointId, listener, thisObject);
  }

  removeBreakpointListener(breakpointId, listener, thisObject) {
    this._breakpointResolvedEventTarget.removeEventListener(breakpointId, listener, thisObject);
  }

  _breakpointResolved(breakpointId, location) {
    this._breakpointResolvedEventTarget.dispatchEventToListeners(breakpointId, location);
  }
};

SourcesTestRunner.setupLiveLocationSniffers = function() {
  TestRunner.addSniffer(Bindings.DebuggerWorkspaceBinding.prototype, 'createLiveLocation', function(rawLocation) {
    TestRunner.addResult('    Location created: ' + rawLocation.scriptId + ':' + rawLocation.lineNumber);
  }, true);

  TestRunner.addSniffer(Bindings.DebuggerWorkspaceBinding.Location.prototype, 'dispose', function() {
    TestRunner.addResult('    Location disposed: ' + this._rawLocation.scriptId + ':' + this._rawLocation.lineNumber);
  }, true);
};

SourcesTestRunner.addScript = function(target, breakpointManager, url) {
  target.debuggerModel._addScript(url, url);
  TestRunner.addResult('  Adding script: ' + url);
};

SourcesTestRunner.addUISourceCode = function(target, breakpointManager, url, doNotSetSourceMapping, doNotAddScript) {
  if (!doNotAddScript)
    SourcesTestRunner.addScript(target, breakpointManager, url);

  TestRunner.addResult('  Adding UISourceCode: ' + url);
  var resourceMappingModelInfo = resourceMappingModelInfoForTarget(target);

  if (resourceMappingModelInfo._bindings.has(url)) {
    resourceMappingModelInfo._bindings.get(url).dispose();
    resourceMappingModelInfo._bindings.delete(url);
  }

  var resource =
      new SDK.Resource(target, null, url, url, '', '', Common.resourceTypes.Document, 'text/html', null, null);

  resourceMappingModelInfo._resourceAdded({data: resource});

  uiSourceCode = SourcesTestRunner.testWorkspace.uiSourceCodeForURL(url);
  SourcesTestRunner.uiSourceCodes[url] = uiSourceCode;

  if (!doNotSetSourceMapping)
    breakpointManager._debuggerWorkspaceBinding.updateLocations(target.debuggerModel.scriptForId(url));


  return uiSourceCode;
};

SourcesTestRunner.createBreakpointManager = function(targetManager, debuggerWorkspaceBinding, persistentBreakpoints) {
  SourcesTestRunner._pendingBreakpointUpdates = 0;
  TestRunner.addSniffer(
      Bindings.BreakpointManager.ModelBreakpoint.prototype, '_updateInDebugger', updateInDebugger, true);
  TestRunner.addSniffer(
      Bindings.BreakpointManager.ModelBreakpoint.prototype, '_didUpdateInDebugger', didUpdateInDebugger, true);

  function updateInDebugger() {
    SourcesTestRunner._pendingBreakpointUpdates++;
  }

  function didUpdateInDebugger() {
    SourcesTestRunner._pendingBreakpointUpdates--;
    SourcesTestRunner._notifyAfterBreakpointUpdate();
  }

  persistentBreakpoints = persistentBreakpoints || [];

  var setting = {
    get: function() {
      return persistentBreakpoints;
    },

    set: function(breakpoints) {
      persistentBreakpoints = breakpoints;
    }
  };

  function breakpointAdded(event) {
    var breakpoint = event.data.breakpoint;
    var uiLocation = event.data.uiLocation;

    TestRunner.addResult('    breakpointAdded(' + [
      uiLocation.uiSourceCode.url(), uiLocation.lineNumber, uiLocation.columnNumber, breakpoint.condition(),
      breakpoint.enabled()
    ].join(', ') + ')');
  }

  function breakpointRemoved(event) {
    var uiLocation = event.data.uiLocation;

    TestRunner.addResult('    breakpointRemoved(' + [
      uiLocation.uiSourceCode.url(), uiLocation.lineNumber, uiLocation.columnNumber
    ].join(', ') + ')');
  }

  var targets = targetManager.targets();
  var mappingForManager;

  for (var i = 0; i < targets.length; ++i) {
    SourcesTestRunner.initializeDefaultMappingOnTarget(targets[i]);

    if (!mappingForManager)
      mappingForManager = targets[i].defaultMapping;
  }

  var breakpointManager = new Bindings.BreakpointManager(
      setting, debuggerWorkspaceBinding._workspace, targetManager, debuggerWorkspaceBinding);
  breakpointManager.defaultMapping = mappingForManager;
  breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointAdded, breakpointAdded);
  breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointRemoved, breakpointRemoved);
  TestRunner.addResult('  Created breakpoints manager');
  SourcesTestRunner.dumpBreakpointStorage(breakpointManager);
  return breakpointManager;
};

SourcesTestRunner.BreakpointManager.setBreakpoint = function(
    breakpointManager, uiSourceCode, lineNumber, columnNumber, condition, enabled, setBreakpointCallback) {
  TestRunner.addResult(
      '  Setting breakpoint at ' + uiSourceCode.url() + ':' + lineNumber + ':' + columnNumber + ' enabled:' + enabled +
      ' condition:' + condition);

  if (setBreakpointCallback)
    window.setBreakpointCallback = setBreakpointCallback;
  return breakpointManager.setBreakpoint(uiSourceCode, lineNumber, columnNumber, condition, enabled);
};

SourcesTestRunner.BreakpointManager.removeBreakpoint = function(
    breakpointManager, uiSourceCode, lineNumber, columnNumber) {
  TestRunner.addResult('  Removing breakpoint at ' + uiSourceCode.url() + ':' + lineNumber + ':' + columnNumber);
  breakpointManager.findBreakpoint(uiSourceCode, lineNumber, columnNumber).remove();
};

SourcesTestRunner.dumpBreakpointStorage = function(breakpointManager) {
  var breakpoints = breakpointManager._storage._setting.get();
  TestRunner.addResult('  Dumping Storage');

  for (var i = 0; i < breakpoints.length; ++i) {
    TestRunner.addResult(
        '    ' + breakpoints[i].url + ':' + breakpoints[i].lineNumber + ' enabled:' + breakpoints[i].enabled +
        ' condition:' + breakpoints[i].condition);
  }
};

SourcesTestRunner.dumpBreakpointLocations = function(breakpointManager) {
  var allBreakpointLocations = breakpointManager.allBreakpointLocations();
  TestRunner.addResult('  Dumping Breakpoint Locations');
  var lastUISourceCode = null;
  var locations = [];

  function dumpLocations(uiSourceCode, locations) {
    locations.sort(function(a, b) {
      return a.lineNumber - b.lineNumber;
    });

    TestRunner.addResult('    UISourceCode (url=\'' + uiSourceCode.url() + '\', uri=\'' + uiSourceCode.url() + '\')');

    for (var i = 0; i < locations.length; ++i)
      TestRunner.addResult('      Location: (' + locations[i].lineNumber + ', ' + locations[i].columnNumber + ')');
  }

  for (var i = 0; i < allBreakpointLocations.length; ++i) {
    var uiLocation = allBreakpointLocations[i].uiLocation;
    var uiSourceCode = uiLocation.uiSourceCode;

    if (lastUISourceCode && lastUISourceCode !== uiSourceCode) {
      dumpLocations(uiSourceCode, locations);
      locations = [];
    }

    lastUISourceCode = uiSourceCode;
    locations.push(uiLocation);
  }

  if (lastUISourceCode)
    dumpLocations(lastUISourceCode, locations);
};

SourcesTestRunner.resetBreakpointManager = function(breakpointManager, next) {
  TestRunner.addResult('  Resetting breakpoint manager');
  breakpointManager.removeAllBreakpoints();
  breakpointManager.removeProvisionalBreakpointsForTest();
  SourcesTestRunner.uiSourceCodes = {};
  next();
};

SourcesTestRunner.runAfterPendingBreakpointUpdates = function(breakpointManager, callback) {
  SourcesTestRunner._pendingBreakpointUpdatesCallback = callback;
  SourcesTestRunner._notifyAfterBreakpointUpdate();
};

SourcesTestRunner._notifyAfterBreakpointUpdate = function() {
  if (!SourcesTestRunner._pendingBreakpointUpdates && SourcesTestRunner._pendingBreakpointUpdatesCallback) {
    var callback = SourcesTestRunner._pendingBreakpointUpdatesCallback;
    delete SourcesTestRunner._pendingBreakpointUpdatesCallback;
    callback();
  }
};

SourcesTestRunner.finishBreakpointTest = function(breakpointManager, next) {
  SourcesTestRunner.runAfterPendingBreakpointUpdates(breakpointManager, dump);

  function dump() {
    SourcesTestRunner.dumpBreakpointLocations(breakpointManager);
    SourcesTestRunner.dumpBreakpointStorage(breakpointManager);
    SourcesTestRunner.runAfterPendingBreakpointUpdates(breakpointManager, reset);
  }

  function reset() {
    SourcesTestRunner.resetBreakpointManager(breakpointManager, didReset);
  }

  function didReset() {
    SourcesTestRunner.runAfterPendingBreakpointUpdates(breakpointManager, finish);
  }

  function finish() {
    SourcesTestRunner.dumpBreakpointLocations(breakpointManager);
    next();
  }
};
