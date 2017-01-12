/*
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @unrestricted
 */
Sources.JavaScriptOutlineDialog = class extends QuickOpen.FilteredListWidget.Delegate {
  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {function(number, number)} selectItemCallback
   */
  constructor(uiSourceCode, selectItemCallback) {
    super();

    this._functionItems = [];
    this._selectItemCallback = selectItemCallback;
    Common.formatterWorkerPool.javaScriptOutline(uiSourceCode.workingCopy(), this._didBuildOutlineChunk.bind(this));
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {function(number, number)} selectItemCallback
   */
  static show(uiSourceCode, selectItemCallback) {
    Sources.JavaScriptOutlineDialog._instanceForTests =
        new Sources.JavaScriptOutlineDialog(uiSourceCode, selectItemCallback);
    new QuickOpen.FilteredListWidget(Sources.JavaScriptOutlineDialog._instanceForTests).showAsDialog();
  }

  /**
   * @param {boolean} isLastChunk
   * @param {!Array<!Common.FormatterWorkerPool.JSOutlineItem>} items
   */
  _didBuildOutlineChunk(isLastChunk, items) {
    this._functionItems.push(...items);
    this.refresh();
  }

  /**
   * @override
   * @return {number}
   */
  itemCount() {
    return this._functionItems.length;
  }

  /**
   * @override
   * @param {number} itemIndex
   * @return {string}
   */
  itemKeyAt(itemIndex) {
    var item = this._functionItems[itemIndex];
    return item.name + (item.arguments ? item.arguments : '');
  }

  /**
   * @override
   * @param {number} itemIndex
   * @param {string} query
   * @return {number}
   */
  itemScoreAt(itemIndex, query) {
    var item = this._functionItems[itemIndex];
    var methodName = query.split('(')[0];
    if (methodName.toLowerCase() === item.name.toLowerCase())
      return 1 / (1 + item.line);
    return -item.line - 1;
  }

  /**
   * @override
   * @param {number} itemIndex
   * @param {string} query
   * @param {!Element} titleElement
   * @param {!Element} subtitleElement
   */
  renderItem(itemIndex, query, titleElement, subtitleElement) {
    var item = this._functionItems[itemIndex];
    titleElement.textContent = item.name + (item.arguments ? item.arguments : '');
    QuickOpen.FilteredListWidget.highlightRanges(titleElement, query);
    subtitleElement.textContent = ':' + (item.line + 1);
  }

  /**
   * @override
   * @param {?number} itemIndex
   * @param {string} promptValue
   */
  selectItem(itemIndex, promptValue) {
    if (itemIndex === null)
      return;
    var lineNumber = this._functionItems[itemIndex].line;
    if (!isNaN(lineNumber) && lineNumber >= 0)
      this._selectItemCallback(lineNumber, this._functionItems[itemIndex].column);
  }
};
