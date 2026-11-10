// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {dispatchEvent} from '../../testing/MockConnection.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Issues from './issues.js';

const {AffectedSelectivePermissionsInterventionView, DEFAULT_VIEW} =
    Issues.AffectedSelectivePermissionsInterventionView;

const AGGREGATION_KEY: IssuesManager.IssueAggregator.AggregationKey = {
  toString: () => 'key',
  aggregationKeyTag: undefined,
};

function createProtocolIssueWithDetails(
    selectivePermissionsInterventionIssueDetails: Protocol.Audits.SelectivePermissionsInterventionIssueDetails):
    Protocol.Audits.InspectorIssue {
  return {
    code: Protocol.Audits.InspectorIssueCode.SelectivePermissionsInterventionIssue,
    details: {selectivePermissionsInterventionIssueDetails},
  };
}

const SAMPLE_ISSUE_DETAILS: Protocol.Audits.SelectivePermissionsInterventionIssueDetails = {
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

function setupDebuggerBindings(): void {
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
}

function tearDownDebuggerBindings(): void {
  Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.removeInstance();
  Workspace.IgnoreListManager.IgnoreListManager.removeInstance();
  Workspace.Workspace.WorkspaceImpl.removeInstance();
}

describe('AffectedSelectivePermissionsInterventionView', () => {
  describe('DEFAULT_VIEW', () => {
    setupLocaleHooks();

    function renderView(input: Issues.AffectedSelectivePermissionsInterventionView.ViewInput): HTMLTableElement {
      const target = document.createElement('table');
      renderElementIntoDOM(target);
      DEFAULT_VIEW(input, undefined, target);
      return target;
    }

    it('renders column headers and unknown or loading script states', () => {
      const target = renderView({
        rows: [
          {
            apiName: 'geolocation',
            script: {status: 'unknown'},
            adAncestryScripts: [],
            rootScriptFilterlistRule: '||ads.com^',
          },
          {
            apiName: 'camera',
            script: {status: 'loading'},
            adAncestryScripts: [],
          },
        ],
      });

      const headers = target.querySelectorAll('td.affected-resource-header');
      assert.lengthOf(headers, 3);
      assert.strictEqual(headers[0].textContent, 'API');
      assert.strictEqual(headers[1].textContent, 'Script');
      assert.strictEqual(headers[2].textContent, 'Ad ancestry');

      const rows = target.querySelectorAll<HTMLTableRowElement>('tr.affected-resource-directive');
      assert.lengthOf(rows, 2);
      assert.strictEqual(rows[0].cells[0].textContent, 'geolocation');
      assert.strictEqual(rows[0].cells[1].textContent, 'Unknown');
      assert.strictEqual(rows[0].cells[2].textContent, 'Rule: ||ads.com^');

      assert.strictEqual(rows[1].cells[0].textContent, 'camera');
      assert.strictEqual(rows[1].cells[1].textContent, 'Loading…');
      assert.strictEqual(rows[1].cells[2].textContent, '');
    });

    it('re-renders without duplicating rows', () => {
      const target = renderView({
        rows: [{
          apiName: 'geolocation',
          script: {status: 'unknown'},
          adAncestryScripts: [],
        }],
      });
      assert.lengthOf(target.querySelectorAll('tr.affected-resource-directive'), 1);

      DEFAULT_VIEW({
        rows: [{
          apiName: 'microphone',
          script: {status: 'unknown'},
          adAncestryScripts: [],
        }],
      },
                   undefined, target);

      const rows = target.querySelectorAll<HTMLTableRowElement>('tr.affected-resource-directive');
      assert.lengthOf(rows, 1);
      assert.strictEqual(rows[0].cells[0].textContent, 'microphone');
    });
  });

  describeWithEnvironment('presenter', () => {
    setupLocaleHooks();

    let target: SDK.Target.Target;
    let issuesModel: SDK.IssuesModel.IssuesModel;

    beforeEach(() => {
      setupDebuggerBindings();
      target = createTarget();
      const model = target.model(SDK.IssuesModel.IssuesModel);
      assert.isNotNull(model);
      issuesModel = model;
    });

    afterEach(() => {
      tearDownDebuggerBindings();
    });

    function createPresenter(
        issues: IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue[]) {
      const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue(
          Protocol.Audits.InspectorIssueCode.SelectivePermissionsInterventionIssue, AGGREGATION_KEY);
      for (const issue of issues) {
        aggregatedIssue.addInstance(issue);
      }
      const mockIssueView = sinon.createStubInstance(Issues.IssueView.IssueView);
      const view = sinon.stub<Parameters<Issues.AffectedSelectivePermissionsInterventionView.View>, void>();
      const presenter = new AffectedSelectivePermissionsInterventionView(
          mockIssueView, aggregatedIssue, 'selective-permissions-intervention-details', view);
      return {presenter, view};
    }

    function getCounterText(
        presenter: Issues.AffectedSelectivePermissionsInterventionView.AffectedSelectivePermissionsInterventionView):
        string {
      return presenter.listItemElement.querySelector('.affected-resource-label')?.textContent ?? '';
    }

    it('transitions script state from loading to ready and updates violation count', async () => {
      const [issue] =
          IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue.fromInspectorIssue(
              issuesModel, createProtocolIssueWithDetails(SAMPLE_ISSUE_DETAILS));
      assert.isOk(issue);
      const {presenter, view} = createPresenter([issue]);

      presenter.update();

      sinon.assert.calledOnce(view);
      assert.deepEqual(view.firstCall.args[0], {
        rows: [{
          apiName: 'geolocation',
          script: {status: 'loading'},
          adAncestryScripts: [{target, scriptId: '2' as Protocol.Runtime.ScriptId}],
          rootScriptFilterlistRule: '||ads.com^',
        }],
      });
      assert.strictEqual(getCounterText(presenter), '1 violation');
      assert.isFalse(presenter.hidden);

      await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().pendingLiveLocationChangesPromise();

      sinon.assert.calledTwice(view);
      const resolvedRow = view.lastCall.args[0].rows[0];
      if (resolvedRow.script.status !== 'ready') {
        assert.fail(`Expected ready script state, got ${resolvedRow.script.status}`);
      }
      assert.lengthOf(resolvedRow.script.stackTrace.syncFragment.frames, 1);
      assert.strictEqual(resolvedRow.script.stackTrace.syncFragment.frames[0].name, 'foo');
    });

    it('passes unknown script state when stack trace or model is missing', () => {
      const detailsWithoutStack: Protocol.Audits.SelectivePermissionsInterventionIssueDetails = {
        apiName: 'geolocation',
        adAncestry: {ancestryChain: []},
      };
      const [issueWithoutStack] =
          IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue.fromInspectorIssue(
              issuesModel, createProtocolIssueWithDetails(detailsWithoutStack));
      const issueWithoutModel =
          new IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue(
              SAMPLE_ISSUE_DETAILS, null);
      assert.isOk(issueWithoutStack);

      const {presenter, view} = createPresenter([issueWithoutStack, issueWithoutModel]);
      presenter.update();

      sinon.assert.calledOnce(view);
      const {rows} = view.lastCall.args[0];
      assert.lengthOf(rows, 2);
      assert.deepEqual(rows[0].script, {status: 'unknown'});
      assert.deepEqual(rows[1].script, {status: 'unknown'});
      assert.strictEqual(getCounterText(presenter), '2 violations');
    });

    it('ignores stale stack trace resolutions after clear', async () => {
      const [issue] =
          IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue.fromInspectorIssue(
              issuesModel, createProtocolIssueWithDetails(SAMPLE_ISSUE_DETAILS));
      assert.isOk(issue);

      const realBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
      const realStackTrace =
          await realBinding.createStackTraceFromProtocolRuntime(SAMPLE_ISSUE_DETAILS.stackTrace!, target);
      const {promise, resolve} = Promise.withResolvers<typeof realStackTrace>();
      sinon.stub(realBinding, 'createStackTraceFromProtocolRuntime').returns(promise);

      const {presenter, view} = createPresenter([issue]);
      presenter.update();
      presenter.clear();
      resolve(realStackTrace);
      await promise;
      await new Promise<void>(resolve => queueMicrotask(resolve));

      assert.deepEqual(view.lastCall.args[0], {rows: []});
    });

    it('is hidden when there are no violations', () => {
      const {presenter, view} = createPresenter([]);

      presenter.update();

      assert.deepEqual(view.lastCall.args[0], {rows: []});
      assert.isTrue(presenter.isEmpty());
      assert.isTrue(presenter.hidden);
    });

    it('renders resolved stack trace and ad ancestry links end-to-end', async () => {
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

      const [interventionIssue] =
          IssuesManager.SelectivePermissionsInterventionIssue.SelectivePermissionsInterventionIssue.fromInspectorIssue(
              issuesModel, createProtocolIssueWithDetails(SAMPLE_ISSUE_DETAILS));
      assert.isOk(interventionIssue);

      const aggregatedIssue =
          new IssuesManager.IssueAggregator.AggregatedIssue(interventionIssue.code(), AGGREGATION_KEY);
      aggregatedIssue.addInstance(interventionIssue);

      const mockIssueView = sinon.createStubInstance(Issues.IssueView.IssueView);
      const view = new AffectedSelectivePermissionsInterventionView(mockIssueView, aggregatedIssue,
                                                                    'selective-permissions-intervention-details');

      const treeOutline = new UI.TreeOutline.TreeOutline();
      renderElementIntoDOM(treeOutline.element);
      treeOutline.appendChild(view);
      view.update();

      await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().pendingLiveLocationChangesPromise();
      await raf();

      const resourceRows =
          view.childrenListElement.querySelectorAll<HTMLTableRowElement>('.affected-resource-directive');
      assert.lengthOf(resourceRows, 1);
      const row = resourceRows[0];
      assert.strictEqual(row.cells[0].textContent, 'geolocation');
      const stackPreviewElement = row.cells[1].querySelector('devtools-widget');
      assert.isOk(stackPreviewElement);
      const stackPreviewWidget = UI.Widget.Widget.get(stackPreviewElement);
      assert.instanceOf(stackPreviewWidget, Components.JSPresentationUtils.StackTracePreviewContent);
      assert.isTrue(stackPreviewWidget.hasContent());
      assert.include(row.cells[2].textContent ?? '', 'ad.js:1');
      assert.include(row.cells[2].textContent ?? '', 'Rule: ||ads.com^');
    });
  });
});
