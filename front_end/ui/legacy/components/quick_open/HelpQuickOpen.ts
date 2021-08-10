// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../legacy.js';

import {getRegisteredProviders, Provider, registerProvider} from './FilteredListWidget.js';
import {QuickOpenImpl} from './QuickOpen.js';

let helpQuickOpenInstance: HelpQuickOpen;

export class HelpQuickOpen extends Provider {
  private providers: {
    prefix: string,
    title: string,
  }[];

  private constructor() {
    super();
    this.providers = [];
    getRegisteredProviders().forEach(this.addProvider.bind(this));
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): HelpQuickOpen {
    const {forceNew} = opts;
    if (!helpQuickOpenInstance || forceNew) {
      helpQuickOpenInstance = new HelpQuickOpen();
    }
    return helpQuickOpenInstance;
  }

  private addProvider(extension: {
    prefix: string,
    title?: () => string,
  }): void {
    if (extension.title) {
      this.providers.push({prefix: extension.prefix || '', title: extension.title()});
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
    const prefixElement = titleElement.createChild('span', 'monospace');
    prefixElement.textContent = (provider.prefix || '…') + ' ';
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
  title: undefined,
  provider: () => Promise.resolve(HelpQuickOpen.instance()),
});
