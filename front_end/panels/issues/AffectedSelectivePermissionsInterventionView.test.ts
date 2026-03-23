// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {raf} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {describeWithMockConnection, dispatchEvent} from '../../testing/MockConnection.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Issues from './issues.js';

describeWithMockConnection('AffectedSelectivePermissionsInterventionView', () => {
  setupLocaleHooks();

  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
  let target: SDK.Target.Target;

  beforeEach(() => {
    // Initialize the workspace and bindings
    const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping: new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace),
      targetManager,
      ignoreListManager,
      workspace,
    });

    target = createTarget();
    mockModel.target = () => target;
  });

  function createProtocolIssueWithDetails(
      selectivePermissionsInterventionIssueDetails: Protocol.Audits.SelectivePermissionsInterventionIssueDetails):
      Protocol.Audits.InspectorIssue {
    return {
      code: Protocol.Audits.InspectorIssueCode.SelectivePermissionsInterventionIssue,
      details: {selectivePermissionsInterventionIssueDetails},
    };
  }

  const issueDetails = {
    apiName: 'geolocation',
    stackTrace: {
      callFrames: [
        {
          functionName: 'foo',
          scriptId: '1' as Protocol.Runtime.ScriptId,
          url: 'https://example.com/foo.js',
          lineNumber: 10,
          columnNumber: 5,
        },
      ],
    },
    adAncestry: {
      ancestryChain: [
        {
          scriptId: '2' as Protocol.Runtime.ScriptId,
          debuggerId: '' as Protocol.Runtime.UniqueDebuggerId,
          name: '',
        },
      ],
      rootScriptFilterlistRule: '||ads.com^',
    },
  };

  it('appends details correctly', async () => {
    const scriptParsedEvent: Protocol.Debugger.ScriptParsedEvent = {
      scriptId: '2' as Protocol.Runtime.ScriptId,
      url: 'https://ads.com/ad.js',
      startLine: 0,
      startColumn: 0,
      endLine: 10,
      endColumn: 10,
      executionContextId: 1234 as Protocol.Runtime.ExecutionContextId,
      hash: '',
      buildId: '',
    };
    dispatchEvent(target, 'Debugger.scriptParsed', scriptParsedEvent);

    const issue = createProtocolIssueWithDetails(issueDetails);
    const interventionIssues =
        IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue.fromInspectorIssue(
            mockModel, issue);
    assert.lengthOf(interventionIssues, 1);
    const interventionIssue = interventionIssues[0];

    const aggregationKey = 'key' as unknown as IssuesManager.IssueAggregator.AggregationKey;
    const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue(interventionIssue.code(), aggregationKey);
    aggregatedIssue.addInstance(interventionIssue);

    const mockIssueView = {
      updateAffectedResourceVisibility: () => {},
    } as unknown as Issues.IssueView.IssueView;

    const view = new Issues.AffectedSelectivePermissionsInterventionView.AffectedSelectivePermissionsInterventionView(
        mockIssueView, aggregatedIssue, 'js-log-context');

    const treeOutline = new UI.TreeOutline.TreeOutline();
    treeOutline.appendChild(view);
    view.update();

    // Wait for the Linkifier to asynchronously resolve and render the script URL.
    await raf();

    const resourceRows = (view as unknown as {
                           affectedResources: HTMLElement,
                         }).affectedResources.querySelectorAll('.affected-resource-directive');
    assert.lengthOf(resourceRows, 1);
    const row = resourceRows[0] as HTMLTableRowElement;
    assert.strictEqual(row.cells[0].textContent, 'geolocation');
    assert.include(row.cells[2].textContent || '', 'ad.js:1');
    assert.include(row.cells[2].textContent || '', 'Rule: ||ads.com^');
  });

  it('handles issues with missing ad ancestry rule', () => {
    const issueDetailsMinimal = {
      apiName: 'geolocation',
      adAncestry: {
        ancestryChain: [],
      },
    } as Protocol.Audits.SelectivePermissionsInterventionIssueDetails;
    const issue = createProtocolIssueWithDetails(issueDetailsMinimal);
    const interventionIssues =
        IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue.fromInspectorIssue(
            mockModel, issue);
    assert.lengthOf(interventionIssues, 1);
    const interventionIssue = interventionIssues[0];

    const aggregationKey = 'key' as unknown as IssuesManager.IssueAggregator.AggregationKey;
    const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue(interventionIssue.code(), aggregationKey);
    aggregatedIssue.addInstance(interventionIssue);

    const mockIssueView = {
      updateAffectedResourceVisibility: () => {},
    } as unknown as Issues.IssueView.IssueView;

    const view = new Issues.AffectedSelectivePermissionsInterventionView.AffectedSelectivePermissionsInterventionView(
        mockIssueView, aggregatedIssue, 'js-log-context');

    const treeOutline = new UI.TreeOutline.TreeOutline();
    treeOutline.appendChild(view);
    view.update();

    const resourceRows = (view as unknown as {
                           affectedResources: HTMLElement,
                         }).affectedResources.querySelectorAll('.affected-resource-directive');
    assert.lengthOf(resourceRows, 1);
    const row = resourceRows[0] as HTMLTableRowElement;
    assert.strictEqual(row.cells[0].textContent, 'geolocation');
    assert.isEmpty(row.cells[2].textContent);
  });

  it('handles issues with empty stack trace', () => {
    const issueDetailsWithEmptyStack = {
      apiName: 'geolocation',
      stackTrace: {
        callFrames: [],
      },
      adAncestry: {
        ancestryChain: [],
      },
    } as Protocol.Audits.SelectivePermissionsInterventionIssueDetails;
    const issue = createProtocolIssueWithDetails(issueDetailsWithEmptyStack);
    const interventionIssues =
        IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue.fromInspectorIssue(
            mockModel, issue);
    assert.lengthOf(interventionIssues, 1);
    const interventionIssue = interventionIssues[0];

    const aggregationKey = 'key' as unknown as IssuesManager.IssueAggregator.AggregationKey;
    const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue(interventionIssue.code(), aggregationKey);
    aggregatedIssue.addInstance(interventionIssue);

    const mockIssueView = {
      updateAffectedResourceVisibility: () => {},
    } as unknown as Issues.IssueView.IssueView;

    const view = new Issues.AffectedSelectivePermissionsInterventionView.AffectedSelectivePermissionsInterventionView(
        mockIssueView, aggregatedIssue, 'js-log-context');

    const treeOutline = new UI.TreeOutline.TreeOutline();
    treeOutline.appendChild(view);
    view.update();

    const resourceRows = (view as unknown as {
                           affectedResources: HTMLElement,
                         }).affectedResources.querySelectorAll('.affected-resource-directive');
    assert.lengthOf(resourceRows, 1);
    const row = resourceRows[0] as HTMLTableRowElement;
    assert.strictEqual(row.cells[0].textContent, 'geolocation');
    assert.exists(row.cells[1]);
  });

  it('re-renders correctly on multiple updates', () => {
    const issue = createProtocolIssueWithDetails(issueDetails);
    const interventionIssues =
        IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue.fromInspectorIssue(
            mockModel, issue);
    const interventionIssue = interventionIssues[0];

    const aggregationKey = 'key' as unknown as IssuesManager.IssueAggregator.AggregationKey;
    const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue(interventionIssue.code(), aggregationKey);
    aggregatedIssue.addInstance(interventionIssue);

    const mockIssueView = {
      updateAffectedResourceVisibility: () => {},
    } as unknown as Issues.IssueView.IssueView;

    const view = new Issues.AffectedSelectivePermissionsInterventionView.AffectedSelectivePermissionsInterventionView(
        mockIssueView, aggregatedIssue, 'js-log-context');

    const treeOutline = new UI.TreeOutline.TreeOutline();
    treeOutline.appendChild(view);

    // First update
    view.update();
    let resourceRows = (view as unknown as {
                         affectedResources: HTMLElement,
                       }).affectedResources.querySelectorAll('.affected-resource-directive');
    assert.lengthOf(resourceRows, 1);

    // Second update
    view.update();
    resourceRows = (view as unknown as {
                     affectedResources: HTMLElement,
                   }).affectedResources.querySelectorAll('.affected-resource-directive');
    // Should still have exactly 1 row (not 0, and not 2 if it was appending instead of replacing)
    assert.lengthOf(resourceRows, 1);
    const row = resourceRows[0] as HTMLTableRowElement;
    assert.strictEqual(row.cells[0].textContent, 'geolocation');
  });
});
