// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as IssuesManager from '../issues_manager/issues_manager.js';

const {assert} = chai;

describeWithMockConnection('CheckFormsIssuesTrigger', () => {
  it('should call `checkFormsIssues` on devtools open.', async () => {
    const parentTarget = createTarget();
    const target = createTarget({parentTarget});
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    IssuesManager.CheckFormsIssuesTrigger.CheckFormsIssuesTrigger.instance();
    const auditsAgent = target.auditsAgent();
    assertNotNullOrUndefined(resourceTreeModel);
    const spyCheckFormsIssues = sinon.stub(auditsAgent, 'invoke_checkFormsIssues');
    resourceTreeModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.Load, {resourceTreeModel: resourceTreeModel, loadTime: 123});
    assert.isTrue(spyCheckFormsIssues.called);
  });
});
