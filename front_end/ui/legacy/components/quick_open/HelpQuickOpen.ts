// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as UI from '../../legacy.js';

import {getRegisteredProviders, Provider, registerProvider, type ProviderRegistration} from './FilteredListWidget.js';
import {QuickOpenImpl} from './QuickOpen.js';

export class HelpQuickOpen extends Provider {
  private providers: {
    prefix: string,
    iconName: string,
    iconWidth: string,
    title: string,
  }[];

  constructor() {
    super();
    this.providers = [];
    getRegisteredProviders().forEach(this.addProvider.bind(this));
  }

  private addProvider(extension: ProviderRegistration): void {
    if (extension.titleSuggestion) {
      this.providers.push({
        prefix: extension.prefix || '',
        iconName: extension.iconName,
        iconWidth: extension.iconWidth,
        title: extension.titlePrefix() + ' ' + extension.titleSuggestion(),
      });
    }
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
      width: provider.iconWidth,
    };
    titleElement.parentElement?.parentElement?.insertBefore(iconElement, titleElement.parentElement);

    UI.UIUtils.createTextChild(titleElement, provider.title);
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
  iconWidth: '20px',
  provider: () => Promise.resolve(new HelpQuickOpen()),
  titlePrefix: () => 'Help',
  titleSuggestion: undefined,
});
