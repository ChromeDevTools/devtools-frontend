// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import type * as SDKModule from '../../../../../front_end/core/sdk/sdk.js';
import * as IssuesManager from '../../../../../front_end/models/issues_manager/issues_manager.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('CheckFormsIssuesTrigger', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../../front_end/core/sdk/sdk.js');
  });

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
