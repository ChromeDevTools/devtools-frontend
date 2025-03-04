// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';

import * as AiAssistance from './ai_assistance.js';

describeWithEnvironment('AgentProject', () => {
  async function mockProject() {
    const {project, uiSourceCode} = createFileSystemUISourceCode({
      url: Platform.DevToolsPath.urlString`file:///path/to/overrides/example.html`,
      fileSystemPath: Platform.DevToolsPath.urlString`file:///path/to/overrides/`,
      mimeType: 'text/html',
      content: 'content',
    });

    uiSourceCode.setWorkingCopy('content working copy');

    return {project: new AiAssistance.AgentProject(project), uiSourceCode};
  }

  it('can list files', async () => {
    const {project} = await mockProject();

    assert.deepEqual(project.getFiles(), ['example.html']);
  });

  it('can search files', async () => {
    const {project} = await mockProject();

    assert.deepEqual(await project.searchFiles('content working copy'), [{
                       columnNumber: 0,
                       filepath: 'example.html',
                       lineNumber: 0,
                       matchLength: 20,
                     }]);
  });

  it('can read files', async () => {
    const {project} = await mockProject();

    assert.deepEqual(project.readFile('example.html'), 'content working copy');
  });

  it('can write files files', async () => {
    const {project} = await mockProject();
    project.writeFile('example.html', 'updated');
    assert.deepEqual(project.readFile('example.html'), 'updated');
  });
});
