// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as UI from '../../legacy.js';

import {getRegisteredProviders, Provider, registerProvider, type ProviderRegistration} from './FilteredListWidget.js';
import {QuickOpenImpl} from './QuickOpen.js';

export class HelpQuickOpen extends Provider {
  private providers: Array<{
    prefix: string,
    iconName: string,
    title: string,
    jslogContext: string,
  }>;

  constructor(jslogContext: string) {
    super(jslogContext);
    this.providers = [];
    getRegisteredProviders().forEach(this.addProvider.bind(this));
  }

  private async addProvider(extension: ProviderRegistration): Promise<void> {
    this.providers.push({
      prefix: extension.prefix || '',
      iconName: extension.iconName,
      title: extension.helpTitle(),
      jslogContext: (await extension.provider()).jslogContext,
    });
  }

  override itemCount(): number {
    return this.providers.length;
  }

  override itemKeyAt(itemIndex: number): string {
    return this.providers[itemIndex].prefix;
  }

  override itemScoreAt(itemIndex: number, _query: string): number {
    return -this.providers[itemIndex].prefix.length;
  }

  override renderItem(itemIndex: number, _query: string, titleElement: Element, _subtitleElement: Element): void {
    const provider = this.providers[itemIndex];

    const iconElement = new IconButton.Icon.Icon();
    iconElement.data = {
      iconName: provider.iconName,
      color: 'var(--icon-default)',
      width: '18px',
    };
    titleElement.parentElement?.parentElement?.insertBefore(iconElement, titleElement.parentElement);

    UI.UIUtils.createTextChild(titleElement, provider.title);
  }

  override jslogContextAt(itemIndex: number): string {
    return this.providers[itemIndex].jslogContext;
  }

  override selectItem(itemIndex: number|null, _promptValue: string): void {
    if (itemIndex !== null) {
      QuickOpenImpl.show(this.providers[itemIndex].prefix);
    }
  }

  override renderAsTwoRows(): boolean {
    return false;
  }
}

registerProvider({
  prefix: '?',
  iconName: 'help',
  provider: () => Promise.resolve(new HelpQuickOpen('help')),
  helpTitle: () => 'Help',
  titlePrefix: () => 'Help',
  titleSuggestion: undefined,
});
