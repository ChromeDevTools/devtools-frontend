// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {waitForSelectedTreeElementSelectorWhichIncludesText} from '../helpers/elements-helpers.js';
import {expandIssue, navigateToIssuesTab, revealNodeInElementsPanel} from '../helpers/issues-helpers.js';

// TODO: Add a second node reveal test, where am issue is produced by an OOPIF

describe('The Issues tab', async () => {
  it('should reveal an element in the Elements panelwhen the node icon is clicked', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');

    await navigateToIssuesTab();
    await expandIssue();
    await revealNodeInElementsPanel();

    await waitForSelectedTreeElementSelectorWhichIncludesText('alert("This should be blocked by CSP");');
  });
});
