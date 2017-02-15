// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Timeline.TimelineModeView}
 */
Timeline.TimelineTreeModeView = class extends UI.VBox {
  /**
   * @param {!Timeline.TimelineModeViewDelegate} delegate
   * @param {!Timeline.TimelineTreeView} innerTreeView
   */
  constructor(delegate, innerTreeView) {
    super();
    this._treeView = innerTreeView;
    this._treeView.show(this.element);
  }

  /**
   * @override
   * @return {?Element}
   */
  resizerElement() {
    return null;
  }

  /**
   * @override
   * @param {?SDK.TracingModel.Event} event
   */
  highlightEvent(event) {
  }

  /**
   * @override
   * @param {?Timeline.PerformanceModel} model
   */
  setModel(model) {
    this._treeView.setModel(model);
  }

  /**
   * @override
   */
  setSelection() {
  }

  /**
   * @override
   * @param {number} startTime
   * @param {number} endTime
   */
  setWindowTimes(startTime, endTime) {
    this._treeView.setRange(startTime, endTime);
  }

  /**
   * @override
   * @return {!UI.Widget}
   */
  view() {
    return this;
  }
};
