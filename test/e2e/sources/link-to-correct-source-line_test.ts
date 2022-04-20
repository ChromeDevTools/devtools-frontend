// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {expandIssue, navigateToIssuesTab, revealViolatingSourcesLines} from '../helpers/issues-helpers.js';
import {waitForHighlightedLine} from '../helpers/sources-helpers.js';

describe('The Issues tab', async () => {
  it('should highlight the blocked inline <script> in the Sources panel when the link is clicked', async () => {
    await goToResource('sources/csp-blocked-inline-script.html');

    await navigateToIssuesTab();
    await expandIssue();
    await revealViolatingSourcesLines();

    await waitForHighlightedLine(8);
  });

  it('should highlight the blocked eval call in the Sources panel when the link is clicked', async () => {
    await goToResource('sources/csp-blocked-eval.html');

    await navigateToIssuesTab();
    await expandIssue();
    await revealViolatingSourcesLines();

    await waitForHighlightedLine(8);
  });
});
