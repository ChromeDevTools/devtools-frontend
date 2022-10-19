// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../../../front_end/core/host/host.js';
import * as Issues from '../../../../../front_end/panels/issues/issues.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';
import {recordedMetricsContain} from '../../helpers/UserMetricsHelpers.js';
import {StubIssue} from '../../models/issues_manager/StubIssue.js';

const {assert} = chai;

describeWithRealConnection('IssueView', () => {
  it('records metrics when an issue is expanded', () => {
    const aggregationKey = 'key' as unknown as Issues.IssueAggregator.AggregationKey;
    const issue = StubIssue.createFromRequestIds(['id1', 'id2']);
    const aggregatedIssue = new Issues.IssueAggregator.AggregatedIssue('code', aggregationKey);
    aggregatedIssue.addInstance(issue);
    const view = new Issues.IssueView.IssueView(aggregatedIssue, {title: 'Mock issue', links: [], markdown: []});
    const treeOutline =
        new UI.TreeOutline.TreeOutline();  // TreeElements need to be part of a TreeOutline to be expandable.
    treeOutline.appendChild(view);

    view.expand();

    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.IssuesPanelIssueExpanded,
        Host.UserMetrics.IssueExpanded.Other));
    view.clear();
  });
});
