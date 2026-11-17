// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Logs from '../../models/logs/logs.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {StubIssue} from '../../testing/StubIssue.js';
import {recordedMetricsContain, setupUserMetricHooks} from '../../testing/UserMetricsHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as IssuesComponents from './components/components.js';
import * as Issues from './issues.js';

const {DEFAULT_VIEW, MIXED_CONTENT_ROWS_VIEW, REQUEST_ROWS_VIEW} = Issues.IssueView;

function createAggregatedIssue(code = 'code'): IssuesManager.IssueAggregator.AggregatedIssue {
  const aggregationKey = 'key' as unknown as IssuesManager.IssueAggregator.AggregationKey;
  return new IssuesManager.IssueAggregator.AggregatedIssue(code, aggregationKey);
}

function createHeaderInput(overrides: Partial<Issues.IssueView.ViewInput> = {}): Issues.IssueView.ViewInput {
  return {
    iconName: 'issue-text-filled',
    iconTitle: 'Improvement issue' as Platform.UIString.LocalizedString,
    aggregatedIssuesCount: 3,
    title: 'Mock issue',
    isHidden: false,
    hideIssuesMenuLabel: 'Hide issues like this' as Platform.UIString.LocalizedString,
    onToggleHideIssues: () => {},
    ...overrides,
  };
}

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

  it('renders issue title and substitutes placeholders in description body using MarkdownPlaceholderLitRenderer',
     () => {
       const aggregationKey = 'key' as unknown as IssuesManager.IssueAggregator.AggregationKey;
       const issue = StubIssue.createFromRequestIds(['id1']);
       const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue('code', aggregationKey);
       aggregatedIssue.addInstance(issue);
       const description = IssuesManager.MarkdownIssueDescription.createIssueDescriptionFromRawMarkdown(
           '# Fallback heading\n\nCheck {PLACEHOLDER_message} for details.', {
             file: '<unused>',
             title: 'Deprecated feature used',
             links: [],
             substitutions: new Map([
               ['PLACEHOLDER_message', 'body details'],
             ]),
           });
       const view = new Issues.IssueView.IssueView(aggregatedIssue, description);
       const treeOutline = new UI.TreeOutline.TreeOutline();
       treeOutline.appendChild(view);

       assert.strictEqual(view.getIssueTitle(), 'Deprecated feature used');
       assert.strictEqual(view.listItemElement.querySelector('.title')?.textContent, 'Deprecated feature used');
       const markdownView = view.childrenListElement.querySelector('devtools-markdown-view');
       assert.exists(markdownView);
       assert.strictEqual(markdownView.shadowRoot?.querySelector('.markdown-placeholder')?.textContent, 'body details');
       view.clear();
     });

  it('safely escapes HTML, Markdown links, and Unicode BiDi overrides in MarkdownView body without double-escaping special characters',
     () => {
       const aggregationKey = 'key' as unknown as IssuesManager.IssueAggregator.AggregationKey;
       const issue = StubIssue.createFromRequestIds(['id1']);
       const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue('code', aggregationKey);
       aggregatedIssue.addInstance(issue);
       const description = IssuesManager.MarkdownIssueDescription.createIssueDescriptionFromRawMarkdown(
           '# Issue title\n\nBody with \'quotes\' & {PLACEHOLDER_message}.', {
             file: '<unused>',
             links: [],
             substitutions: new Map([
               [
                 'PLACEHOLDER_message',
                 '<script>alert(1)</script> [MDN](https://developer.mozilla.org) & \'val\' \u202Espoof',
               ],
             ]),
           });
       const view = new Issues.IssueView.IssueView(aggregatedIssue, description);
       const treeOutline = new UI.TreeOutline.TreeOutline();
       treeOutline.appendChild(view);

       const markdownView = view.childrenListElement.querySelector('devtools-markdown-view');
       assert.exists(markdownView);
       const placeholderElement = markdownView.shadowRoot?.querySelector('.markdown-placeholder');
       assert.exists(placeholderElement);
       assert.strictEqual(placeholderElement.textContent,
                          '<script>alert(1)</script> [MDN](https://developer.mozilla.org) & \'val\' \\u202Espoof');
       assert.isNull(markdownView.shadowRoot?.querySelector('script'));
       assert.isNull(markdownView.shadowRoot?.querySelector('a'));
       assert.isNull(markdownView.shadowRoot?.querySelector('devtools-link'));
       view.clear();
     });
  it('renders affected requests as table rows when expanded', () => {
    const aggregatedIssue = createAggregatedIssue();
    aggregatedIssue.addInstance(StubIssue.createFromRequestIds(['id1', 'id2']));
    const view = new Issues.IssueView.IssueView(aggregatedIssue, {title: 'Mock issue', links: [], markdown: []});
    const treeOutline = new UI.TreeOutline.TreeOutline();
    treeOutline.appendChild(view);

    view.expand();

    const rows = view.childrenListElement.querySelectorAll('tr.affected-resource-request');
    assert.lengthOf(rows, 2);
    assert.strictEqual(rows[0].getAttribute('data-network-request-id'), 'id1');
    assert.strictEqual(rows[1].getAttribute('data-network-request-id'), 'id2');
    assert.lengthOf(rows[0].querySelectorAll('td.affected-resource-cell devtools-request-link-icon'), 1);
    assert.isFalse(view.affectedResources.hidden);
    view.clear();
  });

  it('renders the issue body items with their position in the set', () => {
    const view = new Issues.IssueView.IssueView(createAggregatedIssue(), {
      title: 'Mock issue',
      links: [{link: 'https://example.com/learn', linkTitle: 'Example article'}],
      markdown: [],
    });
    const treeOutline = new UI.TreeOutline.TreeOutline();
    treeOutline.appendChild(view);

    const description = view.childrenListElement.querySelector('devtools-markdown-view')?.parentElement;
    assert.exists(description);
    assert.strictEqual(description.getAttribute('aria-posinset'), '1');
    assert.strictEqual(description.getAttribute('aria-setsize'), '3');

    const affectedResourcesLabel = view.affectedResources.listItemElement;
    assert.isTrue(affectedResourcesLabel.classList.contains('affected-resources-label'));
    assert.strictEqual(affectedResourcesLabel.textContent, 'Affected resources');
    assert.strictEqual(affectedResourcesLabel.getAttribute('aria-posinset'), '2');
    assert.strictEqual(affectedResourcesLabel.getAttribute('aria-setsize'), '3');
    assert.isTrue(view.affectedResources.hidden);

    const linkWrapper = view.childrenListElement.querySelector('li.link-wrapper');
    assert.exists(linkWrapper);
    assert.strictEqual(linkWrapper.getAttribute('aria-posinset'), '3');
    assert.strictEqual(linkWrapper.getAttribute('aria-setsize'), '3');
    const link = linkWrapper.querySelector('devtools-link');
    assert.exists(link);
    assert.strictEqual(link.getAttribute('href'), 'https://example.com/learn');
    assert.strictEqual(link.textContent, 'Learn more: Example article');
  });

  describe('presenter', () => {
    function createPresenter(aggregatedIssue = createAggregatedIssue()) {
      aggregatedIssue.addInstance(StubIssue.createFromRequestIds(['id1']));
      const view = sinon.stub<Parameters<Issues.IssueView.View>, void>();
      const presenter =
          new Issues.IssueView.IssueView(aggregatedIssue, {title: 'Mock issue', links: [], markdown: []}, view);
      const treeOutline = new UI.TreeOutline.TreeOutline();
      treeOutline.appendChild(presenter);
      return {aggregatedIssue, presenter, view};
    }

    it('renders the issue header into the list item when attached', () => {
      const {presenter, view} = createPresenter();

      sinon.assert.calledOnce(view);
      const [input, output, target] = view.lastCall.args;
      assert.strictEqual(input.title, 'Mock issue');
      assert.strictEqual(input.aggregatedIssuesCount, 1);
      assert.strictEqual(input.iconName, 'issue-text-filled');
      assert.strictEqual(input.iconTitle, 'An improvement issue: there is an opportunity to improve the page');
      assert.isFalse(input.isHidden);
      assert.strictEqual(input.hideIssuesMenuLabel, 'Hide issues like this');
      assert.isUndefined(output);
      assert.strictEqual(target, presenter.listItemElement);
    });

    it('offers to unhide issues like this one for hidden issues', () => {
      const aggregatedIssue = createAggregatedIssue();
      sinon.stub(aggregatedIssue, 'isHidden').returns(true);
      const {view} = createPresenter(aggregatedIssue);

      const [input] = view.lastCall.args;
      assert.isTrue(input.isHidden);
      assert.strictEqual(input.hideIssuesMenuLabel, 'Unhide issues like this');
    });

    it('hides issues with the same code when the hide issues action is invoked', () => {
      const {view} = createPresenter(createAggregatedIssue('MockIssueCode'));

      view.lastCall.args[0].onToggleHideIssues();

      assert.strictEqual(IssuesManager.IssuesManager.getHideIssueByCodeSetting().get()['MockIssueCode'],
                         IssuesManager.IssuesManager.IssueStatus.HIDDEN);
    });

    it('re-renders the header with the new aggregated issue count when expanded after setIssue', () => {
      const {presenter, view} = createPresenter();
      const newAggregatedIssue = createAggregatedIssue();
      newAggregatedIssue.addInstance(StubIssue.createFromRequestIds(['id1']));
      newAggregatedIssue.addInstance(StubIssue.createFromRequestIds(['id2']));

      presenter.setIssue(newAggregatedIssue);
      presenter.expand();

      sinon.assert.calledTwice(view);
      assert.strictEqual(view.lastCall.args[0].aggregatedIssuesCount, 2);
    });
  });

  describe('view', () => {
    it('renders the issue kind icon, aggregated issues count and title', async () => {
      const target = renderElementIntoDOM(document.createElement('li'));

      DEFAULT_VIEW(createHeaderInput(), undefined, target);
      await UI.Widget.Widget.allUpdatesComplete;

      const icon = target.querySelector('devtools-icon');
      assert.exists(icon);
      assert.isTrue(icon.classList.contains('leading-issue-icon'));
      assert.strictEqual(icon.name, 'issue-text-filled');
      assert.strictEqual(icon.title, 'Improvement issue');
      assert.strictEqual(target.querySelector('.aggregated-issues-count span')?.textContent, '3');
      assert.strictEqual(target.querySelector('.header .title')?.textContent, 'Mock issue');
    });

    it('renders the hide issues menu widget in the header', async () => {
      const target = renderElementIntoDOM(document.createElement('li'));

      DEFAULT_VIEW(createHeaderInput(), undefined, target);
      await UI.Widget.Widget.allUpdatesComplete;

      const menuElement = target.querySelector<UI.Widget.WidgetElement<UI.Widget.Widget>>('.header devtools-widget');
      assert.exists(menuElement);
      assert.instanceOf(menuElement.getWidget(), IssuesComponents.HideIssuesMenu.HideIssuesMenu);
      assert.isTrue(menuElement.classList.contains('hide-issues-menu'));
    });

    it('applies the issue and hidden-issue classes to the target', async () => {
      const target = renderElementIntoDOM(document.createElement('li'));

      DEFAULT_VIEW(createHeaderInput({isHidden: true}), undefined, target);
      assert.isTrue(target.classList.contains('issue'));
      assert.isTrue(target.classList.contains('hidden-issue'));

      DEFAULT_VIEW(createHeaderInput({isHidden: false}), undefined, target);
      assert.isTrue(target.classList.contains('issue'));
      assert.isFalse(target.classList.contains('hidden-issue'));
      assert.lengthOf(target.querySelectorAll('.header'), 1);
      await UI.Widget.Widget.allUpdatesComplete;
    });
  });

  describe('request rows view', () => {
    it('renders one row per affected request', () => {
      const target = renderElementIntoDOM(document.createElement('table'));

      REQUEST_ROWS_VIEW({
        requests: [
          {
            affectedRequest: {requestId: 'id1' as Protocol.Network.RequestId, url: 'https://example.com/a.js'},
            networkTab: NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT,
          },
          {
            affectedRequest: {url: 'https://example.com/b.js'},
            networkTab: NetworkForward.UIRequestLocation.UIRequestTabs.COOKIES,
          },
        ],
        requestResolver: new Logs.RequestResolver.RequestResolver(Logs.NetworkLog.NetworkLog.instance()),
        onRequestClick: () => {},
      },
                        undefined, target);

      const rows = target.querySelectorAll('tr.affected-resource-request');
      assert.lengthOf(rows, 2);
      assert.strictEqual(rows[0].getAttribute('data-network-request-id'), 'id1');
      assert.isFalse(rows[1].hasAttribute('data-network-request-id'));
      assert.lengthOf(target.querySelectorAll('td.affected-resource-cell > devtools-request-link-icon'), 2);
    });
  });

  describe('mixed content rows view', () => {
    it('renders a header row and one row per mixed content resource', () => {
      const target = renderElementIntoDOM(document.createElement('table'));

      MIXED_CONTENT_ROWS_VIEW({
        rows: [
          {
            request: {
              affectedRequest: {requestId: 'id1' as Protocol.Network.RequestId, url: 'http://example.com/a.js'},
              networkTab: NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT,
            },
            insecureURL: 'http://example.com/a.js',
            shortPath: 'a.js',
            status: 'Blocked' as Platform.UIString.LocalizedString,
          },
          {
            insecureURL: 'http://example.com/images/b.png',
            shortPath: 'b.png',
            status: 'Warned' as Platform.UIString.LocalizedString,
          },
        ],
        requestResolver: new Logs.RequestResolver.RequestResolver(Logs.NetworkLog.NetworkLog.instance()),
        onRequestClick: () => {},
      },
                              undefined, target);

      const headerCells = target.querySelectorAll('td.affected-resource-header');
      assert.deepEqual(Array.from(headerCells, cell => cell.textContent), ['Name', 'Restriction status']);
      const rows = target.querySelectorAll<HTMLTableRowElement>('tr.affected-resource-mixed-content');
      assert.lengthOf(rows, 2);
      assert.lengthOf(rows[0].querySelectorAll('td.affected-resource-cell > devtools-request-link-icon'), 1);
      assert.strictEqual(rows[0].cells[1].textContent, 'Blocked');
      assert.strictEqual(rows[1].cells[0].textContent, 'b.png');
      assert.strictEqual(rows[1].cells[0].title, 'http://example.com/images/b.png');
      assert.strictEqual(rows[1].cells[1].textContent, 'Warned');
    });
  });
});
