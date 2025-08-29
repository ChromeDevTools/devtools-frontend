// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

// Needed to make use of the global declaration in ExtensionAPI.js of window.chrome.
// But if we make this a side-effect import, it will persist at compile type.
// So we import a type that we don't use to make TS realise it's just an import
// to declare some type, and it gets stripped at runtime.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import {loadExtension} from '../../e2e/helpers/extension-helpers.js';
import {getTextFilterContent, waitForNetworkTab} from '../../e2e/helpers/network-helpers.js';

describe('The Extension API', () => {
  it('can reveal the network panel', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension('TestExtension', undefined, undefined, devToolsPage, inspectedPage);

    await extension.evaluate(() => window.chrome.devtools.panels.network.show());

    await waitForNetworkTab(devToolsPage);
  });

  it('can reveal the network panel with filters', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension('TestExtension', undefined, undefined, devToolsPage, inspectedPage);

    await extension.evaluate(() => window.chrome.devtools.panels.network.show({filter: 'foobar'}));

    await waitForNetworkTab(devToolsPage);

    const textFilterContent = await getTextFilterContent(devToolsPage);
    assert.strictEqual('foobar ', textFilterContent);
  });
});
