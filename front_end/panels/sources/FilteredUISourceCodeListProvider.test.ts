// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setUpEnvironment} from '../../testing/OverridesHelpers.js';

import * as Sources from './sources.js';

const setUpEnvironmentWithUISourceCode =
    (url: string, resourceType: Common.ResourceType.ResourceType, project?: Workspace.Workspace.Project) => {
      const {workspace, debuggerWorkspaceBinding} = setUpEnvironment();
      Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: false, debuggerWorkspaceBinding});

      if (!project) {
        project = {id: () => url, type: () => Workspace.Workspace.projectTypes.Network} as Workspace.Workspace.Project;
      }

      const uiSourceCode =
          new Workspace.UISourceCode.UISourceCode(project, url as Platform.DevToolsPath.UrlString, resourceType);

      project.uiSourceCodes = () => [uiSourceCode];

      workspace.addProject(project);

      return {workspace, project, uiSourceCode};
    };

describeWithEnvironment('FilteredUISourceCodeListProvider', () => {
  before(() => {
    Root.Runtime.experiments.register(Root.Runtime.ExperimentName.JUST_MY_CODE, '');
  });

  it('should exclude Fetch requests in the result', () => {
    const url = 'http://www.example.com/list-fetch.json';
    const resourceType = Common.ResourceType.resourceTypes.Fetch;

    const {workspace, project} = setUpEnvironmentWithUISourceCode(url, resourceType);

    const filteredUISourceCodeListProvider =
        new Sources.FilteredUISourceCodeListProvider.FilteredUISourceCodeListProvider('test');
    filteredUISourceCodeListProvider.attach();

    const result = filteredUISourceCodeListProvider.itemCount();

    workspace.removeProject(project);

    assert.strictEqual(result, 0);
  });

  it('should exclude XHR requests in the result', () => {
    const url = 'http://www.example.com/list-xhr.json';
    const resourceType = Common.ResourceType.resourceTypes.XHR;

    const {workspace, project} = setUpEnvironmentWithUISourceCode(url, resourceType);

    const filteredUISourceCodeListProvider =
        new Sources.FilteredUISourceCodeListProvider.FilteredUISourceCodeListProvider('test');
    filteredUISourceCodeListProvider.attach();

    const result = filteredUISourceCodeListProvider.itemCount();

    workspace.removeProject(project);

    assert.strictEqual(result, 0);
  });

  it('should include Document requests in the result', () => {
    const url = 'http://www.example.com/index.html';
    const resourceType = Common.ResourceType.resourceTypes.Document;

    const {workspace, project} = setUpEnvironmentWithUISourceCode(url, resourceType);

    const filteredUISourceCodeListProvider =
        new Sources.FilteredUISourceCodeListProvider.FilteredUISourceCodeListProvider('test');
    filteredUISourceCodeListProvider.attach();

    const resultUrl = filteredUISourceCodeListProvider.itemKeyAt(0);
    const resultCount = filteredUISourceCodeListProvider.itemCount();

    workspace.removeProject(project);

    assert.strictEqual(resultUrl, url);
    assert.strictEqual(resultCount, 1);
  });

  it('should exclude ignored script requests in the result', () => {
    const url = 'http://www.example.com/some-script.js';
    const resourceType = Common.ResourceType.resourceTypes.Script;

    const {workspace, project, uiSourceCode} = setUpEnvironmentWithUISourceCode(url, resourceType);

    // ignore the uiSourceCode
    Root.Runtime.experiments.setEnabled(Root.Runtime.ExperimentName.JUST_MY_CODE, true);
    Bindings.IgnoreListManager.IgnoreListManager.instance().ignoreListUISourceCode(uiSourceCode);

    const filteredUISourceCodeListProvider =
        new Sources.FilteredUISourceCodeListProvider.FilteredUISourceCodeListProvider('test');
    filteredUISourceCodeListProvider.attach();

    const result = filteredUISourceCodeListProvider.itemCount();

    workspace.removeProject(project);
    Root.Runtime.experiments.setEnabled(Root.Runtime.ExperimentName.JUST_MY_CODE, false);

    assert.strictEqual(result, 0);
  });

  it('should include Image requests in the result', () => {
    const url = 'http://www.example.com/img.png';
    const resourceType = Common.ResourceType.resourceTypes.Image;

    const {workspace, project} = setUpEnvironmentWithUISourceCode(url, resourceType);

    const filteredUISourceCodeListProvider =
        new Sources.FilteredUISourceCodeListProvider.FilteredUISourceCodeListProvider('test');
    filteredUISourceCodeListProvider.attach();

    const resultUrl = filteredUISourceCodeListProvider.itemKeyAt(0);
    const resultCount = filteredUISourceCodeListProvider.itemCount();

    workspace.removeProject(project);

    assert.strictEqual(resultCount, 1);
    assert.strictEqual(resultUrl, url);
  });

  it('should include Script requests in the result', () => {
    const url = 'http://www.example.com/some-script.js';
    const resourceType = Common.ResourceType.resourceTypes.Script;

    const {workspace, project} = setUpEnvironmentWithUISourceCode(url, resourceType);

    const filteredUISourceCodeListProvider =
        new Sources.FilteredUISourceCodeListProvider.FilteredUISourceCodeListProvider('test');
    filteredUISourceCodeListProvider.attach();

    const resultUrl = filteredUISourceCodeListProvider.itemKeyAt(0);
    const resultCount = filteredUISourceCodeListProvider.itemCount();

    workspace.removeProject(project);

    assert.strictEqual(resultCount, 1);
    assert.strictEqual(resultUrl, url);
  });
});
