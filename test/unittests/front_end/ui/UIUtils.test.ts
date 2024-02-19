// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as Platform from '../../../../front_end/core/platform/platform.js';
import * as UI from '../../../../front_end/ui/legacy/legacy.js';

describe('addReferrerToURL', () => {
  it('correctly adds referrer info to URLs', () => {
    assert.strictEqual(
        UI.UIUtils.addReferrerToURL('https://www.domain.com/route' as Platform.DevToolsPath.UrlString),
        'https://www.domain.com/route?utm_source=devtools');
    assert.strictEqual(
        UI.UIUtils.addReferrerToURL('https://www.domain.com/route#anchor' as Platform.DevToolsPath.UrlString),
        'https://www.domain.com/route?utm_source=devtools#anchor');
    assert.strictEqual(
        UI.UIUtils.addReferrerToURL('https://www.domain.com/route?key=value' as Platform.DevToolsPath.UrlString),
        'https://www.domain.com/route?key=value&utm_source=devtools');
    assert.strictEqual(
        UI.UIUtils.addReferrerToURL('https://www.domain.com/route?key=value#anchor' as Platform.DevToolsPath.UrlString),
        'https://www.domain.com/route?key=value&utm_source=devtools#anchor');
    assert.strictEqual(
        UI.UIUtils.addReferrerToURL(
            'https://www.domain.com/route?utm_source=devtools#anchor' as Platform.DevToolsPath.UrlString),
        'https://www.domain.com/route?utm_source=devtools#anchor');
    assert.strictEqual(
        UI.UIUtils.addReferrerToURL(
            'https://www.domain.com/route?key=value&utm_source=devtools#anchor' as Platform.DevToolsPath.UrlString),
        'https://www.domain.com/route?key=value&utm_source=devtools#anchor');
  });
});

describe('addReferrerToURLIfNecessary', () => {
  it('correctly adds referrer for web.dev and developers.google.com', () => {
    assert.strictEqual(
        UI.UIUtils.addReferrerToURLIfNecessary('https://web.dev/route' as Platform.DevToolsPath.UrlString),
        'https://web.dev/route?utm_source=devtools');
    assert.strictEqual(
        UI.UIUtils.addReferrerToURLIfNecessary(
            'https://developers.google.com/route#anchor' as Platform.DevToolsPath.UrlString),
        'https://developers.google.com/route?utm_source=devtools#anchor');
    assert.strictEqual(
        UI.UIUtils.addReferrerToURLIfNecessary(
            'https://www.domain.com/web.dev/route' as Platform.DevToolsPath.UrlString),
        'https://www.domain.com/web.dev/route');
    assert.strictEqual(
        UI.UIUtils.addReferrerToURLIfNecessary(
            'https://foo.developers.google.com/route#anchor' as Platform.DevToolsPath.UrlString),
        'https://foo.developers.google.com/route#anchor');
  });
});
