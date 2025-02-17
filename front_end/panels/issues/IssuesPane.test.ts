// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Issues from './issues.js';

describeWithEnvironment('IssuesPane', () => {
  it('shows placeholder if only non-relevant issues have appeared', () => {
    const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    sinon.stub(issuesManager, 'numberOfAllStoredIssues').returns(10);
    const issuesPane = new Issues.IssuesPane.IssuesPane();
    assert.exists(issuesPane.contentElement.querySelector('.empty-state'));
    assert.deepEqual(
        issuesPane.contentElement.querySelector('.empty-state-header')?.textContent,
        'Only third-party cookie issues detected');
    assert.deepEqual(
        issuesPane.contentElement.querySelector('.empty-state-description > span')?.textContent,
        'On this page you can find warnings from the browser.');
  });

  it('shows placeholder', () => {
    const issuesPane = new Issues.IssuesPane.IssuesPane();
    assert.exists(issuesPane.contentElement.querySelector('.empty-state'));
    assert.deepEqual(issuesPane.contentElement.querySelector('.empty-state-header')?.textContent, 'No issues detected');
    assert.deepEqual(
        issuesPane.contentElement.querySelector('.empty-state-description > span')?.textContent,
        'On this page you can find warnings from the browser.');
  });
});
