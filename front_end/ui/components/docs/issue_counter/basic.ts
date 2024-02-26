// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as IssuesManager from '../../../../models/issues_manager/issues_manager.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import type * as IssueCounterModule from '../../../../ui/components/issue_counter/issue_counter.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const IssueCounter: typeof IssueCounterModule =
    await import('../../../../ui/components/issue_counter/issue_counter.js');

function appendComponent(data: IssueCounterModule.IssueCounter.IssueCounterData) {
  const component = new IssueCounter.IssueCounter.IssueCounter();
  component.data = data;
  document.getElementById('container')?.appendChild(component);
}

const mockIssueManager = {
  addEventListener(): void{},
  removeEventListener(): void{},
  numberOfIssues(): number {
    return 1;
  },
} as unknown as IssuesManager.IssuesManager.IssuesManager;

appendComponent({issuesManager: mockIssueManager});

appendComponent({issuesManager: mockIssueManager, clickHandler: () => {}});

appendComponent({issuesManager: mockIssueManager, clickHandler: () => {}, compact: true});
