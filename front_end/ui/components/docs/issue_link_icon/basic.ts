// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../../generated/protocol.js';
import type * as IssuesManager from '../../../../models/issues_manager/issues_manager.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import type * as IssueCounterModule from '../../../../ui/components/issue_counter/issue_counter.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const IssueLinkIcon: typeof IssueCounterModule =
    await import('../../../../ui/components/issue_counter/issue_counter.js');

function appendComponent(data: IssueCounterModule.IssueLinkIcon.IssueLinkIconData) {
  const component = new IssueLinkIcon.IssueLinkIcon.IssueLinkIcon();
  component.data = data;
  document.getElementById('container')?.appendChild(component);
}

appendComponent({
  issueId: 'fakeid' as Protocol.Audits.IssueId,
  issueResolver: {waitFor: () => new Promise(() => {})} as unknown as IssuesManager.IssueResolver.IssueResolver,
});
