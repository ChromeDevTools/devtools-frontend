// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from './i18n.js';

describe('fetchAndRegisterLocaleData', () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(window, 'fetch');
    fetchStub.returns(Promise.resolve(new window.Response(JSON.stringify({}), {
      // Always return an empty JSON object.
      status: 200,
      headers: {'Content-type': 'application/json'},
    })));
  });

  afterEach(() => {
    fetchStub.restore();
    i18n.i18n.resetLocaleDataForTest();
  });

  const bundled = 'devtools://devtools/bundled/devtools_app.html';
  const version = '@ffe848af6a5df4fa127e2929331116b7f9f1cb30';
  const remoteOrigin = 'https://chrome-devtools-frontend.appspot.com/';
  const remote = `${remoteOrigin}serve_file/${version}/`;
  const fullLocation = `${bundled}?remoteBase=${remote}&can_dock=true&dockSide=undocked`;

  it('fetches bundled locale files the same way as i18nImpl.ts itself is loaded', async () => {
    await i18n.i18n.fetchAndRegisterLocaleData('en-US', fullLocation);

    // We can't mock `import.meta.url` from i18nImpl so the Karam host leaks into
    // this test. This means we only check the last part of the URL with which `fetch`
    // was called.
    const actualUrl = fetchStub.args[0][0];
    assert.isTrue(actualUrl.endsWith('front_end/core/i18n/locales/en-US.json'), `Actually called with ${actualUrl}`);
  });

  it('fetches non-bundled locale files from the remote service endpoint', async () => {
    await i18n.i18n.fetchAndRegisterLocaleData('de', fullLocation);

    assert.isTrue(
        fetchStub.calledWith(
            'devtools://devtools/remote/serve_file/@ffe848af6a5df4fa127e2929331116b7f9f1cb30/core/i18n/locales/de.json'),
        `Actually called with ${fetchStub.args[0][0]}`);
  });
});
