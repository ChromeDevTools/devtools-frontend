/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @implements {WebInspector.TargetManager.Observer}
 * @unrestricted
 */
WebInspector.InspectElementModeController = class {
  constructor() {
    this._toggleSearchAction = WebInspector.actionRegistry.action('elements.toggle-element-search');
    if (Runtime.experiments.isEnabled('layoutEditor')) {
      this._layoutEditorButton =
          new WebInspector.ToolbarToggle(WebInspector.UIString('Toggle Layout Editor'), 'layout-editor-toolbar-item');
      this._layoutEditorButton.addEventListener('click', this._toggleLayoutEditor, this);
    }

    this._mode = Protocol.DOM.InspectMode.None;
    WebInspector.targetManager.addEventListener(
        WebInspector.TargetManager.Events.SuspendStateChanged, this._suspendStateChanged, this);
    WebInspector.targetManager.observeTargets(this, WebInspector.Target.Capability.DOM);
  }

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetAdded(target) {
    // When DevTools are opening in the inspect element mode, the first target comes in
    // much later than the InspectorFrontendAPI.enterInspectElementMode event.
    if (this._mode === Protocol.DOM.InspectMode.None)
      return;
    var domModel = WebInspector.DOMModel.fromTarget(target);
    domModel.setInspectMode(this._mode);
  }

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetRemoved(target) {
  }

  /**
   * @return {boolean}
   */
  isInInspectElementMode() {
    return this._mode === Protocol.DOM.InspectMode.SearchForNode ||
        this._mode === Protocol.DOM.InspectMode.SearchForUAShadowDOM;
  }

  /**
   * @return {boolean}
   */
  isInLayoutEditorMode() {
    return this._mode === Protocol.DOM.InspectMode.ShowLayoutEditor;
  }

  stopInspection() {
    if (this._mode && this._mode !== Protocol.DOM.InspectMode.None)
      this._toggleInspectMode();
  }

  _toggleLayoutEditor() {
    var mode = this.isInLayoutEditorMode() ? Protocol.DOM.InspectMode.None : Protocol.DOM.InspectMode.ShowLayoutEditor;
    this._setMode(mode);
  }

  _toggleInspectMode() {
    if (WebInspector.targetManager.allTargetsSuspended())
      return;

    var mode;
    if (this.isInInspectElementMode())
      mode = Protocol.DOM.InspectMode.None;
    else
      mode = WebInspector.moduleSetting('showUAShadowDOM').get() ? Protocol.DOM.InspectMode.SearchForUAShadowDOM :
                                                                   Protocol.DOM.InspectMode.SearchForNode;

    this._setMode(mode);
  }

  /**
   * @param {!Protocol.DOM.InspectMode} mode
   */
  _setMode(mode) {
    this._mode = mode;
    for (var domModel of WebInspector.DOMModel.instances())
      domModel.setInspectMode(mode);

    if (this._layoutEditorButton) {
      this._layoutEditorButton.setEnabled(!this.isInInspectElementMode());
      this._layoutEditorButton.setToggled(this.isInLayoutEditorMode());
    }

    this._toggleSearchAction.setEnabled(!this.isInLayoutEditorMode());
    this._toggleSearchAction.setToggled(this.isInInspectElementMode());
  }

  _suspendStateChanged() {
    if (!WebInspector.targetManager.allTargetsSuspended())
      return;

    this._mode = Protocol.DOM.InspectMode.None;
    this._toggleSearchAction.setToggled(false);
    if (this._layoutEditorButton)
      this._layoutEditorButton.setToggled(false);
  }
};

/**
 * @implements {WebInspector.ActionDelegate}
 * @unrestricted
 */
WebInspector.InspectElementModeController.ToggleSearchActionDelegate = class {
  /**
   * @override
   * @param {!WebInspector.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    if (!WebInspector.inspectElementModeController)
      return false;
    WebInspector.inspectElementModeController._toggleInspectMode();
    return true;
  }
};

/**
 * @implements {WebInspector.ToolbarItem.Provider}
 * @unrestricted
 */
WebInspector.InspectElementModeController.LayoutEditorButtonProvider = class {
  /**
   * @override
   * @return {?WebInspector.ToolbarItem}
   */
  item() {
    if (!WebInspector.inspectElementModeController)
      return null;

    return WebInspector.inspectElementModeController._layoutEditorButton;
  }
};

/** @type {?WebInspector.InspectElementModeController} */
WebInspector.inspectElementModeController =
    Runtime.queryParam('isSharedWorker') ? null : new WebInspector.InspectElementModeController();
