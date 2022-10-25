// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as UI from '../../legacy.js';

import {getRegisteredProviders, Provider, registerProvider} from './FilteredListWidget.js';
import {QuickOpenImpl} from './QuickOpen.js';

export class HelpQuickOpen extends Provider {
  private providers: {
    prefix: string,
    iconName: string,
    title: string,
  }[];

  constructor() {
    super();
    this.providers = [];
    getRegisteredProviders().forEach(this.addProvider.bind(this));
  }

  private addProvider(extension: {
    prefix: string,
    iconName: string,
    titlePrefix: () => string,
    titleSuggestion?: () => string,
  }): void {
    if (extension.titleSuggestion) {
      this.providers.push({
        prefix: extension.prefix || '',
        iconName: extension.iconName,
        title: extension.titlePrefix() + ' ' + extension.titleSuggestion(),
      });
    }
  }

  itemCount(): number {
    return this.providers.length;
  }

  itemKeyAt(itemIndex: number): string {
    return this.providers[itemIndex].prefix;
  }

  itemScoreAt(itemIndex: number, _query: string): number {
    return -this.providers[itemIndex].prefix.length;
  }

  renderItem(itemIndex: number, _query: string, titleElement: Element, _subtitleElement: Element): void {
    const provider = this.providers[itemIndex];

    const iconElement = new IconButton.Icon.Icon();
    iconElement.data = {
      iconName: provider.iconName,
      color: 'var(--color-text-primary)',
      width: '18px',
      height: '18px',
    };
    titleElement.parentElement?.parentElement?.insertBefore(iconElement, titleElement.parentElement);

    UI.UIUtils.createTextChild(titleElement, provider.title);
  }

  selectItem(itemIndex: number|null, _promptValue: string): void {
    if (itemIndex !== null) {
      QuickOpenImpl.show(this.providers[itemIndex].prefix);
    }
  }

  renderAsTwoRows(): boolean {
    return false;
  }
}

registerProvider({
  prefix: '?',
  iconName: 'ic_command_help',
  provider: () => Promise.resolve(new HelpQuickOpen()),
  titlePrefix: () => 'Help',
  titleSuggestion: undefined,
});
