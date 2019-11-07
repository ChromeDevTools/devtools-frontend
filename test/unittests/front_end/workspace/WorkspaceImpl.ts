// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../front_end/common/common.js';
import {default as WorkspaceImpl, ProjectStore, projectTypes} from '../../../../front_end/workspace/WorkspaceImpl.js';
import {default as UISourceCode} from '../../../../front_end/workspace/UISourceCode.js';

describe('ProjectStore', () => {
  it('can be instantiated correctly', () => {
    const testName = 'Test Project';
    const workspaceImpl = new WorkspaceImpl();
    const testProjectStore = new ProjectStore(workspaceImpl, 1, projectTypes.Service, testName);
    assert.equal(testProjectStore.id(), 1, 'ID was not set correctly');
    assert.equal(testProjectStore.type(), projectTypes.Service, 'type was not set correctly');
    assert.equal(testProjectStore.displayName(), testName, 'display name was not set correctly');
    assert.deepEqual(testProjectStore.workspace(), workspaceImpl, 'display name was not set correctly');
  });

  it('can be removed from workspace', () => {
    const testName = 'Test Project';
    const workspaceImpl = new WorkspaceImpl();
    const testProjectStore = new ProjectStore(workspaceImpl, 1, projectTypes.Service, testName);
    testProjectStore.removeProject();
    assert.isNull(workspaceImpl.project(1), 'the project was not removed');
  });

  it('is able to add a UI source code', () => {
    const workspaceImpl = new WorkspaceImpl();
    const testResourceCategory =
        new Common.ResourceType.ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType =
        new Common.ResourceType.ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
    const testProjectStore = new ProjectStore(workspaceImpl, 1, projectTypes.Service, 'Test Project');
    const testUISourceCode = new UISourceCode(testProjectStore, 'www.test.com', resourceType);
    testProjectStore.addUISourceCode(testUISourceCode);
    assert.deepEqual(
        testProjectStore.uiSourceCodes(), [testUISourceCode], 'UI source code was not added or retrieved successfully');
  });

  it('returns false when trying to add a UI source code that has already been added', () => {
    const workspaceImpl = new WorkspaceImpl();
    const testResourceCategory =
        new Common.ResourceType.ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType =
        new Common.ResourceType.ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
    const testProjectStore = new ProjectStore(workspaceImpl, 1, projectTypes.Service, 'Test Project');
    const testUISourceCode = new UISourceCode(testProjectStore, 'www.test.com', resourceType);
    testProjectStore.addUISourceCode(testUISourceCode);
    const result = testProjectStore.addUISourceCode(testUISourceCode);
    assert.isFalse(result, 'addUISourceCode function did not return false');
  });

  it('is able to remove a UI source code using the URL', () => {
    const workspaceImpl = new WorkspaceImpl();
    const testResourceCategory =
        new Common.ResourceType.ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType =
        new Common.ResourceType.ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
    const testProjectStore = new ProjectStore(workspaceImpl, 1, projectTypes.Service, 'Test Project');
    const testUISourceCode = new UISourceCode(testProjectStore, 'www.test.com', resourceType);
    testProjectStore.addUISourceCode(testUISourceCode);
    assert.deepEqual(
        testProjectStore.uiSourceCodes(), [testUISourceCode], 'UI source code was not added or retrieved successfully');
    testProjectStore.removeUISourceCode('www.test.com');
    assert.deepEqual(testProjectStore.uiSourceCodes(), [], 'UI source code was not removed successfully');
  });

  it('returns undefined when trying to remove a UI source code using a URL that does not exist', () => {
    const workspaceImpl = new WorkspaceImpl();
    const testProjectStore = new ProjectStore(workspaceImpl, 1, projectTypes.Service, 'Test Project');
    const result = testProjectStore.removeUISourceCode('www.test.com');
    assert.isUndefined(result, 'removeUISourceCode did not return undefined');
  });

  it('is able to rename a UI source code', () => {
    const workspaceImpl = new WorkspaceImpl();
    const testResourceCategory =
        new Common.ResourceType.ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType =
        new Common.ResourceType.ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
    const testProjectStore = new ProjectStore(workspaceImpl, 1, projectTypes.Service, 'Test Project');
    const testUISourceCode = new UISourceCode(testProjectStore, 'www.test.com', resourceType);
    testProjectStore.addUISourceCode(testUISourceCode);
    testProjectStore.renameUISourceCode(testUISourceCode, 'www.newTest.com');
    assert.deepEqual(
        testProjectStore.uiSourceCodeForURL('www.newTest.com'), testUISourceCode,
        'UI source code was not renamed successfully');
  });
});

describe('WorkspaceImpl', () => {
  it('can be instantiated correctly', () => {
    const workspaceImpl = new WorkspaceImpl();
    assert.deepEqual(workspaceImpl.projects(), [], 'workspace projects should be empty');
    assert.isFalse(
        workspaceImpl.hasResourceContentTrackingExtensions(),
        'workspace should have resource content tracking extensions set to False');
  });

  it('can have a project added to it', () => {
    const workspaceImpl = new WorkspaceImpl();
    const testProjectStore = new ProjectStore(workspaceImpl, 1, projectTypes.Service, 'Test Project');
    workspaceImpl.addProject(testProjectStore);
    assert.deepEqual(workspaceImpl.projects(), [testProjectStore], 'project was not added successfully');
  });

  it('can retrieve a project using its ID', () => {
    const workspaceImpl = new WorkspaceImpl();
    const testProjectStore1 = new ProjectStore(workspaceImpl, 1, projectTypes.Service, 'Test Project 1');
    const testProjectStore2 = new ProjectStore(workspaceImpl, 2, projectTypes.Service, 'Test Project 2');
    const testProjectStore3 = new ProjectStore(workspaceImpl, 3, projectTypes.Service, 'Test Project 3');
    workspaceImpl.addProject(testProjectStore1);
    workspaceImpl.addProject(testProjectStore2);
    workspaceImpl.addProject(testProjectStore3);
    assert.equal(workspaceImpl.project(2), testProjectStore2, 'project retrieved was not correct');
  });

  it('returns Null if it tried to find a project ID that does not exist', () => {
    const workspaceImpl = new WorkspaceImpl();
    const testProjectStore1 = new ProjectStore(workspaceImpl, 1, projectTypes.Service, 'Test Project 1');
    const testProjectStore2 = new ProjectStore(workspaceImpl, 2, projectTypes.Service, 'Test Project 2');
    const testProjectStore3 = new ProjectStore(workspaceImpl, 3, projectTypes.Service, 'Test Project 3');
    workspaceImpl.addProject(testProjectStore1);
    workspaceImpl.addProject(testProjectStore2);
    workspaceImpl.addProject(testProjectStore3);
    assert.isNull(workspaceImpl.project(4), 'result returned should be null');
  });

  it('returns Null when trying to retrieve UI source code for URL from a certain project if the URL does not exist',
     () => {
       const workspaceImpl = new WorkspaceImpl();
       const testProjectStore = new ProjectStore(workspaceImpl, 1, projectTypes.Service, 'Test Project');
       workspaceImpl.addProject(testProjectStore);
       const result = workspaceImpl.uiSourceCode(1, 'www.test.com');
       assert.isNull(result, 'function did not return Null');
     });

  it('is able to return UI source code for URL from a certain project', () => {
    const workspaceImpl = new WorkspaceImpl();
    const testResourceCategory =
        new Common.ResourceType.ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType =
        new Common.ResourceType.ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
    const testProjectStore = new ProjectStore(workspaceImpl, 1, projectTypes.Service, 'Test Project');
    const testUISourceCode = new UISourceCode(testProjectStore, 'www.test.com', resourceType);
    testProjectStore.addUISourceCode(testUISourceCode);
    workspaceImpl.addProject(testProjectStore);
    const result = workspaceImpl.uiSourceCode(1, 'www.test.com');
    assert.deepEqual(result, testUISourceCode, 'function did not return the correct UI source code');
  });

  it('returns Null when trying to retrieve UI source code for URL from all projects if the URL does not exist', () => {
    const workspaceImpl = new WorkspaceImpl();
    const testProjectStore = new ProjectStore(workspaceImpl, 1, projectTypes.Service, 'Test Project');
    workspaceImpl.addProject(testProjectStore);
    const result = workspaceImpl.uiSourceCodeForURL('www.test.com');
    assert.isNull(result, 'function did not return Null');
  });

  it('is able to return all the UI source codes given the URL from all the projects', () => {
    const workspaceImpl = new WorkspaceImpl();
    const testResourceCategory =
        new Common.ResourceType.ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType =
        new Common.ResourceType.ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);

    const testProjectStore1 = new ProjectStore(workspaceImpl, 1, projectTypes.Service, 'Test Project 1');
    const testUISourceCode1 = new UISourceCode(testProjectStore1, 'www.test1.com', resourceType);
    testProjectStore1.addUISourceCode(testUISourceCode1);

    const testProjectStore2 = new ProjectStore(workspaceImpl, 2, projectTypes.Debugger, 'Test Project 2');
    const testUISourceCode2 = new UISourceCode(testProjectStore2, 'www.test2.com', resourceType);
    testProjectStore2.addUISourceCode(testUISourceCode2);

    const testProjectStore3 = new ProjectStore(workspaceImpl, 3, projectTypes.Service, 'Test Project 3');
    const testUISourceCode3 = new UISourceCode(testProjectStore3, 'www.test3.com', resourceType);
    testProjectStore3.addUISourceCode(testUISourceCode3);

    workspaceImpl.addProject(testProjectStore1);
    workspaceImpl.addProject(testProjectStore2);
    workspaceImpl.addProject(testProjectStore3);

    const result = workspaceImpl.uiSourceCodeForURL('www.test2.com');
    assert.deepEqual(result, testUISourceCode2, 'function did not return the correct UI source code');
  });

  it('returns UI source codes for a certain type', () => {
    const workspaceImpl = new WorkspaceImpl();
    const testResourceCategory =
        new Common.ResourceType.ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType =
        new Common.ResourceType.ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);

    const testProjectStore1 = new ProjectStore(workspaceImpl, 1, projectTypes.Service, 'Test Project 1');
    const testUISourceCode1 = new UISourceCode(testProjectStore1, 'www.test1.com', resourceType);
    testProjectStore1.addUISourceCode(testUISourceCode1);

    const testProjectStore2 = new ProjectStore(workspaceImpl, 2, projectTypes.Debugger, 'Test Project 2');
    const testUISourceCode2 = new UISourceCode(testProjectStore2, 'www.test2.com', resourceType);
    testProjectStore2.addUISourceCode(testUISourceCode2);

    const testProjectStore3 = new ProjectStore(workspaceImpl, 3, projectTypes.Service, 'Test Project 3');
    const testUISourceCode3 = new UISourceCode(testProjectStore3, 'www.test3.com', resourceType);
    testProjectStore3.addUISourceCode(testUISourceCode3);

    workspaceImpl.addProject(testProjectStore1);
    workspaceImpl.addProject(testProjectStore2);
    workspaceImpl.addProject(testProjectStore3);
    const result = workspaceImpl.uiSourceCodesForProjectType(projectTypes.Service);
    assert.deepEqual(result, [testUISourceCode1, testUISourceCode3], 'UI source codes were not returned correctly');
  });

  it('can retrieve projects given a certain type', () => {
    const workspaceImpl = new WorkspaceImpl();
    const testProjectStore1 = new ProjectStore(workspaceImpl, 1, projectTypes.Service, 'Test Project 1');
    const testProjectStore2 = new ProjectStore(workspaceImpl, 2, projectTypes.Debugger, 'Test Project 2');
    const testProjectStore3 = new ProjectStore(workspaceImpl, 3, projectTypes.Service, 'Test Project 3');
    workspaceImpl.addProject(testProjectStore1);
    workspaceImpl.addProject(testProjectStore2);
    workspaceImpl.addProject(testProjectStore3);
    assert.deepEqual(
        workspaceImpl.projectsForType(projectTypes.Service), [testProjectStore1, testProjectStore3],
        'projects were not retrieved correctly');
  });

  it('returns UI source codes for all its projects', () => {
    const workspaceImpl = new WorkspaceImpl();
    const testResourceCategory =
        new Common.ResourceType.ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType =
        new Common.ResourceType.ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);

    const testProjectStore1 = new ProjectStore(workspaceImpl, 1, projectTypes.Service, 'Test Project 1');
    const testUISourceCode1 = new UISourceCode(testProjectStore1, 'www.test1.com', resourceType);
    testProjectStore1.addUISourceCode(testUISourceCode1);

    const testProjectStore2 = new ProjectStore(workspaceImpl, 2, projectTypes.Debugger, 'Test Project 2');
    const testUISourceCode2 = new UISourceCode(testProjectStore2, 'www.test2.com', resourceType);
    testProjectStore2.addUISourceCode(testUISourceCode2);

    const testProjectStore3 = new ProjectStore(workspaceImpl, 3, projectTypes.Service, 'Test Project 3');
    const testUISourceCode3 = new UISourceCode(testProjectStore3, 'www.test3.com', resourceType);
    testProjectStore3.addUISourceCode(testUISourceCode3);

    workspaceImpl.addProject(testProjectStore1);
    workspaceImpl.addProject(testProjectStore2);
    workspaceImpl.addProject(testProjectStore3);
    const result = workspaceImpl.uiSourceCodes();
    assert.deepEqual(
        result, [testUISourceCode1, testUISourceCode2, testUISourceCode3],
        'UI source codes were not returned correctly');
  });

  it('is able to set whether or not it has resource content tracking extensions', () => {
    const workspaceImpl = new WorkspaceImpl();
    assert.isFalse(
        workspaceImpl.hasResourceContentTrackingExtensions(),
        'workspace should have resource content tracking extensions set to False');
    workspaceImpl.setHasResourceContentTrackingExtensions(true);
    assert.isTrue(
        workspaceImpl.hasResourceContentTrackingExtensions(),
        'workspace should have resource content tracking extensions set to True');
  });
});
