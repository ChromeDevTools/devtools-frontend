// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {StubIssue} from '../../testing/StubIssue.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Issues from './issues.js';

describe('IssuesPane', () => {
  setupLocaleHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    sinon.stub(Common.Settings.Settings, 'instance').returns(universe.settings);
    sinon.stub(IssuesManager.IssuesManager.IssuesManager, 'instance').returns(universe.issuesManager);
  });

  it('shows placeholder if only non-relevant issues have appeared', async () => {
    sinon.stub(universe.issuesManager, 'numberOfAllStoredIssues').returns(10);
    const issuesPane = new Issues.IssuesPane.IssuesPane();
    renderElementIntoDOM(issuesPane);
    await issuesPane.updateComplete;
    await UI.Widget.Widget.allUpdatesComplete;
    const emptyWidgetElement = issuesPane.contentElement.querySelector(
        '.empty-widget-container',
    );
    assert.exists(emptyWidgetElement);
    const emptyWidgetShadowRoot = emptyWidgetElement.shadowRoot;
    assert.exists(emptyWidgetShadowRoot);
    assert.deepEqual(
        emptyWidgetShadowRoot.querySelector('.empty-state-header')?.textContent,
        'Only third-party cookie issues detected',
    );
    assert.deepEqual(
        emptyWidgetShadowRoot.querySelector('.empty-state-description > span')?.textContent,
        'On this page you can find warnings from the browser',
    );
  });

  it('shows placeholder', async () => {
    const issuesPane = new Issues.IssuesPane.IssuesPane();
    renderElementIntoDOM(issuesPane);
    await issuesPane.updateComplete;
    await UI.Widget.Widget.allUpdatesComplete;
    const emptyWidgetElement = issuesPane.contentElement.querySelector(
        '.empty-widget-container',
    );
    assert.exists(emptyWidgetElement);
    const emptyWidgetShadowRoot = emptyWidgetElement.shadowRoot;
    assert.exists(emptyWidgetShadowRoot);
    assert.deepEqual(
        emptyWidgetShadowRoot.querySelector('.empty-state-header')?.textContent,
        'No issues detected',
    );
    assert.deepEqual(
        emptyWidgetShadowRoot.querySelector('.empty-state-description > span')?.textContent,
        'On this page you can find warnings from the browser',
    );
  });

  it('recovers and renders subsequent issues when an issue throws during view creation', async () => {
    const target = universe.createTarget();
    universe.targetManager.setScopeTarget(target);
    const issuesModel = target.model(SDK.IssuesModel.IssuesModel);
    assert.exists(issuesModel);

    const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    const issuesPane = new Issues.IssuesPane.IssuesPane();
    renderElementIntoDOM(issuesPane);
    await issuesPane.updateComplete;

    const consoleErrorStub = sinon.stub(console, 'error');
    const originalAppend = issuesPane.appendIssueViewToParent.bind(issuesPane);
    sinon.stub(issuesPane, 'appendIssueViewToParent').callsFake((issueView, parent) => {
      originalAppend(issueView, parent);
      if (issueView.getIssueTitle() === 'Deprecated feature used') {
        throw new Error('Simulated rendering error during issue attachment');
      }
    });

    const invalidMarkdownIssue = new StubIssue('InvalidMarkdownIssue', [], []);
    sinon.stub(invalidMarkdownIssue, 'getDescription').returns({
      file: 'deprecation.md',
      substitutions: new Map(),
      links: [],
    });

    const badIssue = new StubIssue('BadIssue', [], []);
    sinon.stub(badIssue, 'getDescription').returns({
      file: 'deprecation.md',
      title: 'Deprecated feature used',
      substitutions: new Map([
        ['PLACEHOLDER_message', 'Some deprecation message'],
      ]),
      links: [],
    });

    const goodIssue = new StubIssue('GoodIssue', [], []);
    sinon.stub(goodIssue, 'getDescription').returns({
      file: 'permissionElementInvalidType.md',
      substitutions: new Map([
        ['PLACEHOLDER_Type', 'invalid-type'],
      ]),
      links: [],
    });

    issuesManager.addIssue(issuesModel, invalidMarkdownIssue);
    issuesManager.addIssue(issuesModel, badIssue);
    issuesManager.addIssue(issuesModel, goodIssue);
    await issuesPane.updateComplete;

    const treeElement = issuesPane.contentElement.querySelector('devtools-tree');
    assert.exists(treeElement);
    assert.isFalse(treeElement.hidden);
    const textContent = treeElement.shadowRoot?.textContent ?? '';

    sinon.assert.calledTwice(consoleErrorStub);
    assert.include(textContent, 'Invalid type attribute');
    assert.notInclude(textContent, 'Deprecated feature used');
  });

  function addPermissionElementIssue(): void {
    const target = universe.createTarget();
    universe.targetManager.setScopeTarget(target);
    const issuesModel = target.model(SDK.IssuesModel.IssuesModel);
    assert.exists(issuesModel);
    const issue = new StubIssue('PermissionElementIssue', [], []);
    sinon.stub(issue, 'getCategory').returns(IssuesManager.Issue.IssueCategory.PERMISSION_ELEMENT);
    sinon.stub(issue, 'getDescription').returns({
      file: 'permissionElementInvalidType.md',
      substitutions: new Map([
        ['PLACEHOLDER_Type', 'invalid-type'],
      ]),
      links: [],
    });
    universe.issuesManager.addIssue(issuesModel, issue);
  }

  describe('presenter', () => {
    async function createIssuesPane() {
      const view = createViewFunctionStub(Issues.IssuesPane.IssuesPane);
      const issuesPane = new Issues.IssuesPane.IssuesPane(undefined, view);
      await issuesPane.updateComplete;
      return {view, issuesPane};
    }

    it('passes the settings and the empty state to the view', async () => {
      const {view} = await createIssuesPane();

      assert.strictEqual(view.input.groupByCategorySetting.name, 'group-issues-by-category');
      assert.strictEqual(view.input.groupByKindSetting.name, 'group-issues-by-kind');
      assert.strictEqual(view.input.showThirdPartyIssuesSetting.name, 'show-third-party-issues');
      assert.strictEqual(view.input.issueCounterData.issuesManager, universe.issuesManager);
      assert.isFalse(view.input.showTree);
      assert.strictEqual(view.input.noIssuesHeader, 'No issues detected');
      assert.isEmpty(view.input.categories);
      assert.lengthOf(view.input.treeElements, 1);
      assert.notInstanceOf(view.input.treeElements[0], Issues.IssueView.IssueView);
    });

    it('passes top-level issue views followed by the hidden issues row to the view', async () => {
      const {view, issuesPane} = await createIssuesPane();

      addPermissionElementIssue();
      await issuesPane.updateComplete;

      assert.isTrue(view.input.showTree);
      assert.isEmpty(view.input.categories);
      assert.lengthOf(view.input.treeElements, 2);
      const [issueView, hiddenIssuesRow] = view.input.treeElements;
      assert.instanceOf(issueView, Issues.IssueView.IssueView);
      assert.strictEqual(issueView.getIssueTitle(), 'Invalid type attribute');
      assert.notInstanceOf(hiddenIssuesRow, Issues.IssueView.IssueView);
      assert.isTrue(hiddenIssuesRow.hidden);
    });

    it('groups issue views by category as data items when the setting is enabled', async () => {
      const {view, issuesPane} = await createIssuesPane();
      addPermissionElementIssue();
      await issuesPane.updateComplete;

      view.input.groupByCategorySetting.set(true);
      await issuesPane.updateComplete;

      assert.lengthOf(view.input.categories, 1);
      assert.strictEqual(view.input.categories[0].title, 'Permission element');
      assert.lengthOf(view.input.categories[0].issues, 1);
      assert.strictEqual(view.input.categories[0].issues[0].getIssueTitle(), 'Invalid type attribute');
      assert.lengthOf(view.input.treeElements, 1);
    });

    it('groups issue views by kind when the setting is enabled', async () => {
      const {view, issuesPane} = await createIssuesPane();
      addPermissionElementIssue();
      await issuesPane.updateComplete;

      view.input.groupByKindSetting.set(true);
      await issuesPane.updateComplete;

      assert.isEmpty(view.input.categories);
      assert.lengthOf(view.input.treeElements, 2);
      const [kindView] = view.input.treeElements;
      assert.notInstanceOf(kindView, Issues.IssueView.IssueView);
      const [issueView] = kindView.children();
      assert.instanceOf(issueView, Issues.IssueView.IssueView);
      assert.strictEqual(issueView.getIssueTitle(), 'Invalid type attribute');
    });
  });

  describe('view', () => {
    function renderView(input: Partial<Issues.IssuesPane.ViewInput>, existingTarget?: HTMLElement): HTMLElement {
      const target = existingTarget ?? renderElementIntoDOM(document.createElement('div'));
      const viewInput: Issues.IssuesPane.ViewInput = {
        groupByCategorySetting: universe.settings.createSetting('group-issues-by-category', false),
        groupByKindSetting: universe.settings.createSetting('group-issues-by-kind', false),
        showThirdPartyIssuesSetting: universe.settings.createSetting('show-third-party-issues', true),
        issueCounterData: {issuesManager: universe.issuesManager},
        issueCounterTitle: '0 page errors, 0 breaking changes, 0 possible improvements',
        showTree: false,
        categories: [],
        treeElements: [],
        noIssuesHeader: 'No issues detected',
        ...input,
      };
      Issues.IssuesPane.DEFAULT_VIEW(viewInput, undefined, target);
      return target;
    }

    it('renders toolbar checkboxes', () => {
      const target = renderView({});
      const checkboxes = [...target.querySelectorAll('devtools-checkbox')];
      assert.deepEqual(checkboxes.map(checkbox => checkbox.title), [
        'Group displayed issues under associated categories',
        'Group displayed issues as page errors, breaking changes, and improvements',
        'Include cookie issues caused by third-party sites',
      ]);
      assert.deepEqual(checkboxes.map(checkbox => checkbox.hidden), [true, false, false]);
    });

    it('renders toolbar issue counter', () => {
      const target = renderView({});
      const issueCounter = target.querySelector('devtools-issue-counter');
      assert.exists(issueCounter);
      assert.strictEqual(issueCounter.id, 'console-issues-counter');
      assert.strictEqual(issueCounter.title, '0 page errors, 0 breaking changes, 0 possible improvements');
    });

    it('renders the empty state instead of the tree', () => {
      const target = renderView({showTree: false});
      const tree = target.querySelector('devtools-tree');
      assert.isTrue(tree?.hidden);
      assert.isFalse(tree?.hasAttribute('autofocus'));
      const widgetElement = target.querySelector<UI.Widget.WidgetElement<UI.Widget.Widget>>('devtools-widget');
      assert.instanceOf(widgetElement?.getWidget(), UI.EmptyWidget.EmptyWidget);
    });

    it('renders category groups before tree elements', () => {
      const first = new UI.TreeOutline.TreeElement('first');
      const target = renderView({
        showTree: true,
        categories: [{category: IssuesManager.Issue.IssueCategory.OTHER, title: 'Other', issues: []}],
        treeElements: [first],
      });
      const tree = target.querySelector('devtools-tree');
      assert.exists(tree);
      assert.isFalse(tree.hidden);
      assert.isTrue(tree.hasAttribute('autofocus'));
      tree.flushPendingUpdatesForTesting();
      const children = tree.getInternalTreeOutlineForTest().rootElement().children();
      assert.lengthOf(children, 2);
      assert.isTrue(children[0].listItemElement.classList.contains('issue-category'));
      assert.strictEqual(children[0].listItemElement.querySelector('.title')?.textContent, 'Other');
      assert.strictEqual(children[1], first);
    });

    it('keeps category groups before tree elements in the DOM when categories are added dynamically', () => {
      const trailing = new UI.TreeOutline.TreeElement('trailing');
      const target = renderView({showTree: true, categories: [], treeElements: [trailing]});
      const tree = target.querySelector('devtools-tree');
      assert.exists(tree);
      tree.flushPendingUpdatesForTesting();

      renderView({
        showTree: true,
        categories: [{category: IssuesManager.Issue.IssueCategory.OTHER, title: 'Other', issues: []}],
        treeElements: [trailing],
      },
                 target);
      tree.flushPendingUpdatesForTesting();

      const root = tree.getInternalTreeOutlineForTest().rootElement();
      const children = root.children();
      assert.lengthOf(children, 2);
      const domListItems = [...root.childrenListElement.querySelectorAll(':scope > li')];
      assert.deepEqual(domListItems, [children[0].listItemElement, trailing.listItemElement]);
    });
  });

  it('focuses the first issue on the first IssuesPane.focus() call', async () => {
    const issuesPane = new Issues.IssuesPane.IssuesPane();
    renderElementIntoDOM(issuesPane);
    addPermissionElementIssue();
    await issuesPane.updateComplete;

    const tree = issuesPane.contentElement.querySelector('devtools-tree');
    assert.exists(tree);
    const firstChild = tree.getInternalTreeOutlineForTest().firstChild();
    assert.exists(firstChild);

    issuesPane.focus();

    assert.isTrue(firstChild.selected);
    assert.isTrue(firstChild.listItemElement.hasFocus());
  });

  it('preserves selection on hidden issues row when a later-sorting category is added', async () => {
    const issuesPane = new Issues.IssuesPane.IssuesPane();
    renderElementIntoDOM(issuesPane);
    Issues.IssuesPane.getGroupIssuesByCategorySetting().set(true);
    const target = universe.createTarget();
    universe.targetManager.setScopeTarget(target);
    const issuesModel = target.model(SDK.IssuesModel.IssuesModel);
    assert.exists(issuesModel);

    const corsIssue = new StubIssue('CorsIssue', [], []);
    sinon.stub(corsIssue, 'getCategory').returns(IssuesManager.Issue.IssueCategory.CORS);
    sinon.stub(corsIssue, 'getDescription').returns({
      file: 'permissionElementInvalidType.md',
      substitutions: new Map([['PLACEHOLDER_Type', 'cors']]),
      links: [],
    });
    const hiddenIssue = new StubIssue('HiddenIssue', [], []);
    sinon.stub(hiddenIssue, 'getDescription').returns({
      file: 'permissionElementInvalidType.md',
      substitutions: new Map([['PLACEHOLDER_Type', 'hidden']]),
      links: [],
    });
    IssuesManager.IssuesManager.getHideIssueByCodeSetting().set({
      HiddenIssue: IssuesManager.IssuesManager.IssueStatus.HIDDEN,
    });
    universe.issuesManager.addIssue(issuesModel, hiddenIssue);
    universe.issuesManager.addIssue(issuesModel, corsIssue);
    await issuesPane.updateComplete;

    const tree = issuesPane.contentElement.querySelector('devtools-tree');
    assert.exists(tree);
    const root = tree.getInternalTreeOutlineForTest().rootElement();
    const hiddenRow = root.lastChild();
    assert.exists(hiddenRow);
    assert.isFalse(hiddenRow.hidden);
    hiddenRow.select();
    assert.isTrue(hiddenRow.selected);

    const permissionIssue = new StubIssue('PermissionElementIssue', [], []);
    sinon.stub(permissionIssue, 'getCategory').returns(IssuesManager.Issue.IssueCategory.PERMISSION_ELEMENT);
    sinon.stub(permissionIssue, 'getDescription').returns({
      file: 'permissionElementInvalidType.md',
      substitutions: new Map([['PLACEHOLDER_Type', 'invalid-type']]),
      links: [],
    });
    universe.issuesManager.addIssue(issuesModel, permissionIssue);
    await issuesPane.updateComplete;

    assert.isTrue(hiddenRow.selected);
    assert.strictEqual(root.lastChild(), hiddenRow);
  });
});
