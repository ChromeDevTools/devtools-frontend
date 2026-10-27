// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';

import * as Issues from './issues.js';

const {AffectedDescendantsWithinSelectElementView, DEFAULT_VIEW} = Issues.AffectedDescendantsWithinSelectElementView;

function createRow(nodeName: string,
                   backendNodeId = 1): Issues.AffectedDescendantsWithinSelectElementView.SelectDescendantRow {
  return {
    backendNodeId: backendNodeId as Protocol.DOM.BackendNodeId,
    nodeName,
    target: null,
    onElementClick: () => {},
  };
}

function createIssueDetails(overrides: Partial<Protocol.Audits.ElementAccessibilityIssueDetails> = {}):
    Protocol.Audits.ElementAccessibilityIssueDetails {
  return {
    nodeId: 1 as Protocol.DOM.BackendNodeId,
    elementAccessibilityIssueReason: Protocol.Audits.ElementAccessibilityIssueReason.DisallowedSelectChild,
    hasDisallowedAttributes: false,
    ...overrides,
  };
}

describe('AffectedDescendantsWithinSelectElementView', () => {
  describe('DEFAULT_VIEW', () => {
    setupLocaleHooks();

    function renderView(rows: Issues.AffectedDescendantsWithinSelectElementView.SelectDescendantRow[]):
        HTMLTableElement {
      const target = document.createElement('table');
      renderElementIntoDOM(target);
      DEFAULT_VIEW({rows}, undefined, target);
      return target;
    }

    it('renders one row per descendant row', () => {
      const target = renderView([createRow('first', 1), createRow('second', 2)]);

      const rows = target.querySelectorAll('tr');
      assert.lengthOf(rows, 2);
      assert.isTrue(rows[0].classList.contains('affected-resource-select-element-descendant'));
      assert.strictEqual(rows[0].cells[0].textContent, 'first');
      assert.strictEqual(rows[1].cells[0].textContent, 'second');
    });

    it('renders no rows when there are no descendant rows', () => {
      const target = renderView([]);

      assert.lengthOf(target.querySelectorAll('tr'), 0);
    });

    it('re-renders without duplicating rows', () => {
      const target = renderView([createRow('first')]);
      assert.lengthOf(target.querySelectorAll('tr'), 1);

      DEFAULT_VIEW({rows: [createRow('replaced')]}, undefined, target);

      const rows = target.querySelectorAll('tr');
      assert.lengthOf(rows, 1);
      assert.strictEqual(rows[0].cells[0].textContent, 'replaced');
    });
  });

  describeWithEnvironment('presenter', () => {
    setupLocaleHooks();

    function createPresenter(issueDetailsList: Protocol.Audits.ElementAccessibilityIssueDetails[]) {
      const aggregationKey = 'key' as unknown as IssuesManager.IssueAggregator.AggregationKey;
      const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue(
          Protocol.Audits.InspectorIssueCode.ElementAccessibilityIssue, aggregationKey);
      for (const issueDetails of issueDetailsList) {
        aggregatedIssue.addInstance(
            new IssuesManager.ElementAccessibilityIssue.ElementAccessibilityIssue(issueDetails, null));
      }

      const mockIssueView = sinon.createStubInstance(Issues.IssueView.IssueView);
      const view = sinon.stub<Parameters<Issues.AffectedDescendantsWithinSelectElementView.View>, void>();
      const presenter = new AffectedDescendantsWithinSelectElementView(mockIssueView, aggregatedIssue,
                                                                       'select-element-descendants', view);
      return {presenter, view};
    }

    function getCounterText(
        presenter: Issues.AffectedDescendantsWithinSelectElementView.AffectedDescendantsWithinSelectElementView):
        string {
      return presenter.listItemElement.querySelector('.affected-resource-label')?.textContent ?? '';
    }

    it('passes one row per affected descendant to the view', () => {
      const {presenter, view} = createPresenter([
        createIssueDetails({nodeId: 1 as Protocol.DOM.BackendNodeId}),
        createIssueDetails({nodeId: 2 as Protocol.DOM.BackendNodeId}),
      ]);

      presenter.update();

      sinon.assert.calledOnce(view);
      const {rows} = view.lastCall.args[0];
      assert.lengthOf(rows, 2);
      assert.strictEqual(rows[0].nodeName, 'Disallowed descendant');
      assert.strictEqual(rows[0].backendNodeId, 1 as Protocol.DOM.BackendNodeId);
      assert.strictEqual(rows[1].nodeName, 'Disallowed descendant');
      assert.strictEqual(rows[1].backendNodeId, 2 as Protocol.DOM.BackendNodeId);
    });

    it('uses the descendant label for the affected resource count', () => {
      const {presenter} = createPresenter([
        createIssueDetails({nodeId: 1 as Protocol.DOM.BackendNodeId}),
        createIssueDetails({nodeId: 2 as Protocol.DOM.BackendNodeId}),
      ]);

      presenter.update();

      assert.strictEqual(getCounterText(presenter), '2 descendants');
      assert.isFalse(presenter.hidden);
    });

    it('uses the singular label for a single affected descendant', () => {
      const {presenter} = createPresenter([createIssueDetails()]);

      presenter.update();

      assert.strictEqual(getCounterText(presenter), '1 descendant');
    });

    it('is hidden when there are no affected descendants', () => {
      const {presenter, view} = createPresenter([]);

      presenter.update();

      assert.deepEqual(view.lastCall.args[0], {rows: []});
      assert.isTrue(presenter.hidden);
    });
  });
});
