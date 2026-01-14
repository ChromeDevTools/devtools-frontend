// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import type * as Root from '../../core/root/root.js';
import {createTarget, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as UIHelpers from './helpers.js';

const {urlString} = Platform.DevToolsPath;

describe('openInNewTab', () => {
  const {openInNewTab} = UIHelpers;
  const {InspectorFrontendHostInstance} = Host.InspectorFrontendHost;

  it('throws a TypeError if the URL is invalid', () => {
    assert.throws(() => openInNewTab('ThisIsNotAValidURL'), TypeError);
  });

  it('opens URLs via host bindings', () => {
    const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

    openInNewTab('https://www.google.com/');

    sinon.assert.callCount(stub, 1);
    assert.deepEqual(stub.args[0], ['https://www.google.com/']);
  });

  it('opens URLs and appends slash if needed', () => {
    const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

    openInNewTab('https://www.google.com');

    sinon.assert.callCount(stub, 1);
    assert.deepEqual(stub.args[0], ['https://www.google.com/']);
  });

  it('doesn\'t override existing `utm_source` search parameters', () => {
    const URLs = [
      'http://developer.chrome.com/docs/devtools/workspaces/?utm_source=unittests',
      'http://developers.google.com/learn/?utm_source=unittests',
      'http://web.dev/?utm_source=unittests',
      'http://www.google.com/?utm_source=unittests',
      'https://developer.chrome.com/docs/devtools/?utm_source=unittests',
      'https://developers.google.com/community/?utm_source=unittests',
      'https://www.google.com/?utm_source=unittests',
      'https://web.dev/baseline/?utm_source=unittests',
    ];
    for (const url of URLs) {
      const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

      openInNewTab(url);

      sinon.assert.calledOnceWithExactly(stub, urlString`${url}`);
      stub.restore();
    }
  });

  it('adds `utm_source` search parameter to Google documentation set links', () => {
    const URLs = [
      'http://developer.chrome.com/docs/devtools/workspaces/',
      'http://developers.google.com/learn/',
      'http://web.dev/',
      'https://developer.chrome.com/docs/devtools/',
      'https://developers.google.com/community/',
      'https://web.dev/baseline/',
    ];
    for (const url of URLs) {
      const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

      openInNewTab(url);

      sinon.assert.calledOnce(stub);
      assert.strictEqual(new URL(stub.args[0][0]).searchParams.get('utm_source'), 'devtools');
      stub.restore();
    }
  });

  it('adds `utm_campaign` search parameter to Google documentation set links', () => {
    const CHANNELS: Array<typeof Root.Runtime.hostConfig.channel> = [
      'stable',
      'beta',
      'dev',
      'canary',
    ];
    const URLs = [
      'http://developer.chrome.com/docs/devtools/workspaces/',
      'http://developers.google.com/learn/',
      'http://web.dev/',
      'https://developer.chrome.com/docs/devtools/',
      'https://developers.google.com/community/',
      'https://web.dev/baseline/',
    ];
    for (const channel of CHANNELS) {
      updateHostConfig({channel});

      for (const url of URLs) {
        const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

        openInNewTab(url);

        sinon.assert.calledOnce(stub);
        assert.strictEqual(new URL(stub.args[0][0]).searchParams.get('utm_campaign'), channel);
        stub.restore();
      }
    }
  });

  it('correctly preserves anchors', () => {
    updateHostConfig({channel: 'stable'});
    const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

    openInNewTab('https://developer.chrome.com/docs/devtools/settings/ignore-list/#skip-third-party');

    sinon.assert.calledOnce(stub);
    const url = new URL(stub.args[0][0]);
    assert.strictEqual(url.hash, '#skip-third-party');
    assert.strictEqual(url.searchParams.get('utm_campaign'), 'stable');
    assert.strictEqual(url.searchParams.get('utm_source'), 'devtools');
  });

  it('correctly preserves other search params', () => {
    updateHostConfig({channel: 'stable'});
    const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

    openInNewTab('http://web.dev/route?foo=bar&baz=devtools');

    sinon.assert.calledOnce(stub);
    const url = new URL(stub.args[0][0]);
    assert.strictEqual(url.searchParams.get('baz'), 'devtools');
    assert.strictEqual(url.searchParams.get('foo'), 'bar');
    assert.strictEqual(url.searchParams.get('utm_campaign'), 'stable');
    assert.strictEqual(url.searchParams.get('utm_source'), 'devtools');
  });

  it('does nothing for javascript: urls', () => {
    const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

    openInNewTab('javascript:alert("Hey")');

    sinon.assert.callCount(stub, 0);
  });

  describeWithMockConnection('chrome:// link', () => {
    it('call the correct API for chrome:// links', async () => {
      const target = createTarget();
      const spy = sinon.spy(target.targetAgent(), 'invoke_createTarget');

      openInNewTab('chrome://settings');

      sinon.assert.calledOnce(spy);
      assert.deepEqual(spy.firstCall.firstArg, {url: 'chrome://settings/'});
    });
  });
});
