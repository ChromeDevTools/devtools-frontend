// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {SDK.TargetManager.Observer}
 */
Components.CPUThrottlingManager = class extends Common.Object {
  constructor() {
    super();
    this._throttlingRate = 1;  // No throttling
    SDK.targetManager.observeTargets(this, SDK.Target.Capability.Browser);
    /** @type {!Set<!UI.ToolbarComboBox>} */
    this._controls = new Set();
    this._rates = [1, 2, 5, 10, 20];
  }

  /**
   * @param {number} index
   */
  _setRateIndex(index) {
    this._throttlingRate = this._rates[index];
    SDK.targetManager.targets().forEach(target => target.emulationAgent().setCPUThrottlingRate(this._throttlingRate));
    var icon = null;
    if (this._throttlingRate !== 1) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuThrottlingEnabled);
      icon = UI.Icon.create('smallicon-warning');
      icon.title = Common.UIString('CPU throttling is enabled');
    }
    for (var control of this._controls)
      control.setSelectedIndex(index);
    UI.inspectorView.setPanelIcon('timeline', icon);
    this.dispatchEventToListeners(Components.CPUThrottlingManager.Events.RateChanged);
  }

  /**
   * @return {number}
   */
  rate() {
    return this._throttlingRate;
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    if (this._throttlingRate !== 1)
      target.emulationAgent().setCPUThrottlingRate(this._throttlingRate);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
  }

  /**
   * @return {!UI.ToolbarComboBox}
   */
  createControl() {
    var control = new UI.ToolbarComboBox(event => this._setRateIndex(event.target.selectedIndex));
    this._controls.add(control);
    var currentRate = this._throttlingRate;

    for (var i = 0; i < this._rates.length; ++i) {
      var rate = this._rates[i];
      var title = rate === 1 ? Common.UIString('No throttling') : Common.UIString('%d\xD7 slowdown', rate);
      var option = control.createOption(title);
      control.addOption(option);
      if (currentRate === rate)
        control.setSelectedIndex(i);
    }
    return control;
  }

  /**
   * @param {!UI.ToolbarComboBox} control
   */
  disposeControl(control) {
    this._controls.delete(control);
  }
};

/** @enum {symbol} */
Components.CPUThrottlingManager.Events = {
  RateChanged: Symbol('RateChanged')
};
