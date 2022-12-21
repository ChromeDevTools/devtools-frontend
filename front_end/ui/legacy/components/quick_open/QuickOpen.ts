// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import type * as UI from '../../legacy.js';

import {FilteredListWidget, getRegisteredProviders, type Provider} from './FilteredListWidget.js';

const UIStrings = {
  /**
   * @description Text of the hint shows under Quick Open input box
   */
  typeToSeeAvailableCommands: 'Type ? to see available commands',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/quick_open/QuickOpen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const history: string[] = [];

export class QuickOpenImpl {
  private prefix: string|null;
  private readonly prefixes: string[];
  private providers: Map<string, {
    provider: () => Promise<Provider>,
    titlePrefix: (() => string),
    titleSuggestion?: (() => string),
  }>;
  private filteredListWidget: FilteredListWidget|null;

  constructor() {
    this.prefix = null;
    this.prefixes = [];
    this.providers = new Map();
    this.filteredListWidget = null;

    getRegisteredProviders().forEach(this.addProvider.bind(this));
    this.prefixes.sort((a, b) => b.length - a.length);
  }

  static show(query: string): void {
    const quickOpen = new this();
    const filteredListWidget = new FilteredListWidget(null, history, quickOpen.queryChanged.bind(quickOpen));
    quickOpen.filteredListWidget = filteredListWidget;
    filteredListWidget.setHintElement(i18nString(UIStrings.typeToSeeAvailableCommands));
    filteredListWidget.showAsDialog();
    filteredListWidget.setQuery(query);
  }

  private addProvider(extension: {
    prefix: string,
    provider: () => Promise<Provider>,
    titlePrefix: () => string,
    titleSuggestion?: (() => string),
  }): void {
    const prefix = extension.prefix;
    if (prefix === null) {
      return;
    }
    this.prefixes.push(prefix);
    this.providers.set(prefix, {
      provider: extension.provider,
      titlePrefix: extension.titlePrefix,
      titleSuggestion: extension.titleSuggestion,
    });
  }

  private async queryChanged(query: string): Promise<void> {
    const prefix = this.prefixes.find(prefix => query.startsWith(prefix));
    if (typeof prefix !== 'string') {
      return;
    }

    if (!this.filteredListWidget) {
      return;
    }
    this.filteredListWidget.setPrefix(prefix);
    const titlePrefixFunction = this.providers.get(prefix)?.titlePrefix;
    this.filteredListWidget.setCommandPrefix(titlePrefixFunction ? titlePrefixFunction() : '');
    const titleSuggestionFunction = (query === prefix) && this.providers.get(prefix)?.titleSuggestion;
    this.filteredListWidget.setCommandSuggestion(titleSuggestionFunction ? titleSuggestionFunction() : '');

    if (this.prefix === prefix) {
      return;
    }
    this.prefix = prefix;
    this.filteredListWidget.setProvider(null);
    const providerFunction = this.providers.get(prefix)?.provider;
    if (!providerFunction) {
      return;
    }

    const provider = await providerFunction();
    if (this.prefix !== prefix || !this.filteredListWidget) {
      return;
    }
    this.filteredListWidget.setProvider(provider);
    this.providerLoadedForTest(provider);
  }

  private providerLoadedForTest(_provider: Provider): void {
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
