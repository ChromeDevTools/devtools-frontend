// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as UI from '../ui/ui.js';  // eslint-disable-line no-unused-vars

import {FilteredListWidget, getRegisteredProviders, Provider} from './FilteredListWidget.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  * @description Text in Quick Open of the Command Menu
  */
  typeToSeeAvailableCommands: 'Type \'?\' to see available commands',
  /**
  * @description Aria-placeholder text for quick open dialog prompt
  */
  typeQuestionMarkToSeeAvailable: 'Type question mark to see available commands',
};
const str_ = i18n.i18n.registerUIStrings('quick_open/QuickOpen.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/** @type {!Array<string>} */
export const history = [];

export class QuickOpenImpl {
  constructor() {
    /** @type {?string} */
    this._prefix = null;
    this._query = '';
    /** @type {!Map<string, function():!Provider>} */
    this._providers = new Map();
    /** @type {!Array<string>} */
    this._prefixes = [];
    /** @type {?FilteredListWidget} */
    this._filteredListWidget = null;

    getRegisteredProviders().forEach(this._addProvider.bind(this));
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
        i18nString(UIStrings.typeToSeeAvailableCommands), i18nString(UIStrings.typeQuestionMarkToSeeAvailable));
    filteredListWidget.showAsDialog();
    filteredListWidget.setQuery(query);
  }

  /**
   * @param {!{prefix: string, provider: function(): !Provider}} extension
   */
  _addProvider(extension) {
    const prefix = extension.prefix;
    if (prefix === null) {
      return;
    }
    this._prefixes.push(prefix);
    this._providers.set(prefix, extension.provider);
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
    if (!this._filteredListWidget) {
      return;
    }
    this._filteredListWidget.setPrefix(prefix);
    this._filteredListWidget.setProvider(null);
    const providerFunction = this._providers.get(prefix);
    if (!providerFunction) {
      return;
    }
    const provider = providerFunction();
    if (this._prefix !== prefix || !this._filteredListWidget) {
      return;
    }
      this._filteredListWidget.setProvider(provider);
      this._providerLoadedForTest(provider);
  }

  /**
   * @param {!Provider} provider
   */
  _providerLoadedForTest(provider) {
  }
}

/** @type {!ShowActionDelegate} */
let showActionDelegateInstance;

/**
 * @implements {UI.ActionRegistration.ActionDelegate}
 */
export class ShowActionDelegate {
  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!showActionDelegateInstance || forceNew) {
      showActionDelegateInstance = new ShowActionDelegate();
    }

    return showActionDelegateInstance;
  }

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
