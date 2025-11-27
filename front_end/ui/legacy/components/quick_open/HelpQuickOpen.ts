// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../components/icon_button/icon_button.js';

import {html, type TemplateResult} from '../../../lit/lit.js';

import {getRegisteredProviders, Provider, type ProviderRegistration, registerProvider} from './FilteredListWidget.js';
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

  override renderItem(itemIndex: number, _query: string): TemplateResult {
    const provider = this.providers[itemIndex];
    // clang-format off
    return html`
      <devtools-icon class="large" name=${provider.iconName}></devtools-icon>
      <div>
        <div>${provider.title}</div>
      </div>`;
    // clang-format on
  }

  override jslogContextAt(itemIndex: number): string {
    return this.providers[itemIndex].jslogContext;
  }

  override selectItem(itemIndex: number|null, _promptValue: string): void {
    if (itemIndex !== null) {
      QuickOpenImpl.show(this.providers[itemIndex].prefix);
    }
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
