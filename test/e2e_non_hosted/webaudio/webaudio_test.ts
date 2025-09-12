// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';

describe('The WebAudio Panel', () => {
  it('Listens for audio contexts', async ({devToolsPage, inspectedPage}) => {
    await openPanelViaMoreTools('WebAudio', devToolsPage);
    await devToolsPage.waitFor('div[aria-label="WebAudio panel"]');

    await inspectedPage.goToResource('webaudio/default.html');

    await devToolsPage.waitFor('.web-audio-details-container');
    await devToolsPage.waitFor('.context-detail-container');
    await devToolsPage.waitForNone('.web-audio-landing-page');
  });
});
