// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {StubIssue} from '../../testing/StubIssue.js';
import {recordedMetricsContain} from '../../testing/UserMetricsHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Issues from './issues.js';

describeWithEnvironment('IssueView', () => {
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

  it('records metrics when a SameSite Cookie issue is expanded', () => {
    const aggregationKey = 'key' as unknown as Issues.IssueAggregator.AggregationKey;
    const issue = StubIssue.createCookieIssue('CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie');
    const aggregatedIssue = new Issues.IssueAggregator.AggregatedIssue(
        'CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie', aggregationKey);
    aggregatedIssue.addInstance(issue);
    const view = new Issues.IssueView.IssueView(aggregatedIssue, {title: 'Mock Cookie Issue', links: [], markdown: []});
    const treeOutline =
        new UI.TreeOutline.TreeOutline();  // TreeElements need to be part of a TreeOutline to be expandable.
    treeOutline.appendChild(view);

    view.expand();

    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.IssuesPanelIssueExpanded,
        Host.UserMetrics.IssueExpanded.SameSiteCookie));
    assert.isFalse(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.IssuesPanelIssueExpanded,
        Host.UserMetrics.IssueExpanded.GenericCookie));
    view.clear();
  });

  it('records metrics when a ThirdPartyPhaseout Cookie issue is expanded', () => {
    const aggregationKey = 'key' as unknown as Issues.IssueAggregator.AggregationKey;
    const issue = StubIssue.createCookieIssue('CookieIssue::WarnThirdPartyPhaseout::ReadCookie');
    const aggregatedIssue =
        new Issues.IssueAggregator.AggregatedIssue('CookieIssue::WarnThirdPartyPhaseout::ReadCookie', aggregationKey);
    aggregatedIssue.addInstance(issue);
    const view = new Issues.IssueView.IssueView(aggregatedIssue, {title: 'Mock Cookie Issue', links: [], markdown: []});
    const treeOutline =
        new UI.TreeOutline.TreeOutline();  // TreeElements need to be part of a TreeOutline to be expandable.
    treeOutline.appendChild(view);

    view.expand();

    assert.isTrue(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.IssuesPanelIssueExpanded,
        Host.UserMetrics.IssueExpanded.ThirdPartyPhaseoutCookie));
    assert.isFalse(recordedMetricsContain(
        Host.InspectorFrontendHostAPI.EnumeratedHistogram.IssuesPanelIssueExpanded,
        Host.UserMetrics.IssueExpanded.GenericCookie));
    view.clear();
  });
});
