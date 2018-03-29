// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Sources.SearchSourcesView = class extends Search.SearchView {
  constructor() {
    super('sources');
  }

  /**
   * @param {string} query
   * @param {boolean=} searchImmediately
   * @return {!Promise<!Search.SearchView>}
   */
  static async openSearch(query, searchImmediately) {
    await UI.viewManager.showView('sources.search-sources-tab');
    const searchView =
        /** @type {!Search.SearchView} */ (self.runtime.sharedInstance(Sources.SearchSourcesView));
    searchView.toggle(query, !!searchImmediately);
    return searchView;
  }

  /**
   * @override
   * @return {!Search.SearchScope}
   */
  createScope() {
    return new Sources.SourcesSearchScope();
  }
};

/**
 * @implements {UI.ActionDelegate}
 */
Sources.SearchSourcesView.ActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    this._showSearch();
    return true;
  }

  /**
   * @return {!Promise}
   */
  _showSearch() {
    const selection = UI.inspectorView.element.window().getSelection();
    let queryCandidate = '';
    if (selection.rangeCount)
      queryCandidate = selection.toString().replace(/\r?\n.*/, '');

    return Sources.SearchSourcesView.openSearch(queryCandidate);
  }
};
