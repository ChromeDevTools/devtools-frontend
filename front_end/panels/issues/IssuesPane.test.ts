// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {StubIssue} from '../../testing/StubIssue.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

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
    await issuesPane.updateComplete;
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
    await issuesPane.updateComplete;
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

    const treeElement = Array.from(issuesPane.contentElement.children)
                            .find(
                                (el): el is HTMLElement => Boolean(el.shadowRoot?.querySelector('.issues')),
                            );
    assert.exists(treeElement);
    assert.isFalse(treeElement.hidden);
    const textContent = treeElement.shadowRoot?.textContent ?? '';

    sinon.assert.calledTwice(consoleErrorStub);
    assert.include(textContent, 'Invalid type attribute');
    assert.notInclude(textContent, 'Deprecated feature used');
  });
});
