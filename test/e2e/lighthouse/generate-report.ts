// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {isGenerateReportButtonDisabled, navigateToLighthouseTab} from '../helpers/lighthouse-helpers.js';

describe('The Lighthouse Tab', async () => {
  it('shows a button to generate a new report', async () => {
    await navigateToLighthouseTab('empty');

    const disabled = await isGenerateReportButtonDisabled();
    assert.isFalse(disabled, 'The Generate Report button should not be disabled');
  });

  // Broken on non-debug runs
  it.skip('[crbug.com/1057948] shows generate report button even when navigating to an unreachable page', async () => {
    await navigateToLighthouseTab('empty');

    await goToResource('network/unreachable.rawresponse');
    const disabled = await isGenerateReportButtonDisabled();
    assert.isTrue(disabled, 'The Generate Report button should be disabled');
  });
});
