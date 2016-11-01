/*
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @unrestricted
 */
WebInspector.OpenResourceDialog = class extends WebInspector.FilteredUISourceCodeListDelegate {
  /**
   * @param {!WebInspector.SourcesView} sourcesView
   * @param {!Map.<!WebInspector.UISourceCode, number>} defaultScores
   * @param {!Array<string>} history
   */
  constructor(sourcesView, defaultScores, history) {
    super(defaultScores, history);
    this._sourcesView = sourcesView;
    this.populate();
  }

  /**
   * @param {!WebInspector.SourcesView} sourcesView
   * @param {string} query
   * @param {!Map.<!WebInspector.UISourceCode, number>} defaultScores
   * @param {!Array<string>} history
   */
  static show(sourcesView, query, defaultScores, history) {
    WebInspector.OpenResourceDialog._instanceForTest =
        new WebInspector.OpenResourceDialog(sourcesView, defaultScores, history);
    var filteredItemSelectionDialog =
        new WebInspector.FilteredListWidget(WebInspector.OpenResourceDialog._instanceForTest);
    filteredItemSelectionDialog.showAsDialog();
    filteredItemSelectionDialog.setQuery(query);
  }

  /**
   * @override
   * @param {?WebInspector.UISourceCode} uiSourceCode
   * @param {number=} lineNumber
   * @param {number=} columnNumber
   */
  uiSourceCodeSelected(uiSourceCode, lineNumber, columnNumber) {
    if (!uiSourceCode)
      uiSourceCode = this._sourcesView.currentUISourceCode();
    if (!uiSourceCode)
      return;
    this._sourcesView.showSourceLocation(uiSourceCode, lineNumber, columnNumber);
  }

  /**
   * @override
   * @param {string} query
   * @return {boolean}
   */
  shouldShowMatchingItems(query) {
    return !query.startsWith(':');
  }

  /**
   * @override
   * @param {!WebInspector.Project} project
   * @return {boolean}
   */
  filterProject(project) {
    return !WebInspector.Project.isServiceProject(project);
  }

  /**
   * @override
   * @return {boolean}
   */
  renderAsTwoRows() {
    return true;
  }
};


/**
 * @unrestricted
 */
WebInspector.SelectUISourceCodeForProjectTypesDialog = class extends WebInspector.FilteredUISourceCodeListDelegate {
  /**
   * @param {!Array.<string>} types
   * @param {function(?WebInspector.UISourceCode)} callback
   */
  constructor(types, callback) {
    super();
    this._types = types;
    this._callback = callback;
    this.populate();
  }

  /**
   * @param {string} name
   * @param {!Array.<string>} types
   * @param {function(?WebInspector.UISourceCode)} callback
   */
  static show(name, types, callback) {
    var filteredItemSelectionDialog =
        new WebInspector.FilteredListWidget(new WebInspector.SelectUISourceCodeForProjectTypesDialog(types, callback));
    filteredItemSelectionDialog.showAsDialog();
    filteredItemSelectionDialog.setQuery(name);
  }

  /**
   * @override
   * @param {?WebInspector.UISourceCode} uiSourceCode
   * @param {number=} lineNumber
   * @param {number=} columnNumber
   */
  uiSourceCodeSelected(uiSourceCode, lineNumber, columnNumber) {
    this._callback(uiSourceCode);
  }

  /**
   * @override
   * @param {!WebInspector.Project} project
   * @return {boolean}
   */
  filterProject(project) {
    return this._types.indexOf(project.type()) !== -1;
  }

  /**
   * @override
   * @return {boolean}
   */
  renderAsTwoRows() {
    return true;
  }
};
