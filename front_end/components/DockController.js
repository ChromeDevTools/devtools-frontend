/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
 */
WebInspector.DockController = class extends WebInspector.Object {
  /**
   * @param {boolean} canDock
   */
  constructor(canDock) {
    super();
    this._canDock = canDock;

    this._closeButton = new WebInspector.ToolbarButton(WebInspector.UIString('Close'), 'delete-toolbar-item');
    this._closeButton.addEventListener('click', InspectorFrontendHost.closeWindow.bind(InspectorFrontendHost));

    if (!canDock) {
      this._dockSide = WebInspector.DockController.State.Undocked;
      this._updateUI();
      return;
    }

    this._states = [
      WebInspector.DockController.State.DockedToRight, WebInspector.DockController.State.DockedToBottom,
      WebInspector.DockController.State.Undocked
    ];
    this._currentDockStateSetting = WebInspector.settings.moduleSetting('currentDockState');
    this._currentDockStateSetting.addChangeListener(this._dockSideChanged, this);
    this._lastDockStateSetting = WebInspector.settings.createSetting('lastDockState', 'bottom');
    if (this._states.indexOf(this._currentDockStateSetting.get()) === -1)
      this._currentDockStateSetting.set('right');
    if (this._states.indexOf(this._lastDockStateSetting.get()) === -1)
      this._currentDockStateSetting.set('bottom');
  }

  initialize() {
    if (!this._canDock)
      return;

    this._titles = [
      WebInspector.UIString('Dock to right'), WebInspector.UIString('Dock to bottom'),
      WebInspector.UIString('Undock into separate window')
    ];
    this._dockSideChanged();
  }

  _dockSideChanged() {
    this.setDockSide(this._currentDockStateSetting.get());
  }

  /**
   * @return {string}
   */
  dockSide() {
    return this._dockSide;
  }

  /**
   * @return {boolean}
   */
  canDock() {
    return this._canDock;
  }

  /**
   * @return {boolean}
   */
  isVertical() {
    return this._dockSide === WebInspector.DockController.State.DockedToRight;
  }

  /**
   * @param {string} dockSide
   * @suppressGlobalPropertiesCheck
   */
  setDockSide(dockSide) {
    if (this._states.indexOf(dockSide) === -1)
      dockSide = this._states[0];

    if (this._dockSide === dockSide)
      return;

    if (this._dockSide)
      this._lastDockStateSetting.set(this._dockSide);

    this._savedFocus = document.deepActiveElement();
    var eventData = {from: this._dockSide, to: dockSide};
    this.dispatchEventToListeners(WebInspector.DockController.Events.BeforeDockSideChanged, eventData);
    console.timeStamp('DockController.setIsDocked');
    this._dockSide = dockSide;
    this._currentDockStateSetting.set(dockSide);
    InspectorFrontendHost.setIsDocked(
        dockSide !== WebInspector.DockController.State.Undocked, this._setIsDockedResponse.bind(this, eventData));
    this._updateUI();
    this.dispatchEventToListeners(WebInspector.DockController.Events.DockSideChanged, eventData);
  }

  /**
   * @param {{from: string, to: string}} eventData
   */
  _setIsDockedResponse(eventData) {
    this.dispatchEventToListeners(WebInspector.DockController.Events.AfterDockSideChanged, eventData);
    if (this._savedFocus) {
      this._savedFocus.focus();
      this._savedFocus = null;
    }
  }

  /**
   * @suppressGlobalPropertiesCheck
   */
  _updateUI() {
    var body = document.body;  // Only for main window.
    switch (this._dockSide) {
      case WebInspector.DockController.State.DockedToBottom:
        body.classList.remove('undocked');
        body.classList.remove('dock-to-right');
        body.classList.add('dock-to-bottom');
        break;
      case WebInspector.DockController.State.DockedToRight:
        body.classList.remove('undocked');
        body.classList.add('dock-to-right');
        body.classList.remove('dock-to-bottom');
        break;
      case WebInspector.DockController.State.Undocked:
        body.classList.add('undocked');
        body.classList.remove('dock-to-right');
        body.classList.remove('dock-to-bottom');
        break;
    }
    this._closeButton.setVisible(this._dockSide !== WebInspector.DockController.State.Undocked);
  }

  _toggleDockSide() {
    if (this._lastDockStateSetting.get() === this._currentDockStateSetting.get()) {
      var index = this._states.indexOf(this._currentDockStateSetting.get()) || 0;
      this._lastDockStateSetting.set(this._states[(index + 1) % this._states.length]);
    }
    this.setDockSide(this._lastDockStateSetting.get());
  }
};

WebInspector.DockController.State = {
  DockedToBottom: 'bottom',
  DockedToRight: 'right',
  Undocked: 'undocked'
};

// Use BeforeDockSideChanged to do something before all the UI bits are updated,
// DockSideChanged to update UI, and AfterDockSideChanged to perform actions
// after frontend is docked/undocked in the browser.

/** @enum {symbol} */
WebInspector.DockController.Events = {
  BeforeDockSideChanged: Symbol('BeforeDockSideChanged'),
  DockSideChanged: Symbol('DockSideChanged'),
  AfterDockSideChanged: Symbol('AfterDockSideChanged')
};

/**
 * @implements {WebInspector.ActionDelegate}
 * @unrestricted
 */
WebInspector.DockController.ToggleDockActionDelegate = class {
  /**
   * @override
   * @param {!WebInspector.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    WebInspector.dockController._toggleDockSide();
    return true;
  }
};

/**
 * @implements {WebInspector.ToolbarItem.Provider}
 * @unrestricted
 */
WebInspector.DockController.CloseButtonProvider = class {
  /**
   * @override
   * @return {?WebInspector.ToolbarItem}
   */
  item() {
    return WebInspector.dockController._closeButton;
  }
};

/**
 * @type {!WebInspector.DockController}
 */
WebInspector.dockController;
