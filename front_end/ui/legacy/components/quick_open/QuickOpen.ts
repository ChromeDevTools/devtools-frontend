// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../../../../core/i18n/i18n.js';
import type * as UI from '../../legacy.js'; // eslint-disable-line no-unused-vars

import type {Provider} from './FilteredListWidget.js';
import {FilteredListWidget, getRegisteredProviders} from './FilteredListWidget.js';  // eslint-disable-line no-unused-vars

const UIStrings = {
  /**
  * @description Text in Quick Open of the Command Menu
  */
  typeToSeeAvailableCommands: 'Type \'?\' to see available commands',
  /**
  * @description Aria-placeholder text for quick open dialog prompt
  */
  typeQuestionMarkToSeeAvailable: 'Type question mark to see available commands',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/quick_open/QuickOpen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const history: string[] = [];

export class QuickOpenImpl {
  _prefix: string|null;
  _query: string;
  _providers: Map<string, () => Promise<Provider>>;
  _prefixes: string[];
  _filteredListWidget: FilteredListWidget|null;
  constructor() {
    this._prefix = null;
    this._query = '';
    this._providers = new Map();
    this._prefixes = [];
    this._filteredListWidget = null;

    getRegisteredProviders().forEach(this._addProvider.bind(this));
    this._prefixes.sort((a, b) => b.length - a.length);
  }

  static show(query: string): void {
    const quickOpen = new this();
    const filteredListWidget = new FilteredListWidget(null, history, quickOpen._queryChanged.bind(quickOpen));
    quickOpen._filteredListWidget = filteredListWidget;
    filteredListWidget.setPlaceholder(
        i18nString(UIStrings.typeToSeeAvailableCommands), i18nString(UIStrings.typeQuestionMarkToSeeAvailable));
    filteredListWidget.showAsDialog();
    filteredListWidget.setQuery(query);
  }

  _addProvider(extension: {
    prefix: string,
    provider: () => Promise<Provider>,
  }): void {
    const prefix = extension.prefix;
    if (prefix === null) {
      return;
    }
    this._prefixes.push(prefix);
    this._providers.set(prefix, extension.provider);
  }

  _queryChanged(query: string): void {
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
    providerFunction().then(provider => {
      if (this._prefix !== prefix || !this._filteredListWidget) {
        return;
      }
      this._filteredListWidget.setProvider(provider);
      this._providerLoadedForTest(provider);
    });
  }

  _providerLoadedForTest(_provider: Provider): void {
  }
}

let showActionDelegateInstance: ShowActionDelegate;

export class ShowActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ShowActionDelegate {
    const {forceNew} = opts;
    if (!showActionDelegateInstance || forceNew) {
      showActionDelegateInstance = new ShowActionDelegate();
    }

    return showActionDelegateInstance;
  }

  handleAction(context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'quickOpen.show':
        QuickOpenImpl.show('');
        return true;
    }
    return false;
  }
}
