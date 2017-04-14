// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

SDK.DOMDebuggerModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);
    this._agent = target.domdebuggerAgent();
    this._runtimeModel = /** @type {!SDK.RuntimeModel} */ (target.model(SDK.RuntimeModel));
    this._domModel = /** @type {!SDK.DOMModel} */ (target.model(SDK.DOMModel));
  }
};

SDK.SDKModel.register(SDK.DOMDebuggerModel, SDK.Target.Capability.DOM, false);

/**
 * @implements {SDK.SDKModelObserver<!SDK.DOMDebuggerModel>}
 */
SDK.XHRBreakpointManager = class {
  constructor() {
    this._setting = Common.settings.createLocalSetting('xhrBreakpoints', []);
    /** @type {!Map<string, boolean>} */
    this._breakpoints = new Map();
    for (var breakpoint of this._setting.get())
      this._breakpoints.set(breakpoint.url, breakpoint.enabled);
    SDK.targetManager.observeModels(SDK.DOMDebuggerModel, this);
  }

  /**
   * @return {!Map<string, boolean>}
   */
  breakpoints() {
    return this._breakpoints;
  }

  _saveBreakpoints() {
    var breakpoints = [];
    for (var url of this._breakpoints.keys())
      breakpoints.push({url: url, enabled: this._breakpoints.get(url)});
    this._setting.set(breakpoints);
  }

  /**
   * @param {string} url
   * @param {boolean} enabled
   */
  addBreakpoint(url, enabled) {
    this._breakpoints.set(url, enabled);
    if (enabled) {
      for (var model of SDK.targetManager.models(SDK.DOMDebuggerModel))
        model._agent.setXHRBreakpoint(url);
    }
    this._saveBreakpoints();
  }

  /**
   * @param {string} url
   */
  removeBreakpoint(url) {
    var enabled = this._breakpoints.get(url);
    this._breakpoints.delete(url);
    if (enabled) {
      for (var model of SDK.targetManager.models(SDK.DOMDebuggerModel))
        model._agent.removeXHRBreakpoint(url);
    }
    this._saveBreakpoints();
  }

  /**
   * @param {string} url
   * @param {boolean} enabled
   */
  toggleBreakpoint(url, enabled) {
    this._breakpoints.set(url, enabled);
    for (var model of SDK.targetManager.models(SDK.DOMDebuggerModel)) {
      if (enabled)
        model._agent.setXHRBreakpoint(url);
      else
        model._agent.removeXHRBreakpoint(url);
    }
    this._saveBreakpoints();
  }

  /**
   * @override
   * @param {!SDK.DOMDebuggerModel} domDebuggerModel
   */
  modelAdded(domDebuggerModel) {
    for (var url of this._breakpoints.keys()) {
      if (this._breakpoints.get(url))
        domDebuggerModel._agent.setXHRBreakpoint(url);
    }
  }

  /**
   * @override
   * @param {!SDK.DOMDebuggerModel} domDebuggerModel
   */
  modelRemoved(domDebuggerModel) {
  }
};

/** @type {!SDK.XHRBreakpointManager} */
SDK.xhrBreakpointManager;
