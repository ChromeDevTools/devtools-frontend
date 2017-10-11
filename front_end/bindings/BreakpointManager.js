/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @unrestricted
 * @implements {SDK.SDKModelObserver<!SDK.DebuggerModel>}
 */
Bindings.BreakpointManager = class extends Common.Object {
  /**
   * @param {?Common.Setting} breakpointsSetting
   * @param {!Workspace.Workspace} workspace
   * @param {!SDK.TargetManager} targetManager
   * @param {!Bindings.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   */
  constructor(breakpointsSetting, workspace, targetManager, debuggerWorkspaceBinding) {
    super();
    this._storage = new Bindings.BreakpointManager.Storage(this, breakpointsSetting);
    this._workspace = workspace;
    this._targetManager = targetManager;
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    this._breakpointsActive = true;
    /** @type {!Map<!Workspace.UISourceCode, !Map<number, !Map<number, !Array<!Bindings.BreakpointManager.Breakpoint>>>>} */
    this._breakpointsForUISourceCode = new Map();
    /** @type {!Map<!Workspace.UISourceCode, !Array<!Bindings.BreakpointManager.Breakpoint>>} */
    this._breakpointsForPrimaryUISourceCode = new Map();
    /** @type {!Multimap.<string, !Bindings.BreakpointManager.Breakpoint>} */
    this._provisionalBreakpoints = new Multimap();

    this._workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this._projectRemoved, this);
    this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);

    targetManager.observeModels(SDK.DebuggerModel, this);
  }

  /**
   * @param {string} url
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {string}
   */
  static _breakpointStorageId(url, lineNumber, columnNumber) {
    if (!url)
      return '';
    return url + ':' + lineNumber + ':' + columnNumber;
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  modelAdded(debuggerModel) {
    if (!this._breakpointsActive)
      debuggerModel.setBreakpointsActive(this._breakpointsActive);
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  modelRemoved(debuggerModel) {
  }

  /**
   * @param {string} url
   * @return {!Map.<string, !Bindings.BreakpointManager.Breakpoint>}
   */
  _provisionalBreakpointsForURL(url) {
    var result = new Map();
    var breakpoints = this._provisionalBreakpoints.get(url).valuesArray();
    for (var i = 0; i < breakpoints.length; ++i)
      result.set(breakpoints[i]._breakpointStorageId(), breakpoints[i]);
    return result;
  }

  /**
   * @param {string} fromURL
   * @param {!Workspace.UISourceCode} toSourceCode
   */
  copyBreakpoints(fromURL, toSourceCode) {
    var breakpointItems = this._storage.breakpointItems(fromURL);
    for (var item of breakpointItems)
      this.setBreakpoint(toSourceCode, item.lineNumber, item.columnNumber, item.condition, item.enabled);
    // Since we can not have two provisional breakpoints which point to the same url, remove one of them.
    if (fromURL === toSourceCode.url()) {
      var provisionalBreakpoints = this._provisionalBreakpointsForURL(fromURL);
      for (var breakpoint of provisionalBreakpoints.values())
        breakpoint.remove();
    }
  }

  removeProvisionalBreakpointsForTest() {
    var breakpoints = this._provisionalBreakpoints.valuesArray();
    for (var i = 0; i < breakpoints.length; ++i)
      breakpoints[i].remove();
    this._provisionalBreakpoints.clear();
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _restoreBreakpoints(uiSourceCode) {
    var url = uiSourceCode.url();
    if (!url)
      return;

    this._storage.mute();
    var breakpointItems = this._storage.breakpointItems(url);
    var provisionalBreakpoints = this._provisionalBreakpointsForURL(url);
    for (var i = 0; i < breakpointItems.length; ++i) {
      var breakpointItem = breakpointItems[i];
      var itemStorageId = Bindings.BreakpointManager._breakpointStorageId(
          breakpointItem.url, breakpointItem.lineNumber, breakpointItem.columnNumber);
      var provisionalBreakpoint = provisionalBreakpoints.get(itemStorageId);
      if (provisionalBreakpoint) {
        if (!this._breakpointsForPrimaryUISourceCode.get(uiSourceCode))
          this._breakpointsForPrimaryUISourceCode.set(uiSourceCode, []);
        this._breakpointsForPrimaryUISourceCode.get(uiSourceCode).push(provisionalBreakpoint);
        provisionalBreakpoint._updateBreakpoint();
      } else {
        this._innerSetBreakpoint(
            uiSourceCode, breakpointItem.lineNumber, breakpointItem.columnNumber, breakpointItem.condition,
            breakpointItem.enabled);
      }
    }
    this._provisionalBreakpoints.deleteAll(url);
    this._storage.unmute();
  }

  /**
   * @param {!Common.Event} event
   */
  _uiSourceCodeAdded(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    this._restoreBreakpoints(uiSourceCode);
  }

  /**
   * @param {!Common.Event} event
   */
  _uiSourceCodeRemoved(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    this._removeUISourceCode(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _removeUISourceCode(uiSourceCode) {
    var breakpoints = this._breakpointsForPrimaryUISourceCode.get(uiSourceCode) || [];
    for (var i = 0; i < breakpoints.length; ++i) {
      breakpoints[i]._resetLocations();
      if (breakpoints[i].enabled())
        this._provisionalBreakpoints.set(uiSourceCode.url(), breakpoints[i]);
    }
    this._breakpointsForPrimaryUISourceCode.remove(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @param {string} condition
   * @param {boolean} enabled
   * @return {!Bindings.BreakpointManager.Breakpoint}
   */
  setBreakpoint(uiSourceCode, lineNumber, columnNumber, condition, enabled) {
    var uiLocation = new Workspace.UILocation(uiSourceCode, lineNumber, columnNumber);
    var normalizedLocation = this._debuggerWorkspaceBinding.normalizeUILocation(uiLocation);
    if (normalizedLocation.id() !== uiLocation.id()) {
      Common.Revealer.reveal(normalizedLocation);
      uiLocation = normalizedLocation;
    }
    this.setBreakpointsActive(true);
    return this._innerSetBreakpoint(
        uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber, condition, enabled);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @param {string} condition
   * @param {boolean} enabled
   * @return {!Bindings.BreakpointManager.Breakpoint}
   */
  _innerSetBreakpoint(uiSourceCode, lineNumber, columnNumber, condition, enabled) {
    var breakpoint = this.findBreakpoint(uiSourceCode, lineNumber, columnNumber);
    if (breakpoint) {
      breakpoint._updateState(condition, enabled);
      return breakpoint;
    }
    var projectId = uiSourceCode.project().id();
    breakpoint = new Bindings.BreakpointManager.Breakpoint(
        this, projectId, uiSourceCode.url(), lineNumber, columnNumber, condition, enabled);
    if (!this._breakpointsForPrimaryUISourceCode.get(uiSourceCode))
      this._breakpointsForPrimaryUISourceCode.set(uiSourceCode, []);
    this._breakpointsForPrimaryUISourceCode.get(uiSourceCode).push(breakpoint);
    return breakpoint;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @return {!Array<!Bindings.BreakpointManager.Breakpoint>}
   */
  findBreakpoints(uiSourceCode, lineNumber) {
    var breakpoints = this._breakpointsForUISourceCode.get(uiSourceCode);
    var lineBreakpoints = breakpoints ? breakpoints.get(lineNumber) : null;
    return lineBreakpoints ? lineBreakpoints.valuesArray()[0] : [];
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?Bindings.BreakpointManager.Breakpoint}
   */
  findBreakpoint(uiSourceCode, lineNumber, columnNumber) {
    var breakpoints = this._breakpointsForUISourceCode.get(uiSourceCode);
    var lineBreakpoints = breakpoints ? breakpoints.get(lineNumber) : null;
    var columnBreakpoints = lineBreakpoints ? lineBreakpoints.get(columnNumber) : null;
    return columnBreakpoints ? columnBreakpoints[0] : null;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!TextUtils.TextRange} textRange
   * @return {!Promise<!Array<!Workspace.UILocation>>}
   */
  possibleBreakpoints(uiSourceCode, textRange) {
    var startLocation = Bindings.debuggerWorkspaceBinding.uiLocationToRawLocation(
        uiSourceCode, textRange.startLine, textRange.startColumn);
    var endLocation =
        Bindings.debuggerWorkspaceBinding.uiLocationToRawLocation(uiSourceCode, textRange.endLine, textRange.endColumn);
    if (!startLocation || !endLocation || startLocation.debuggerModel !== endLocation.debuggerModel)
      return Promise.resolve([]);

    return startLocation.debuggerModel
        .getPossibleBreakpoints(startLocation, endLocation, /* restrictToFunction */ false)
        .then(toUILocations.bind(this));

    /**
     * @this {!Bindings.BreakpointManager}
     * @param {!Array<!SDK.DebuggerModel.BreakLocation>} locations
     * @return {!Array<!Workspace.UILocation>}
     */
    function toUILocations(locations) {
      var sortedLocations = locations.map(location => this._debuggerWorkspaceBinding.rawLocationToUILocation(location));
      sortedLocations = sortedLocations.filter(location => location && location.uiSourceCode === uiSourceCode);
      sortedLocations.sort(Workspace.UILocation.comparator);
      if (!sortedLocations.length)
        return [];
      var result = [sortedLocations[0]];
      var lastLocation = sortedLocations[0];
      for (var i = 1; i < sortedLocations.length; ++i) {
        if (sortedLocations[i].id() === lastLocation.id())
          continue;
        result.push(sortedLocations[i]);
        lastLocation = sortedLocations[i];
      }
      return result;
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!Array.<!Bindings.BreakpointManager.Breakpoint>}
   */
  breakpointsForUISourceCode(uiSourceCode) {
    var result = [];
    var uiSourceCodeBreakpoints = this._breakpointsForUISourceCode.get(uiSourceCode);
    var breakpoints = uiSourceCodeBreakpoints ? uiSourceCodeBreakpoints.valuesArray() : [];
    for (var i = 0; i < breakpoints.length; ++i) {
      var lineBreakpoints = breakpoints[i];
      var columnBreakpointArrays = lineBreakpoints ? lineBreakpoints.valuesArray() : [];
      result = result.concat.apply(result, columnBreakpointArrays);
    }
    return result;
  }

  /**
   * @return {!Array.<!Bindings.BreakpointManager.Breakpoint>}
   */
  _allBreakpoints() {
    var result = [];
    var uiSourceCodes = this._breakpointsForUISourceCode.keysArray();
    for (var i = 0; i < uiSourceCodes.length; ++i)
      result = result.concat(this.breakpointsForUISourceCode(uiSourceCodes[i]));
    return result;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!Array.<!{breakpoint: !Bindings.BreakpointManager.Breakpoint, uiLocation: !Workspace.UILocation}>}
   */
  breakpointLocationsForUISourceCode(uiSourceCode) {
    var uiSourceCodeBreakpoints = this._breakpointsForUISourceCode.get(uiSourceCode);
    var lineNumbers = uiSourceCodeBreakpoints ? uiSourceCodeBreakpoints.keysArray() : [];
    var result = [];
    for (var i = 0; i < lineNumbers.length; ++i) {
      var lineBreakpoints = uiSourceCodeBreakpoints.get(lineNumbers[i]);
      var columnNumbers = lineBreakpoints.keysArray();
      for (var j = 0; j < columnNumbers.length; ++j) {
        var columnBreakpoints = lineBreakpoints.get(columnNumbers[j]);
        var lineNumber = parseInt(lineNumbers[i], 10);
        var columnNumber = parseInt(columnNumbers[j], 10);
        for (var k = 0; k < columnBreakpoints.length; ++k) {
          var breakpoint = columnBreakpoints[k];
          var uiLocation = uiSourceCode.uiLocation(lineNumber, columnNumber);
          result.push({breakpoint: breakpoint, uiLocation: uiLocation});
        }
      }
    }
    return result;
  }

  /**
   * @return {!Array.<!{breakpoint: !Bindings.BreakpointManager.Breakpoint, uiLocation: !Workspace.UILocation}>}
   */
  allBreakpointLocations() {
    var result = [];
    var uiSourceCodes = this._breakpointsForUISourceCode.keysArray();
    for (var i = 0; i < uiSourceCodes.length; ++i)
      result = result.concat(this.breakpointLocationsForUISourceCode(uiSourceCodes[i]));
    return result;
  }

  /**
   * @param {boolean} toggleState
   */
  toggleAllBreakpoints(toggleState) {
    var breakpoints = this._allBreakpoints();
    for (var i = 0; i < breakpoints.length; ++i)
      breakpoints[i].setEnabled(toggleState);
  }

  removeAllBreakpoints() {
    var breakpoints = this._allBreakpoints();
    for (var i = 0; i < breakpoints.length; ++i)
      breakpoints[i].remove();
  }

  /**
   * @param {!Set.<!Bindings.BreakpointManager.Breakpoint>} selectedBreakpoints
   */
  removeOtherBreakpoints(selectedBreakpoints) {
    var allBreakpoints = this._allBreakpoints();
    allBreakpoints.forEach(breakpoint => {
      if (!selectedBreakpoints.has(breakpoint))
        breakpoint.remove();
    });
  }

  _projectRemoved(event) {
    var project = /** @type {!Workspace.Project} */ (event.data);
    var uiSourceCodes = project.uiSourceCodes();
    for (var i = 0; i < uiSourceCodes.length; ++i)
      this._removeUISourceCode(uiSourceCodes[i]);
  }

  /**
   * @param {!Bindings.BreakpointManager.Breakpoint} breakpoint
   * @param {boolean} removeFromStorage
   */
  _removeBreakpoint(breakpoint, removeFromStorage) {
    var uiSourceCode = breakpoint.uiSourceCode();
    var breakpoints = uiSourceCode ? this._breakpointsForPrimaryUISourceCode.get(uiSourceCode) || [] : [];
    breakpoints.remove(breakpoint);
    if (removeFromStorage)
      this._storage._removeBreakpoint(breakpoint);
    this._provisionalBreakpoints.delete(breakpoint._url, breakpoint);
  }

  /**
   * @param {!Bindings.BreakpointManager.Breakpoint} breakpoint
   * @param {!Workspace.UILocation} uiLocation
   */
  _uiLocationAdded(breakpoint, uiLocation) {
    var breakpoints = this._breakpointsForUISourceCode.get(uiLocation.uiSourceCode);
    if (!breakpoints) {
      breakpoints = new Map();
      this._breakpointsForUISourceCode.set(uiLocation.uiSourceCode, breakpoints);
    }
    var lineBreakpoints = breakpoints.get(uiLocation.lineNumber);
    if (!lineBreakpoints) {
      lineBreakpoints = new Map();
      breakpoints.set(uiLocation.lineNumber, lineBreakpoints);
    }
    var columnBreakpoints = lineBreakpoints.get(uiLocation.columnNumber);
    if (!columnBreakpoints) {
      columnBreakpoints = [];
      lineBreakpoints.set(uiLocation.columnNumber, columnBreakpoints);
    }
    columnBreakpoints.push(breakpoint);
    this.dispatchEventToListeners(
        Bindings.BreakpointManager.Events.BreakpointAdded, {breakpoint: breakpoint, uiLocation: uiLocation});
  }

  /**
   * @param {!Bindings.BreakpointManager.Breakpoint} breakpoint
   * @param {!Workspace.UILocation} uiLocation
   */
  _uiLocationRemoved(breakpoint, uiLocation) {
    var breakpoints = this._breakpointsForUISourceCode.get(uiLocation.uiSourceCode);
    if (!breakpoints)
      return;

    var lineBreakpoints = breakpoints.get(uiLocation.lineNumber);
    if (!lineBreakpoints)
      return;
    var columnBreakpoints = lineBreakpoints.get(uiLocation.columnNumber);
    if (!columnBreakpoints)
      return;
    columnBreakpoints.remove(breakpoint);
    if (!columnBreakpoints.length)
      lineBreakpoints.remove(uiLocation.columnNumber);
    if (!lineBreakpoints.size)
      breakpoints.remove(uiLocation.lineNumber);
    if (!breakpoints.size)
      this._breakpointsForUISourceCode.remove(uiLocation.uiSourceCode);
    this.dispatchEventToListeners(
        Bindings.BreakpointManager.Events.BreakpointRemoved, {breakpoint: breakpoint, uiLocation: uiLocation});
  }

  /**
   * @param {boolean} active
   */
  setBreakpointsActive(active) {
    if (this._breakpointsActive === active)
      return;

    this._breakpointsActive = active;
    var debuggerModels = SDK.targetManager.models(SDK.DebuggerModel);
    for (var i = 0; i < debuggerModels.length; ++i)
      debuggerModels[i].setBreakpointsActive(active);

    this.dispatchEventToListeners(Bindings.BreakpointManager.Events.BreakpointsActiveStateChanged, active);
  }

  /**
   * @return {boolean}
   */
  breakpointsActive() {
    return this._breakpointsActive;
  }
};

/** @enum {symbol} */
Bindings.BreakpointManager.Events = {
  BreakpointAdded: Symbol('breakpoint-added'),
  BreakpointRemoved: Symbol('breakpoint-removed'),
  BreakpointsActiveStateChanged: Symbol('BreakpointsActiveStateChanged')
};


/**
 * @unrestricted
 * @implements {SDK.SDKModelObserver<!SDK.DebuggerModel>}
 */
Bindings.BreakpointManager.Breakpoint = class {
  /**
   * @param {!Bindings.BreakpointManager} breakpointManager
   * @param {string} projectId
   * @param {string} url
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @param {string} condition
   * @param {boolean} enabled
   */
  constructor(breakpointManager, projectId, url, lineNumber, columnNumber, condition, enabled) {
    this._breakpointManager = breakpointManager;
    this._projectId = projectId;
    this._url = url;
    this._lineNumber = lineNumber;
    this._columnNumber = columnNumber;

    /** @type {!Map<string, number>} */
    this._numberOfDebuggerLocationForUILocation = new Map();

    // Force breakpoint update.
    /** @type {string} */ this._condition;
    /** @type {boolean} */ this._enabled;
    /** @type {boolean} */ this._isRemoved;
    /** @type {!Workspace.UILocation|undefined} */ this._fakePrimaryLocation;

    this._currentState = null;
    /** @type {!Map.<!SDK.DebuggerModel, !Bindings.BreakpointManager.ModelBreakpoint>}*/
    this._modelBreakpoints = new Map();
    this._updateState(condition, enabled);
    this._breakpointManager._targetManager.observeModels(SDK.DebuggerModel, this);
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  modelAdded(debuggerModel) {
    var debuggerWorkspaceBinding = this._breakpointManager._debuggerWorkspaceBinding;
    this._modelBreakpoints.set(
        debuggerModel, new Bindings.BreakpointManager.ModelBreakpoint(debuggerModel, this, debuggerWorkspaceBinding));
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  modelRemoved(debuggerModel) {
    var modelBreakpoint = this._modelBreakpoints.remove(debuggerModel);
    modelBreakpoint._cleanUpAfterDebuggerIsGone();
    modelBreakpoint._removeEventListeners();
  }

  /**
   * @return {string}
   */
  projectId() {
    return this._projectId;
  }

  /**
   * @return {string}
   */
  url() {
    return this._url;
  }

  /**
   * @return {number}
   */
  lineNumber() {
    return this._lineNumber;
  }

  /**
   * @return {number}
   */
  columnNumber() {
    return this._columnNumber;
  }

  /**
   * @return {?Workspace.UISourceCode}
   */
  uiSourceCode() {
    return this._breakpointManager._workspace.uiSourceCode(this._projectId, this._url);
  }

  /**
   * @param {?Workspace.UILocation} oldUILocation
   * @param {!Workspace.UILocation} newUILocation
   */
  _replaceUILocation(oldUILocation, newUILocation) {
    if (this._isRemoved)
      return;

    this._removeUILocation(oldUILocation, true);
    this._removeFakeBreakpointAtPrimaryLocation();

    var current = (this._numberOfDebuggerLocationForUILocation.get(newUILocation.id()) || 0) + 1;
    this._numberOfDebuggerLocationForUILocation.set(newUILocation.id(), current);
    if (current === 1)
      this._breakpointManager._uiLocationAdded(this, newUILocation);
  }

  /**
   * @param {?Workspace.UILocation} uiLocation
   * @param {boolean=} muteCreationFakeBreakpoint
   */
  _removeUILocation(uiLocation, muteCreationFakeBreakpoint) {
    if (!uiLocation || !this._numberOfDebuggerLocationForUILocation.has(uiLocation.id()))
      return;
    var current = (this._numberOfDebuggerLocationForUILocation.get(uiLocation.id()) || 0) - 1;
    this._numberOfDebuggerLocationForUILocation.set(uiLocation.id(), current);
    if (current !== 0)
      return;

    this._numberOfDebuggerLocationForUILocation.delete(uiLocation.id());
    this._breakpointManager._uiLocationRemoved(this, uiLocation);
    if (!muteCreationFakeBreakpoint)
      this._fakeBreakpointAtPrimaryLocation();
  }

  /**
   * @return {boolean}
   */
  enabled() {
    return this._enabled;
  }

  /**
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._updateState(this._condition, enabled);
  }

  /**
   * @return {string}
   */
  condition() {
    return this._condition;
  }

  /**
   * @param {string} condition
   */
  setCondition(condition) {
    this._updateState(condition, this._enabled);
  }

  /**
   * @param {string} condition
   * @param {boolean} enabled
   */
  _updateState(condition, enabled) {
    if (this._enabled === enabled && this._condition === condition)
      return;
    this._enabled = enabled;
    this._condition = condition;
    this._breakpointManager._storage._updateBreakpoint(this);
    this._updateBreakpoint();
  }

  _updateBreakpoint() {
    this._removeFakeBreakpointAtPrimaryLocation();
    this._fakeBreakpointAtPrimaryLocation();
    var modelBreakpoints = this._modelBreakpoints.valuesArray();
    for (var i = 0; i < modelBreakpoints.length; ++i)
      modelBreakpoints[i]._scheduleUpdateInDebugger();
  }

  /**
   * @param {boolean=} keepInStorage
   */
  remove(keepInStorage) {
    this._isRemoved = true;
    var removeFromStorage = !keepInStorage;
    this._removeFakeBreakpointAtPrimaryLocation();
    var modelBreakpoints = this._modelBreakpoints.valuesArray();
    for (var i = 0; i < modelBreakpoints.length; ++i) {
      modelBreakpoints[i]._scheduleUpdateInDebugger();
      modelBreakpoints[i]._removeEventListeners();
    }

    this._breakpointManager._removeBreakpoint(this, removeFromStorage);
    this._breakpointManager._targetManager.unobserveModels(SDK.DebuggerModel, this);
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  _updateInDebuggerForModel(debuggerModel) {
    this._modelBreakpoints.get(debuggerModel)._scheduleUpdateInDebugger();
  }

  /**
   * @return {string}
   */
  _breakpointStorageId() {
    return Bindings.BreakpointManager._breakpointStorageId(this._url, this._lineNumber, this._columnNumber);
  }

  _fakeBreakpointAtPrimaryLocation() {
    if (this._isRemoved || this._numberOfDebuggerLocationForUILocation.size || this._fakePrimaryLocation)
      return;

    var uiSourceCode = this._breakpointManager._workspace.uiSourceCode(this._projectId, this._url);
    if (!uiSourceCode)
      return;

    this._fakePrimaryLocation = uiSourceCode.uiLocation(this._lineNumber, this._columnNumber);
    if (this._fakePrimaryLocation)
      this._breakpointManager._uiLocationAdded(this, this._fakePrimaryLocation);
  }

  _removeFakeBreakpointAtPrimaryLocation() {
    if (this._fakePrimaryLocation) {
      this._breakpointManager._uiLocationRemoved(this, this._fakePrimaryLocation);
      delete this._fakePrimaryLocation;
    }
  }

  _resetLocations() {
    this._removeFakeBreakpointAtPrimaryLocation();
    var modelBreakpoints = this._modelBreakpoints.valuesArray();
    for (var i = 0; i < modelBreakpoints.length; ++i)
      modelBreakpoints[i]._resetLocations();
  }
};

/**
 * @unrestricted
 */
Bindings.BreakpointManager.ModelBreakpoint = class {
  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!Bindings.BreakpointManager.Breakpoint} breakpoint
   * @param {!Bindings.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   */
  constructor(debuggerModel, breakpoint, debuggerWorkspaceBinding) {
    this._debuggerModel = debuggerModel;
    this._breakpoint = breakpoint;
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    this._liveLocations = new Bindings.LiveLocationPool();

    /** @type {!Map<string, !Workspace.UILocation>} */
    this._uiLocations = new Map();
    this._debuggerModel.addEventListener(
        SDK.DebuggerModel.Events.DebuggerWasDisabled, this._cleanUpAfterDebuggerIsGone, this);
    this._debuggerModel.addEventListener(
        SDK.DebuggerModel.Events.DebuggerWasEnabled, this._scheduleUpdateInDebugger, this);
    this._hasPendingUpdate = false;
    this._isUpdating = false;
    this._cancelCallback = false;
    this._currentState = null;
    if (this._debuggerModel.debuggerEnabled())
      this._scheduleUpdateInDebugger();
  }

  _resetLocations() {
    for (var uiLocation of this._uiLocations.values())
      this._breakpoint._removeUILocation(uiLocation);

    this._uiLocations.clear();
    this._liveLocations.disposeAll();
  }

  _scheduleUpdateInDebugger() {
    if (this._isUpdating) {
      this._hasPendingUpdate = true;
      return;
    }

    this._isUpdating = true;
    this._updateInDebugger(this._didUpdateInDebugger.bind(this));
  }

  _didUpdateInDebugger() {
    this._isUpdating = false;
    if (this._hasPendingUpdate) {
      this._hasPendingUpdate = false;
      this._scheduleUpdateInDebugger();
    }
  }

  /**
   * @return {boolean}
   */
  _scriptDiverged() {
    var uiSourceCode = this._breakpoint.uiSourceCode();
    if (!uiSourceCode)
      return false;
    var scriptFile = this._debuggerWorkspaceBinding.scriptFile(uiSourceCode, this._debuggerModel);
    return !!scriptFile && scriptFile.hasDivergedFromVM();
  }

  /**
   * @param {function()} callback
   * @return {!Promise}
   */
  async _updateInDebugger(callback) {
    if (this._debuggerModel.target().isDisposed()) {
      this._cleanUpAfterDebuggerIsGone();
      callback();
      return;
    }

    var uiSourceCode = this._breakpoint.uiSourceCode();
    var lineNumber = this._breakpoint._lineNumber;
    var columnNumber = this._breakpoint._columnNumber;
    var condition = this._breakpoint.condition();

    var debuggerLocation = uiSourceCode &&
        Bindings.debuggerWorkspaceBinding.uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber);
    if (debuggerLocation && debuggerLocation.debuggerModel !== this._debuggerModel)
      debuggerLocation = null;
    var newState;
    if (this._breakpoint._isRemoved || !this._breakpoint.enabled() || this._scriptDiverged()) {
      newState = null;
    } else if (debuggerLocation) {
      var script = debuggerLocation.script();
      if (script.sourceURL) {
        newState = new Bindings.BreakpointManager.Breakpoint.State(
            script.sourceURL, null, null, debuggerLocation.lineNumber, debuggerLocation.columnNumber, condition);
      } else {
        newState = new Bindings.BreakpointManager.Breakpoint.State(
            null, script.scriptId, script.hash, debuggerLocation.lineNumber, debuggerLocation.columnNumber, condition);
      }
    } else if (this._breakpoint._currentState && this._breakpoint._currentState.url) {
      var position = this._breakpoint._currentState;
      newState = new Bindings.BreakpointManager.Breakpoint.State(
          position.url, null, null, position.lineNumber, position.columnNumber, condition);
    } else if (uiSourceCode) {
      newState = new Bindings.BreakpointManager.Breakpoint.State(
          uiSourceCode.url(), null, null, lineNumber, columnNumber, condition);
    }
    if (this._debuggerId && Bindings.BreakpointManager.Breakpoint.State.equals(newState, this._currentState)) {
      callback();
      return;
    }

    this._breakpoint._currentState = newState;

    if (this._debuggerId) {
      this._resetLocations();
      this._debuggerModel.removeBreakpoint(this._debuggerId).then(this._didRemoveFromDebugger.bind(this, callback));
      this._scheduleUpdateInDebugger();
      this._currentState = null;
      return;
    }

    if (!newState) {
      callback();
      return;
    }

    var result;
    this._currentState = newState;
    if (newState.url) {
      result = await this._debuggerModel.setBreakpointByURL(
          newState.url, newState.lineNumber, newState.columnNumber, newState.condition);
    } else if (newState.scriptId && newState.scriptHash) {
      result = await this._debuggerModel.setBreakpointInAnonymousScript(
          newState.scriptId, newState.scriptHash, newState.lineNumber, newState.columnNumber, newState.condition);
    }
    if (result && result.breakpointId)
      this._didSetBreakpointInDebugger(callback, result.breakpointId, result.locations);
    else
      this._didSetBreakpointInDebugger(callback, null, []);
  }

  /**
   * @param {function()} callback
   * @param {?Protocol.Debugger.BreakpointId} breakpointId
   * @param {!Array.<!SDK.DebuggerModel.Location>} locations
   */
  _didSetBreakpointInDebugger(callback, breakpointId, locations) {
    if (this._cancelCallback) {
      this._cancelCallback = false;
      callback();
      return;
    }

    if (!breakpointId) {
      this._breakpoint.remove(true);
      callback();
      return;
    }

    this._debuggerId = breakpointId;
    this._debuggerModel.addBreakpointListener(this._debuggerId, this._breakpointResolved, this);
    for (var i = 0; i < locations.length; ++i) {
      if (!this._addResolvedLocation(locations[i]))
        break;
    }
    callback();
  }

  /**
   * @param {function()} callback
   */
  _didRemoveFromDebugger(callback) {
    if (this._cancelCallback) {
      this._cancelCallback = false;
      callback();
      return;
    }

    this._resetLocations();
    this._debuggerModel.removeBreakpointListener(this._debuggerId, this._breakpointResolved, this);
    delete this._debuggerId;
    callback();
  }

  /**
   * @param {!Common.Event} event
   */
  _breakpointResolved(event) {
    this._addResolvedLocation(/** @type {!SDK.DebuggerModel.Location}*/ (event.data));
  }

  /**
   * @param {!SDK.DebuggerModel.Location} location
   * @param {!Bindings.LiveLocation} liveLocation
   */
  _locationUpdated(location, liveLocation) {
    var uiLocation = liveLocation.uiLocation();
    if (!uiLocation)
      return;
    var oldUILocation = this._uiLocations.get(location.id()) || null;
    this._uiLocations.set(location.id(), uiLocation);
    this._breakpoint._replaceUILocation(oldUILocation, uiLocation);
  }

  /**
   * @param {!SDK.DebuggerModel.Location} location
   * @return {boolean}
   */
  _addResolvedLocation(location) {
    var uiLocation = this._debuggerWorkspaceBinding.rawLocationToUILocation(location);
    if (!uiLocation)
      return false;
    var breakpoint = this._breakpoint._breakpointManager.findBreakpoint(
        uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber);
    if (breakpoint && breakpoint !== this._breakpoint) {
      // location clash
      this._breakpoint.remove();
      return false;
    }
    this._debuggerWorkspaceBinding.createLiveLocation(
        location, this._locationUpdated.bind(this, location), this._liveLocations);
    return true;
  }

  _cleanUpAfterDebuggerIsGone() {
    if (this._isUpdating)
      this._cancelCallback = true;

    this._resetLocations();
    this._currentState = null;
    if (this._debuggerId)
      this._didRemoveFromDebugger(function() {});
  }

  _removeEventListeners() {
    this._debuggerModel.removeEventListener(
        SDK.DebuggerModel.Events.DebuggerWasDisabled, this._cleanUpAfterDebuggerIsGone, this);
    this._debuggerModel.removeEventListener(
        SDK.DebuggerModel.Events.DebuggerWasEnabled, this._scheduleUpdateInDebugger, this);
  }
};

/**
 * @unrestricted
 */
Bindings.BreakpointManager.Breakpoint.State = class {
  /**
   * @param {?string} url
   * @param {?string} scriptId
   * @param {?string} scriptHash
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @param {string} condition
   */
  constructor(url, scriptId, scriptHash, lineNumber, columnNumber, condition) {
    this.url = url;
    this.scriptId = scriptId;
    this.scriptHash = scriptHash;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
    this.condition = condition;
  }

  /**
   * @param {?Bindings.BreakpointManager.Breakpoint.State|undefined} stateA
   * @param {?Bindings.BreakpointManager.Breakpoint.State|undefined} stateB
   * @return {boolean}
   */
  static equals(stateA, stateB) {
    if (!stateA || !stateB)
      return false;
    return stateA.url === stateB.url && stateA.scriptId === stateB.scriptId &&
        stateA.scriptHash === stateB.scriptHash && stateA.lineNumber === stateB.lineNumber &&
        stateA.columnNumber === stateB.columnNumber && stateA.condition === stateB.condition;
  }
};


/**
 * @unrestricted
 */
Bindings.BreakpointManager.Storage = class {
  /**
   * @param {!Bindings.BreakpointManager} breakpointManager
   * @param {?Common.Setting} setting
   */
  constructor(breakpointManager, setting) {
    this._breakpointManager = breakpointManager;
    this._setting = setting || Common.settings.createLocalSetting('breakpoints', []);
    var breakpoints = this._setting.get();
    /** @type {!Object.<string, !Bindings.BreakpointManager.Storage.Item>} */
    this._breakpoints = {};
    for (var i = 0; i < breakpoints.length; ++i) {
      var breakpoint = /** @type {!Bindings.BreakpointManager.Storage.Item} */ (breakpoints[i]);
      breakpoint.columnNumber = breakpoint.columnNumber || 0;
      this._breakpoints[breakpoint.url + ':' + breakpoint.lineNumber + ':' + breakpoint.columnNumber] = breakpoint;
    }
  }

  mute() {
    this._muted = true;
  }

  unmute() {
    delete this._muted;
  }

  /**
   * @param {string} url
   * @return {!Array.<!Bindings.BreakpointManager.Storage.Item>}
   */
  breakpointItems(url) {
    var result = [];
    for (var id in this._breakpoints) {
      var breakpoint = this._breakpoints[id];
      if (breakpoint.url === url)
        result.push(breakpoint);
    }
    return result;
  }

  /**
   * @param {!Bindings.BreakpointManager.Breakpoint} breakpoint
   */
  _updateBreakpoint(breakpoint) {
    if (this._muted || !breakpoint._breakpointStorageId())
      return;
    this._breakpoints[breakpoint._breakpointStorageId()] = new Bindings.BreakpointManager.Storage.Item(breakpoint);
    this._save();
  }

  /**
   * @param {!Bindings.BreakpointManager.Breakpoint} breakpoint
   */
  _removeBreakpoint(breakpoint) {
    if (this._muted)
      return;
    delete this._breakpoints[breakpoint._breakpointStorageId()];
    this._save();
  }

  _save() {
    var breakpointsArray = [];
    for (var id in this._breakpoints)
      breakpointsArray.push(this._breakpoints[id]);
    this._setting.set(breakpointsArray);
  }
};

/**
 * @unrestricted
 */
Bindings.BreakpointManager.Storage.Item = class {
  /**
   * @param {!Bindings.BreakpointManager.Breakpoint} breakpoint
   */
  constructor(breakpoint) {
    this.url = breakpoint._url;
    this.lineNumber = breakpoint.lineNumber();
    this.columnNumber = breakpoint.columnNumber();
    this.condition = breakpoint.condition();
    this.enabled = breakpoint.enabled();
  }
};

/** @type {!Bindings.BreakpointManager} */
Bindings.breakpointManager;
