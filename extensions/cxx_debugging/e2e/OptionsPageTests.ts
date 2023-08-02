// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {getBrowserAndPages, goTo, waitForFunction} from 'test/shared/helper.js';

import {getTestsuiteResourcesPath} from './cxx-debugging-extension-helpers.js';

// These tests abuse the test suite rigging a little, because we will interact with the options page directly instead of
// through the frontend.
describe('The options page', () => {
  it('shows third-party licenses', async () => {
    await goTo(`${getTestsuiteResourcesPath()}/cxx_debugging/gen/ExtensionOptions.html`);

    const {target} = await getBrowserAndPages();

    const expectedCredits = ['Emscripten', 'LLVM', 'lit-html', 'lldb-eval'];
    const credits = await waitForFunction(async () => {
      const elements = await target.$$('pierce/devtools-cxx-debugging-credits-item');
      if (elements.length < expectedCredits.length) {
        return undefined;
      }
      return await Promise.all(elements.map(async e => {
        const titleElement = await e.$('pierce/.title');
        const title = await titleElement?.evaluate(e => e.textContent ?? undefined);
        return {title};
      }));
    });

    assert.sameMembers(credits.map(({title}) => title), expectedCredits);
  });

  // TODO(chromium:1246836) It would be great to also test the remapping behavior, but this won't be possible until real
  // e2e tests are possible.
});
