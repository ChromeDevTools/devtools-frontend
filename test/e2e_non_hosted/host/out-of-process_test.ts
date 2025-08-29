// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

describe('The Host browser', () => {
  it('resolves .test domains to localhost and OOPIFs work as intended', async ({inspectedPage, browser}) => {
    await inspectedPage.goToResourceWithCustomHost('devtools.test', 'host/page-with-oopif.html');

    const iframeTarget = browser.browser.targets().find(
        target => target.type() === 'other' && target.url().startsWith('https://devtools.oopif.test'));
    assert.exists(iframeTarget);
  });
});
