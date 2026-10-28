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

const {AffectedMetadataAllowedSitesView, DEFAULT_VIEW} = Issues.AffectedMetadataAllowedSitesView;

function createIssueDetails(overrides: Partial<Protocol.Audits.CookieDeprecationMetadataIssueDetails> = {}):
    Protocol.Audits.CookieDeprecationMetadataIssueDetails {
  return {
    allowedSites: ['example.test'],
    optOutPercentage: 0,
    isOptOutTopLevel: false,
    operation: Protocol.Audits.CookieOperation.ReadCookie,
    ...overrides,
  };
}

describe('AffectedMetadataAllowedSitesView', () => {
  describe('DEFAULT_VIEW', () => {
    setupLocaleHooks();

    function renderView(issueDetails: Protocol.Audits.CookieDeprecationMetadataIssueDetails[]): HTMLTableElement {
      const target = document.createElement('table');
      renderElementIntoDOM(target);
      DEFAULT_VIEW({issueDetails}, undefined, target);
      return target;
    }

    it('renders one row per issue listing the allowed sites', () => {
      const target = renderView([
        createIssueDetails({allowedSites: ['a.test', 'b.test', 'c.test']}),
        createIssueDetails({allowedSites: ['d.test']}),
      ]);

      const rows = target.querySelectorAll('tr');
      assert.lengthOf(rows, 2);
      assert.isTrue(rows[0].classList.contains('affected-resource-directive'));
      assert.strictEqual(rows[0].cells[0].textContent, 'a.test, b.test, c.test');
      assert.strictEqual(rows[1].cells[0].textContent, 'd.test');
    });

    it('renders the opt-out percentage with a learn-more link for non-top-level opt-outs', () => {
      const target = renderView([createIssueDetails({optOutPercentage: 50, isOptOutTopLevel: false})]);

      const rows = target.querySelectorAll('tr');
      assert.lengthOf(rows, 1);
      const cell = rows[0].cells[0];
      assert.strictEqual(cell.textContent, 'example.test (opt-out: 50% - learn more)');
      const link = cell.querySelector('devtools-link');
      assert.exists(link);
      assert.strictEqual(link.textContent, 'learn more');
      assert.strictEqual(link.getAttribute('href'),
                         'https://developers.google.com/privacy-sandbox/blog/grace-period-opt-out');
      assert.strictEqual(link.getAttribute('jslogcontext'), 'learn-more');
    });

    it('does not render opt-out details for top-level opt-outs or a zero opt-out percentage', () => {
      const target = renderView([
        createIssueDetails({allowedSites: ['top-level.test'], optOutPercentage: 25, isOptOutTopLevel: true}),
        createIssueDetails({allowedSites: ['zero.test'], optOutPercentage: 0, isOptOutTopLevel: false}),
      ]);

      const rows = target.querySelectorAll('tr');
      assert.lengthOf(rows, 2);
      assert.strictEqual(rows[0].cells[0].textContent, 'top-level.test');
      assert.strictEqual(rows[1].cells[0].textContent, 'zero.test');
      assert.isNull(target.querySelector('devtools-link'));
    });

    it('renders no rows when there are no affected sites', () => {
      const target = renderView([]);

      assert.lengthOf(target.querySelectorAll('tr'), 0);
    });

    it('re-renders without duplicating rows', () => {
      const issueDetails = [createIssueDetails({optOutPercentage: 50})];
      const target = renderView(issueDetails);
      assert.lengthOf(target.querySelectorAll('tr'), 1);

      DEFAULT_VIEW({issueDetails}, undefined, target);

      const rows = target.querySelectorAll('tr');
      assert.lengthOf(rows, 1);
      assert.strictEqual(rows[0].cells[0].textContent, 'example.test (opt-out: 50% - learn more)');
      assert.lengthOf(rows[0].querySelectorAll('devtools-link'), 1);
    });
  });

  describeWithEnvironment('presenter', () => {
    setupLocaleHooks();

    function createPresenter(issueDetailsList: Protocol.Audits.CookieDeprecationMetadataIssueDetails[]) {
      const aggregationKey = 'key' as unknown as IssuesManager.IssueAggregator.AggregationKey;
      const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue(
          Protocol.Audits.InspectorIssueCode.CookieDeprecationMetadataIssue, aggregationKey);
      for (const issueDetails of issueDetailsList) {
        aggregatedIssue.addInstance(
            new IssuesManager.CookieDeprecationMetadataIssue.CookieDeprecationMetadataIssue(issueDetails, null));
      }

      const mockIssueView = {
        updateAffectedResourceVisibility: () => {},
      } as unknown as Issues.IssueView.IssueView;
      const view = sinon.stub<Parameters<Issues.AffectedMetadataAllowedSitesView.View>, void>();
      const presenter =
          new AffectedMetadataAllowedSitesView(mockIssueView, aggregatedIssue, 'metadata-allowed-sites-details', view);
      return {presenter, view};
    }

    function getCounterText(presenter: Issues.AffectedMetadataAllowedSitesView.AffectedMetadataAllowedSitesView):
        string {
      return presenter.listItemElement.querySelector('.affected-resource-label')?.textContent ?? '';
    }

    it('passes the details of all aggregated issues to the view', () => {
      const issueDetails = [
        createIssueDetails({allowedSites: ['a.test', 'b.test']}),
        createIssueDetails({allowedSites: ['c.test'], optOutPercentage: 50}),
      ];
      const {presenter, view} = createPresenter(issueDetails);

      presenter.update();

      sinon.assert.calledOnce(view);
      assert.deepEqual(view.lastCall.args[0], {issueDetails});
    });

    it('updates the affected resource count and is shown when there are affected sites', () => {
      const {presenter} = createPresenter([
        createIssueDetails({allowedSites: ['a.test', 'b.test']}),
        createIssueDetails({allowedSites: ['c.test']}),
      ]);

      presenter.update();

      assert.strictEqual(getCounterText(presenter), '2 websites allowed to access cookies');
      assert.isFalse(presenter.isEmpty());
      assert.isFalse(presenter.hidden);
    });

    it('uses the singular label for a single affected site', () => {
      const {presenter} = createPresenter([createIssueDetails()]);

      presenter.update();

      assert.strictEqual(getCounterText(presenter), '1 website allowed to access cookies');
    });

    it('is hidden when there are no affected sites', () => {
      const {presenter, view} = createPresenter([]);

      presenter.update();

      assert.deepEqual(view.lastCall.args[0], {issueDetails: []});
      assert.isTrue(presenter.isEmpty());
      assert.isTrue(presenter.hidden);
    });
  });
});
