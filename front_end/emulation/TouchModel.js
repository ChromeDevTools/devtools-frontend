// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Emulation.MultitargetTouchModel = class {
  constructor() {
    this._touchEnabled = false;
    this._touchMobile = false;
    this._customTouchEnabled = false;

    SDK.targetManager.observeTargets(this, SDK.Target.Capability.Browser);
  }

  /**
   * @return {!Emulation.MultitargetTouchModel}
   */
  static instance() {
    if (!Emulation.MultitargetTouchModel._instance)
      Emulation.MultitargetTouchModel._instance = new Emulation.MultitargetTouchModel();
    return /** @type {!Emulation.MultitargetTouchModel} */ (Emulation.MultitargetTouchModel._instance);
  }

  /**
   * @param {boolean} enabled
   * @param {boolean} mobile
   */
  setTouchEnabled(enabled, mobile) {
    this._touchEnabled = enabled;
    this._touchMobile = mobile;
    this._updateAllTargets();
  }

  /**
   * @param {boolean} enabled
   */
  setCustomTouchEnabled(enabled) {
    this._customTouchEnabled = enabled;
    this._updateAllTargets();
  }

  _updateAllTargets() {
    for (var target of SDK.targetManager.targets(SDK.Target.Capability.Browser))
      this._applyToTarget(target);
  }

  /**
   * @param {!SDK.Target} target
   */
  _applyToTarget(target) {
    var current = {enabled: this._touchEnabled, configuration: this._touchMobile ? 'mobile' : 'desktop'};
    if (this._customTouchEnabled)
      current = {enabled: true, configuration: 'mobile'};

    var domModel = SDK.DOMModel.fromTarget(target);
    var inspectModeEnabled = domModel ? domModel.inspectModeEnabled() : false;
    if (inspectModeEnabled)
      current = {enabled: false, configuration: 'mobile'};

    /**
     * @suppressGlobalPropertiesCheck
     */
    const injectedFunction = function() {
      const touchEvents = ['ontouchstart', 'ontouchend', 'ontouchmove', 'ontouchcancel'];
      var recepients = [window.__proto__, document.__proto__];
      for (var i = 0; i < touchEvents.length; ++i) {
        for (var j = 0; j < recepients.length; ++j) {
          if (!(touchEvents[i] in recepients[j])) {
            Object.defineProperty(
                recepients[j], touchEvents[i], {value: null, writable: true, configurable: true, enumerable: true});
          }
        }
      }
    };

    var symbol = Emulation.MultitargetTouchModel._symbol;
    var previous = target[symbol] || {enabled: false, configuration: 'mobile', scriptId: ''};

    if (previous.enabled === current.enabled && (!current.enabled || previous.configuration === current.configuration))
      return;

    if (previous.scriptId) {
      target.pageAgent().removeScriptToEvaluateOnLoad(previous.scriptId);
      target[symbol].scriptId = '';
    }

    target[symbol] = current;
    target[symbol].scriptId = '';

    if (current.enabled)
      target.pageAgent().addScriptToEvaluateOnLoad('(' + injectedFunction.toString() + ')()', scriptAddedCallback);

    /**
     * @param {?Protocol.Error} error
     * @param {string} scriptId
     */
    function scriptAddedCallback(error, scriptId) {
      (target[symbol] || {}).scriptId = error ? '' : scriptId;
    }

    target.emulationAgent().setTouchEmulationEnabled(current.enabled, current.configuration);
  }

  /**
   * @param {!Common.Event} event
   */
  _inspectModeToggled(event) {
    var domModel = /** @type {!SDK.DOMModel} */ (event.data);
    this._applyToTarget(domModel.target());
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    var domModel = SDK.DOMModel.fromTarget(target);
    if (domModel)
      domModel.addEventListener(SDK.DOMModel.Events.InspectModeWillBeToggled, this._inspectModeToggled, this);
    this._applyToTarget(target);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    var domModel = SDK.DOMModel.fromTarget(target);
    if (domModel)
      domModel.removeEventListener(SDK.DOMModel.Events.InspectModeWillBeToggled, this._inspectModeToggled, this);
  }
};

Emulation.MultitargetTouchModel._symbol = Symbol('MultitargetTouchModel.symbol');

/** @type {?Emulation.MultitargetTouchModel} */
Emulation.MultitargetTouchModel._instance = null;
