// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as UI from '../../legacy.js';
import { getRegisteredProviders, Provider, registerProvider } from './FilteredListWidget.js';
import { QuickOpenImpl } from './QuickOpen.js';
export class HelpQuickOpen extends Provider {
    providers;
    constructor(jslogContext) {
        super(jslogContext);
        this.providers = [];
        getRegisteredProviders().forEach(this.addProvider.bind(this));
    }
    async addProvider(extension) {
        this.providers.push({
            prefix: extension.prefix || '',
            iconName: extension.iconName,
            title: extension.helpTitle(),
            jslogContext: (await extension.provider()).jslogContext,
        });
    }
    itemCount() {
        return this.providers.length;
    }
    itemKeyAt(itemIndex) {
        return this.providers[itemIndex].prefix;
    }
    itemScoreAt(itemIndex, _query) {
        return -this.providers[itemIndex].prefix.length;
    }
    renderItem(itemIndex, _query, titleElement, _subtitleElement) {
        const provider = this.providers[itemIndex];
        const iconElement = new IconButton.Icon.Icon();
        iconElement.name = provider.iconName;
        iconElement.classList.add('large');
        titleElement.parentElement?.parentElement?.insertBefore(iconElement, titleElement.parentElement);
        UI.UIUtils.createTextChild(titleElement, provider.title);
    }
    jslogContextAt(itemIndex) {
        return this.providers[itemIndex].jslogContext;
    }
    selectItem(itemIndex, _promptValue) {
        if (itemIndex !== null) {
            QuickOpenImpl.show(this.providers[itemIndex].prefix);
        }
    }
    renderAsTwoRows() {
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
//# sourceMappingURL=HelpQuickOpen.js.map