// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import type * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {raf} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {StubIssue} from '../../testing/StubIssue.js';
import {recordedMetricsContain, setupUserMetricHooks} from '../../testing/UserMetricsHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Issues from './issues.js';

describeWithEnvironment('IssueView', () => {
  setupUserMetricHooks();
  it('records metrics when an issue is expanded', () => {
    const aggregationKey = 'key' as unknown as IssuesManager.IssueAggregator.AggregationKey;
    const issue = StubIssue.createFromRequestIds(['id1', 'id2']);
    const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue('code', aggregationKey);
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
    const aggregationKey = 'key' as unknown as IssuesManager.IssueAggregator.AggregationKey;
    const issue = StubIssue.createCookieIssue('CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie');
    const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue(
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

  it('sets data-backend-node-id and data-target-id on affected element rows', async () => {
    const target = createTarget();
    const mockElement: IssuesManager.Issue.AffectedElement = {
      backendNodeId: 42 as Protocol.DOM.BackendNodeId,
      nodeName: 'DIV',
      target,
    };
    const aggregationKey = 'key' as unknown as IssuesManager.IssueAggregator.AggregationKey;
    const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue('code', aggregationKey);
    sinon.stub(aggregatedIssue, 'elements').returns([mockElement]);

    const mockIssueView = {
      updateAffectedResourceVisibility: () => {},
    } as unknown as Issues.IssueView.IssueView;

    const view =
        new Issues.AffectedElementsView.AffectedElementsView(mockIssueView, aggregatedIssue, 'affected-elements');
    const treeOutline = new UI.TreeOutline.TreeOutline();
    treeOutline.appendChild(view);
    view.update();

    await raf();

    const resourceRows = (view as unknown as {affectedResources: HTMLElement}).affectedResources.querySelectorAll('tr');
    assert.lengthOf(resourceRows, 1);
    const row = resourceRows[0];
    assert.strictEqual(row.getAttribute('data-backend-node-id'), '42');
    assert.strictEqual(row.getAttribute('data-target-id'), target.id());
  });
});
