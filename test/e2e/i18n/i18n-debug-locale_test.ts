// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {setDevToolsSettings, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {getMessageContents, waitForTheCoveragePanelToLoad} from '../helpers/coverage-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('With en-US locale (default)', () => {
  it('check that the reload button has the correct text', async () => {
    await waitForTheCoveragePanelToLoad();
    const message = await getMessageContents();

    assert.include(message, 'Click the reload button');
  });
});

describe('With en-XL locale (debug)', () => {
  it('renders the translated text for the reload button', async () => {
    await setDevToolsSettings({language: 'en-XL'});

    await openPanelViaMoreTools('Ĉóv̂ér̂áĝé', true);
    await waitFor('div[aria-label="Ĉóv̂ér̂áĝé p̂án̂él̂"]');
    await waitFor('.coverage-results .landing-page');
    const message = await getMessageContents();

    assert.include(message, 'Ĉĺîćk̂ t́ĥé r̂él̂óâd́ b̂út̂t́ôń');
  });
});
