// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import {render} from '../../ui/lit/lit.js';

import * as Issues from './issues.js';

const {AffectedResourcesView, DEFAULT_VIEW, renderElementCell} = Issues.AffectedResourcesView;

describe('AffectedResourcesView', () => {
  describe('view', () => {
    function renderView(input: Issues.AffectedResourcesView.ViewInput,
                        target = document.createElement('li')): HTMLElement {
      renderElementIntoDOM(target);
      DEFAULT_VIEW(input, undefined, target);
      return target;
    }

    it('renders the affected resource count label', () => {
      const target = renderView({resourceNameWithCount: '2 requests'});

      const labels = target.querySelectorAll('div.affected-resource-label');
      assert.lengthOf(labels, 1);
      assert.strictEqual(labels[0].textContent, '2 requests');
      assert.deepEqual(Array.from(labels[0].classList), ['affected-resource-label']);
    });

    it('adds the extra label class', () => {
      const target = renderView({resourceNameWithCount: '1 request', labelClass: 'extra-label'});

      const label = target.querySelector('.affected-resource-label');
      assert.exists(label);
      assert.isTrue(label.classList.contains('extra-label'));
    });

    it('updates the label in place when re-rendered', () => {
      const target = renderView({resourceNameWithCount: ''});

      DEFAULT_VIEW({resourceNameWithCount: '3 cookies'}, undefined, target);

      const labels = target.querySelectorAll('.affected-resource-label');
      assert.lengthOf(labels, 1);
      assert.strictEqual(labels[0].textContent, '3 cookies');
    });

    it('keeps the existing content of the target', () => {
      const target = document.createElement('li');
      const title = document.createElement('span');
      target.append(title);

      renderView({resourceNameWithCount: '1 element'}, target);

      assert.strictEqual(target.firstElementChild, title);
      assert.strictEqual(target.lastElementChild?.textContent, '1 element');
    });
  });

  describeWithEnvironment('renderElementCell', () => {
    setupLocaleHooks();

    function renderCell(element: Issues.AffectedResourcesView.ElementCellData): HTMLTableCellElement {
      const target = document.createElement('tr');
      renderElementIntoDOM(target);
      render(renderElementCell(element), target);
      const cell = target.querySelector('td');
      assert.exists(cell);
      return cell;
    }

    it('renders the node name when the element cannot be resolved', () => {
      const cell = renderCell({nodeName: 'img', onElementClick: () => {}});

      assert.strictEqual(cell.textContent, 'img');
      assert.isFalse(cell.classList.contains('affected-resource-element'));
    });

    it('renders a fallback text when the element has no node name', () => {
      const cell = renderCell({nodeName: '', onElementClick: () => {}});

      assert.strictEqual(cell.textContent, 'Unavailable');
    });

    it('renders a link to the element when the element can be resolved', async () => {
      const deferredNode = new SDK.DOMModel.DeferredDOMNode(createTarget(), 42 as Protocol.DOM.BackendNodeId);
      const cell = renderCell({nodeName: 'img', deferredNode, onElementClick: () => {}});
      await UI.Widget.Widget.allUpdatesComplete;

      assert.isTrue(cell.classList.contains('affected-resource-element'));
      assert.isTrue(cell.classList.contains('devtools-link'));
      assert.lengthOf(cell.querySelectorAll('devtools-widget'), 1);
    });
  });

  describeWithEnvironment('presenter', () => {
    setupLocaleHooks();

    class TestAffectedResourcesView extends AffectedResourcesView {
      count = 0;
      labelClass?: string;

      get table(): HTMLElement {
        return this.affectedResources;
      }

      protected override getAffectedResourcesLabelClass(): string|undefined {
        return this.labelClass;
      }

      protected override getResourceNameWithCount(count: number): string {
        return `${count} test resources`;
      }

      override update(): void {
        this.updateAffectedResourceCount(this.count);
      }

      createElementCellDataForTest(element: IssuesManager.Issue.AffectedElement):
          Issues.AffectedResourcesView.ElementCellData {
        return this.createElementCellData(element, IssuesManager.Issue.IssueCategory.OTHER);
      }
    }

    function createPresenter() {
      const aggregationKey = 'key' as unknown as IssuesManager.IssueAggregator.AggregationKey;
      const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue('code', aggregationKey);
      const parentView = sinon.createStubInstance(Issues.IssueView.IssueView);
      const view = sinon.stub<Parameters<Issues.AffectedResourcesView.View>, void>();
      const presenter = new TestAffectedResourcesView(parentView, aggregatedIssue, 'test-resources', view);
      return {presenter, view, parentView};
    }

    it('renders an empty label into its list item when created', () => {
      const {presenter, view} = createPresenter();

      sinon.assert.calledOnce(view);
      const [input, output, target] = view.lastCall.args;
      assert.deepEqual(input, {resourceNameWithCount: '', labelClass: undefined});
      assert.isUndefined(output);
      assert.strictEqual(target, presenter.listItemElement);
    });

    it('renders the affected resources table into a child tree element', () => {
      const {presenter} = createPresenter();

      assert.strictEqual(presenter.childCount(), 1);
      const body = presenter.firstChild();
      assert.exists(body);
      assert.strictEqual(body.listItemElement.querySelector('table.affected-resource-list'), presenter.table);
    });

    it('re-renders the label with the resource count on update', () => {
      const {presenter, view, parentView} = createPresenter();
      presenter.count = 2;

      presenter.update();

      sinon.assert.calledTwice(view);
      assert.strictEqual(view.lastCall.args[0].resourceNameWithCount, '2 test resources');
      assert.isFalse(presenter.isEmpty());
      assert.isFalse(presenter.hidden);
      sinon.assert.calledOnce(parentView.updateAffectedResourceVisibility);
    });

    it('is hidden when there are no affected resources', () => {
      const {presenter, view} = createPresenter();

      presenter.update();

      assert.strictEqual(view.lastCall.args[0].resourceNameWithCount, '0 test resources');
      assert.isTrue(presenter.isEmpty());
      assert.isTrue(presenter.hidden);
    });

    it('passes the label class of the subclass to the view', () => {
      const {presenter, view} = createPresenter();
      presenter.labelClass = 'extra-label';

      presenter.update();

      assert.strictEqual(view.lastCall.args[0].labelClass, 'extra-label');
    });

    it('expands only if there is exactly one affected resource', () => {
      const {presenter} = createPresenter();
      const treeOutline = new UI.TreeOutline.TreeOutline();
      treeOutline.appendChild(presenter);
      presenter.count = 2;
      presenter.update();

      presenter.expandIfOneResource();
      assert.isFalse(presenter.expanded);

      presenter.count = 1;
      presenter.update();
      presenter.expandIfOneResource();
      assert.isTrue(presenter.expanded);
    });

    it('renders the label and the table with the default views', () => {
      const aggregationKey = 'key' as unknown as IssuesManager.IssueAggregator.AggregationKey;
      const aggregatedIssue = new IssuesManager.IssueAggregator.AggregatedIssue('code', aggregationKey);
      const parentView = sinon.createStubInstance(Issues.IssueView.IssueView);
      const presenter = new TestAffectedResourcesView(parentView, aggregatedIssue, 'test-resources');
      presenter.count = 1;

      presenter.update();

      const label = presenter.listItemElement.querySelector('.affected-resource-label');
      assert.strictEqual(label?.textContent, '1 test resources');
      assert.strictEqual(label?.parentElement, presenter.listItemElement);
      assert.isTrue(presenter.table.classList.contains('affected-resource-list'));
    });

    it('creates element cell data without a deferred node if the element has no target', () => {
      const {presenter} = createPresenter();

      const data = presenter.createElementCellDataForTest(
          {backendNodeId: 1 as Protocol.DOM.BackendNodeId, nodeName: 'div', target: null});

      assert.strictEqual(data.nodeName, 'div');
      assert.isUndefined(data.deferredNode);
    });

    it('creates element cell data with a deferred node if the element has a target', () => {
      const {presenter} = createPresenter();
      const data = presenter.createElementCellDataForTest(
          {backendNodeId: 42 as Protocol.DOM.BackendNodeId, nodeName: 'img', target: createTarget()});

      assert.strictEqual(data.nodeName, 'img');
      assert.instanceOf(data.deferredNode, SDK.DOMModel.DeferredDOMNode);
      assert.strictEqual(data.deferredNode?.backendNodeId(), 42);
    });

    it('records a user metric when the element cell is clicked', () => {
      const {presenter} = createPresenter();
      const issuesPanelResourceOpened = sinon.spy(Host.userMetrics, 'issuesPanelResourceOpened');
      const data = presenter.createElementCellDataForTest(
          {backendNodeId: 42 as Protocol.DOM.BackendNodeId, nodeName: 'img', target: createTarget()});

      data.onElementClick();

      sinon.assert.calledOnceWithExactly(issuesPanelResourceOpened, IssuesManager.Issue.IssueCategory.OTHER,
                                         Issues.AffectedResourcesView.AffectedItem.ELEMENT);
    });
  });
});
