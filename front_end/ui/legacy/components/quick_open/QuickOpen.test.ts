// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';

import * as QuickOpen from './quick_open.js';

describe('QuickOpen', () => {
  const mockProviderRegistration: QuickOpen.FilteredListWidget.ProviderRegistration = {
    prefix: '@',
    iconName: 'chevron-right',
    provider: () => Promise.resolve(new QuickOpen.CommandMenu.CommandMenuProvider()),
    helpTitle: () => 'Test',
    titlePrefix: () => 'Test',
    jslogContext: 'test-command',
  };
  setupLocaleHooks();

  afterEach(() => {
    const realProviders = QuickOpen.FilteredListWidget.getRegisteredProviders();
    if (realProviders.at(-1) === mockProviderRegistration) {
      realProviders.pop();
    }
  });

  it('sets jslogContext on provider', async () => {
    sinon.stub(QuickOpen.FilteredListWidget.FilteredListWidget.prototype, 'showAsDialog');
    const setProviderStub = sinon.stub(QuickOpen.FilteredListWidget.FilteredListWidget.prototype, 'setProvider');

    const setProviderCalledPromise = new Promise<void>(resolve => {
      setProviderStub.callsFake(provider => {
        if (provider !== null) {
          resolve();
        }
      });
    });

    const realProviders = QuickOpen.FilteredListWidget.getRegisteredProviders();
    realProviders.push(mockProviderRegistration);

    QuickOpen.QuickOpen.QuickOpenImpl.show('@');

    await setProviderCalledPromise;

    sinon.assert.called(setProviderStub);
    const provider = setProviderStub.lastCall.args[0] as QuickOpen.FilteredListWidget.Provider;
    assert.isNotNull(provider);
    assert.strictEqual(provider.jslogContext, 'test-command');
  });
});
