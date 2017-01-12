/*
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @unrestricted
 */
Sources.OpenResourceDialog = class extends Sources.FilteredUISourceCodeListDelegate {
  /**
   * @param {!Sources.SourcesView} sourcesView
   * @param {!Map.<!Workspace.UISourceCode, number>} defaultScores
   */
  constructor(sourcesView, defaultScores) {
    super(defaultScores);
    this._sourcesView = sourcesView;
    this.populate();
  }

  /**
   * @param {!Sources.SourcesView} sourcesView
   * @param {string} query
   * @param {!Map.<!Workspace.UISourceCode, number>} defaultScores
   * @param {!Array<string>} history
   */
  static show(sourcesView, query, defaultScores, history) {
    var dialog = new Sources.OpenResourceDialog(sourcesView, defaultScores);
    if (InspectorFrontendHost.isUnderTest())
      Sources.OpenResourceDialog._instanceForTest = dialog;
    var filteredItemSelectionDialog = new QuickOpen.FilteredListWidget(dialog, history);
    filteredItemSelectionDialog.showAsDialog();
    filteredItemSelectionDialog.setQuery(query);
  }

  /**
   * @override
   * @param {?Workspace.UISourceCode} uiSourceCode
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
   * @param {!Workspace.Project} project
   * @return {boolean}
   */
  filterProject(project) {
    return !project.isServiceProject();
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
Sources.SelectUISourceCodeForProjectTypesDialog = class extends Sources.FilteredUISourceCodeListDelegate {
  /**
   * @param {!Array.<string>} types
   * @param {function(?Workspace.UISourceCode)} callback
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
   * @param {function(?Workspace.UISourceCode)} callback
   */
  static show(name, types, callback) {
    var filteredItemSelectionDialog =
        new QuickOpen.FilteredListWidget(new Sources.SelectUISourceCodeForProjectTypesDialog(types, callback));
    filteredItemSelectionDialog.showAsDialog();
    filteredItemSelectionDialog.setQuery(name);
  }

  /**
   * @override
   * @param {?Workspace.UISourceCode} uiSourceCode
   * @param {number=} lineNumber
   * @param {number=} columnNumber
   */
  uiSourceCodeSelected(uiSourceCode, lineNumber, columnNumber) {
    this._callback(uiSourceCode);
  }

  /**
   * @override
   * @param {!Workspace.Project} project
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
