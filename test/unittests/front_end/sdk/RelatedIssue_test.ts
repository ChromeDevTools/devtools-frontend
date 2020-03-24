// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {connect, disconnect, hasIssues, hasIssueOfCategory, IssueCategory} from '../../../../front_end/sdk/RelatedIssue.js';

describe('hasIssues', () => {
  it('should be false for fresh objects', () => {
    const obj = {};
    assert.isFalse(hasIssues(obj), 'obj should not have an issue');
  });
});

describe('connect', () => {
  it('should cause object to have issues', () => {
    const obj = {};
    const issue = {};  // Use a dummy object;
    connect(obj, IssueCategory.Other, issue);
    assert.isTrue(hasIssues(obj), 'obj should have an issue');
  });

  it('should cause object to have a issue of a specific category', () => {
    const obj = {};
    const issue = {};  // Use a dummy object;
    connect(obj, IssueCategory.Other, issue);
    assert.isTrue(hasIssueOfCategory(obj, IssueCategory.Other), 'obj should have an issue of the specified category');
    assert.isFalse(
        hasIssueOfCategory(obj, IssueCategory.CrossOriginEmbedderPolicy),
        'obj should not have an issue of a different category');
  });

  it('should cause object to have a issue after being called twice', () => {
    const obj = {};
    const issue = {};  // Use a dummy object;
    connect(obj, IssueCategory.Other, issue);
    connect(obj, IssueCategory.Other, issue);
    assert.isTrue(hasIssues(obj), 'obj should have an issue');
    assert.isTrue(hasIssueOfCategory(obj, IssueCategory.Other), 'obj should have an issue of the specified category');
    assert.isFalse(
        hasIssueOfCategory(obj, IssueCategory.CrossOriginEmbedderPolicy),
        'obj should not have an issue of a different category');
  });
});

describe('disconnect', () => {
  it('should remove an issue', () => {
    const obj = {};
    const issue = {};  // Use a dummy object;
    connect(obj, IssueCategory.Other, issue);
    assert.isTrue(hasIssues(obj), 'obj should have an issue');
    disconnect(obj, IssueCategory.Other, issue);
    assert.isFalse(hasIssues(obj), 'obj should not have an issue');
  });

  it('should remove an issue of a specific category', () => {
    const obj = {};
    const issue = {};  // Use a dummy object;
    connect(obj, IssueCategory.Other, issue);
    connect(obj, IssueCategory.CrossOriginEmbedderPolicy, issue);
    assert.isTrue(hasIssueOfCategory(obj, IssueCategory.Other), 'obj should have an issue of this category');
    assert.isTrue(
        hasIssueOfCategory(obj, IssueCategory.CrossOriginEmbedderPolicy),
        'obj should not have an issue of this category');
    disconnect(obj, IssueCategory.Other, issue);
    assert.isFalse(hasIssueOfCategory(obj, IssueCategory.Other), 'obj should no longer have an issue of this category');
    assert.isTrue(
        hasIssueOfCategory(obj, IssueCategory.CrossOriginEmbedderPolicy),
        'obj should still have an issue of this category');
  });

  it('should remove an issue even if connected twice', () => {
    const obj = {};
    const issue = {};  // Use a dummy object;
    connect(obj, IssueCategory.Other, issue);
    connect(obj, IssueCategory.Other, issue);
    disconnect(obj, IssueCategory.Other, issue);
    assert.isFalse(hasIssues(obj), 'obj should not have an issue');
    assert.isFalse(hasIssueOfCategory(obj, IssueCategory.Other), 'obj should not have an issue');
  });

  it('should remove only the specified issue', () => {
    const obj = {};
    const issue1 = {};  // Use a dummy object;
    const issue2 = {};  // Use a dummy object;
    connect(obj, IssueCategory.Other, issue1);
    connect(obj, IssueCategory.Other, issue2);
    disconnect(obj, IssueCategory.Other, issue1);
    assert.isTrue(hasIssues(obj), 'obj should still have an issue');
    assert.isTrue(hasIssueOfCategory(obj, IssueCategory.Other), 'obj should still have an issue');
  });
});
