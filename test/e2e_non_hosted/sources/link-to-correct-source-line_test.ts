// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {expandIssue, navigateToIssuesTab, revealViolatingSourcesLines} from '../../e2e/helpers/issues-helpers.js';
import {waitForHighlightedLine} from '../../e2e/helpers/sources-helpers.js';

describe('The Issues tab', () => {
  it('should highlight the blocked inline <script> in the Sources panel when the link is clicked',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('sources/csp-blocked-inline-script.html');

       await navigateToIssuesTab(devToolsPage);
       await expandIssue(devToolsPage);
       await revealViolatingSourcesLines(devToolsPage);

       await waitForHighlightedLine(8, devToolsPage);
     });

  it('should highlight the blocked eval call in the Sources panel when the link is clicked',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('sources/csp-blocked-eval.html');

       await navigateToIssuesTab(devToolsPage);
       await expandIssue(devToolsPage);
       await revealViolatingSourcesLines(devToolsPage);

       await waitForHighlightedLine(8, devToolsPage);
     });
});
