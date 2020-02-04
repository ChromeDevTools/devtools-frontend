// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../ui/ui.js';  // eslint-disable-line no-unused-vars

import {FilteredListWidget, Provider} from './FilteredListWidget.js';

export const history = [];

/**
 * @unrestricted
 */
export class QuickOpenImpl {
  constructor() {
    this._prefix = null;
    this._query = '';
    /** @type {!Map<string, function():!Promise<!Provider>>} */
    this._providers = new Map();
    /** @type {!Array<string>} */
    this._prefixes = [];
    this._filteredListWidget = null;
    self.runtime.extensions(Provider).forEach(this._addProvider.bind(this));
    this._prefixes.sort((a, b) => b.length - a.length);
  }

  /**
   * @param {string} query
   */
  static show(query) {
    const quickOpen = new this();
    const filteredListWidget = new FilteredListWidget(null, history, quickOpen._queryChanged.bind(quickOpen));
    quickOpen._filteredListWidget = filteredListWidget;
    filteredListWidget.setPlaceholder(
        ls`Type '?' to see available commands`, ls`Type question mark to see available commands`);
    filteredListWidget.showAsDialog();
    filteredListWidget.setQuery(query);
  }

  /**
   * @param {!Root.Runtime.Extension} extension
   */
  _addProvider(extension) {
    const prefix = extension.descriptor()['prefix'];
    this._prefixes.push(prefix);
    this._providers.set(
        prefix, /** @type {function():!Promise<!Provider>} */
        (extension.instance.bind(extension)));
  }

  /**
   * @param {string} query
   */
  _queryChanged(query) {
    const prefix = this._prefixes.find(prefix => query.startsWith(prefix));
    if (typeof prefix !== 'string' || this._prefix === prefix) {
      return;
    }

    this._prefix = prefix;
    this._filteredListWidget.setPrefix(prefix);
    this._filteredListWidget.setProvider(null);
    this._providers.get(prefix)().then(provider => {
      if (this._prefix !== prefix) {
        return;
      }
      this._filteredListWidget.setProvider(provider);
      this._providerLoadedForTest(provider);
    });
  }

  /**
   * @param {!Provider} provider
   */
  _providerLoadedForTest(provider) {
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 */
export class ShowActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    switch (actionId) {
      case 'quickOpen.show':
        QuickOpenImpl.show('');
        return true;
    }
    return false;
  }
}
