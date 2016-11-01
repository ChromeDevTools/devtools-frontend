/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
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
 * @unrestricted
 */
WebInspector.StackView = class extends WebInspector.VBox {
  /**
   * @param {boolean} isVertical
   */
  constructor(isVertical) {
    super();
    this._isVertical = isVertical;
    this._currentSplitWidget = null;
  }

  /**
   * @param {!WebInspector.Widget} view
   * @param {string=} sidebarSizeSettingName
   * @param {number=} defaultSidebarWidth
   * @param {number=} defaultSidebarHeight
   * @return {?WebInspector.SplitWidget}
   */
  appendView(view, sidebarSizeSettingName, defaultSidebarWidth, defaultSidebarHeight) {
    var splitWidget = new WebInspector.SplitWidget(
        this._isVertical, true, sidebarSizeSettingName, defaultSidebarWidth, defaultSidebarHeight);
    splitWidget.setMainWidget(view);
    splitWidget.hideSidebar();

    if (!this._currentSplitWidget) {
      splitWidget.show(this.element);
    } else {
      this._currentSplitWidget.setSidebarWidget(splitWidget);
      this._currentSplitWidget.showBoth();
    }

    var lastSplitWidget = this._currentSplitWidget;
    this._currentSplitWidget = splitWidget;
    return lastSplitWidget;
  }

  /**
   * @override
   */
  detachChildWidgets() {
    super.detachChildWidgets();
    this._currentSplitWidget = null;
  }
};
