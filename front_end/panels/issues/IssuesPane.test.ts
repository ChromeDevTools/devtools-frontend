// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Bindings from '../../models/bindings/bindings.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as Issues from './issues.js';

describeWithEnvironment('IssuesPane', () => {
  beforeEach(() => {
    const universe = new TestUniverse();
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
  });

  it('shows placeholder if only non-relevant issues have appeared', () => {
    const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    sinon.stub(issuesManager, 'numberOfAllStoredIssues').returns(10);
    const issuesPane = new Issues.IssuesPane.IssuesPane();
    const emptyWidgetElement = issuesPane.contentElement.querySelector('.empty-widget-container');
    assert.exists(emptyWidgetElement);
    const emptyWidgetShadowRoot = emptyWidgetElement.shadowRoot;
    assert.exists(emptyWidgetShadowRoot);
    assert.deepEqual(emptyWidgetShadowRoot.querySelector('.empty-state-header')?.textContent,
                     'Only third-party cookie issues detected');
    assert.deepEqual(emptyWidgetShadowRoot.querySelector('.empty-state-description > span')?.textContent,
                     'On this page you can find warnings from the browser.');
  });

  it('shows placeholder', () => {
    const issuesPane = new Issues.IssuesPane.IssuesPane();
    const emptyWidgetElement = issuesPane.contentElement.querySelector('.empty-widget-container');
    assert.exists(emptyWidgetElement);
    const emptyWidgetShadowRoot = emptyWidgetElement.shadowRoot;
    assert.exists(emptyWidgetShadowRoot);
    assert.deepEqual(emptyWidgetShadowRoot.querySelector('.empty-state-header')?.textContent, 'No issues detected');
    assert.deepEqual(emptyWidgetShadowRoot.querySelector('.empty-state-description > span')?.textContent,
                     'On this page you can find warnings from the browser.');
  });
});
