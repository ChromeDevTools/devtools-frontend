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

  it('renders toolbar checkboxes', async () => {
    const issuesPane = new Issues.IssuesPane.IssuesPane();
    renderElementIntoDOM(issuesPane);
    await issuesPane.updateComplete;

    const checkboxes = [...issuesPane.contentElement.querySelectorAll('devtools-checkbox')];
    assert.deepEqual(checkboxes.map(c => c.title), [
      'Group displayed issues under associated categories',
      'Group displayed issues as page errors, breaking changes, and improvements',
      'Include cookie issues caused by third-party sites',
    ]);
    assert.deepEqual(checkboxes.map(c => c.hidden), [true, false, false]);
  });

  it('renders toolbar issue counter', async () => {
    const issuesPane = new Issues.IssuesPane.IssuesPane();
    renderElementIntoDOM(issuesPane);
    await issuesPane.updateComplete;

    assert.exists(issuesPane.contentElement.querySelector('devtools-issue-counter#console-issues-counter'));
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
      substitutions: new Map([['PLACEHOLDER_Type', 'invalid-type']]),
      links: [],
    });
    universe.issuesManager.addIssue(issuesModel, issue);
  }

  it('toggles autofocus on the issues tree when issues appear', async () => {
    const issuesPane = new Issues.IssuesPane.IssuesPane();
    renderElementIntoDOM(issuesPane);
    await issuesPane.updateComplete;
    const tree = issuesPane.contentElement.querySelector('devtools-tree');
    assert.exists(tree);
    assert.isTrue(tree.hidden);
    assert.isFalse(tree.hasAttribute('autofocus'));

    addPermissionElementIssue();
    await issuesPane.updateComplete;
    assert.isFalse(tree.hidden);
    assert.isTrue(tree.hasAttribute('autofocus'));
  });

  it('groups issues under declarative category items when enabled', async () => {
    const issuesPane = new Issues.IssuesPane.IssuesPane();
    renderElementIntoDOM(issuesPane);
    await issuesPane.updateComplete;
    addPermissionElementIssue();
    Issues.IssuesPane.getGroupIssuesByCategorySetting().set(true);
    await issuesPane.updateComplete;

    const tree = issuesPane.contentElement.querySelector('devtools-tree');
    assert.exists(tree);
    const categoryItem = tree.getInternalTreeOutlineForTest().rootElement().firstChild();
    assert.isTrue(categoryItem?.listItemElement.classList.contains('issue-category'));
    assert.strictEqual(categoryItem?.listItemElement.querySelector('.title')?.textContent, 'Permission element');
    assert.lengthOf(categoryItem?.children() ?? [], 1);
    assert.instanceOf(categoryItem?.firstChild(), Issues.IssueView.IssueView);
    const domCategoryTitles = [
      ...tree.getInternalTreeOutlineForTest().rootElement().childrenListElement.querySelectorAll(
          ':scope > li.issue-category .title'),
    ].map(el => el.textContent);
    assert.deepEqual(domCategoryTitles, ['Permission element', 'Hidden issues']);
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
