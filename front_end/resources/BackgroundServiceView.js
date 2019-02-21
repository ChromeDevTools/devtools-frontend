// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Resources.BackgroundServiceView = class extends UI.VBox {
  /**
   * @param {string} serviceName
   */
  constructor(serviceName) {
    super(true);
    this.registerRequiredCSS('resources/backgroundServiceView.css');

    /** @const {string} */
    this._serviceName = serviceName;

    /** @const {!UI.Toolbar} */
    this._toolbar = new UI.Toolbar('background-service-toolbar', this.contentElement);
    this._setupToolbar();
  }

  /**
   * Creates the toolbar UI element.
   */
  _setupToolbar() {
    const recordButton =
        new UI.ToolbarToggle(Common.UIString('Toggle Record'), 'largeicon-start-recording', 'largeicon-stop-recording');
    recordButton.addEventListener(
        UI.ToolbarButton.Events.Click, () => recordButton.setToggled(!recordButton.toggled()));
    recordButton.setToggleWithRedColor(true);
    this._toolbar.appendToolbarItem(recordButton);

    const refreshButton = new UI.ToolbarButton(Common.UIString('Refresh'), 'largeicon-refresh');
    refreshButton.addEventListener(UI.ToolbarButton.Events.Click, () => {});
    this._toolbar.appendToolbarItem(refreshButton);

    const clearButton = new UI.ToolbarButton(Common.UIString('Clear'), 'largeicon-clear');
    clearButton.addEventListener(UI.ToolbarButton.Events.Click, () => {});
    this._toolbar.appendToolbarItem(clearButton);

    this._toolbar.appendSeparator();

    const deleteButton = new UI.ToolbarButton(Common.UIString('Delete'), 'largeicon-trash-bin');
    deleteButton.addEventListener(UI.ToolbarButton.Events.Click, () => {});
    this._toolbar.appendToolbarItem(deleteButton);
  }
};
