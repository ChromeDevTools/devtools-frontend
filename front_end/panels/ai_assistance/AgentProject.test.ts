// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';

import * as AiAssistance from './ai_assistance.js';

describeWithEnvironment('AgentProject', () => {
  async function mockProject(
      files?: Array<{
        path: string,
        content: string,
      }>,
      options?: {
        maxFilesChanged: number,
        maxLinesChanged: number,
      }) {
    const {project, uiSourceCode} = createFileSystemUISourceCode({
      url: Platform.DevToolsPath.urlString`file:///path/to/project/index.html`,
      fileSystemPath: Platform.DevToolsPath.urlString`file:///path/to/project`,
      mimeType: 'text/html',
      content: 'content',
    });

    uiSourceCode.setWorkingCopy('content');

    for (const file of files ?? []) {
      const uiSourceCode = project.createUISourceCode(
          Platform.DevToolsPath.urlString`file:///path/to/project/${file.path}`,
          Common.ResourceType.resourceTypes.Script);
      project.addUISourceCode(uiSourceCode);
      uiSourceCode.setWorkingCopy(file.content);
    }

    return {project: new AiAssistance.AgentProject(project, options), uiSourceCode};
  }

  it('can list files', async () => {
    const {project} = await mockProject();

    assert.deepEqual(project.getFiles(), ['index.html']);
  });

  it('ignores node_modules', async () => {
    const {project} = await mockProject([
      {
        path: 'node_modules/test.js',
        content: 'content',
      },
      {
        path: 'test/another/node_modules/test2.js',
        content: 'content',
      }
    ]);

    assert.deepEqual(project.getFiles(), ['index.html']);
  });

  it('can search files', async () => {
    const {project} = await mockProject();

    assert.deepEqual(await project.searchFiles('content'), [{
                       columnNumber: 0,
                       filepath: 'index.html',
                       lineNumber: 0,
                       matchLength: 7,
                     }]);
  });

  it('can read files', async () => {
    const {project} = await mockProject();

    assert.deepEqual(project.readFile('index.html'), 'content');
  });

  it('can write files files', async () => {
    const {project} = await mockProject();
    project.writeFile('index.html', 'updated');
    assert.deepEqual(project.readFile('index.html'), 'updated');
  });

  describe('limits', () => {
    it('cannot write more files than allowed', async () => {
      const {project} = await mockProject(
          [{
            path: 'example2.js',
            content: 'content',
          }],
          {
            maxFilesChanged: 1,
            maxLinesChanged: 10,
          });

      project.writeFile('index.html', 'updated');
      expect(() => {
        project.writeFile('example2.js', 'updated2');
      }).throws('Too many files changed');
      assert.deepEqual(project.readFile('index.html'), 'updated');
      assert.deepEqual(project.readFile('example2.js'), 'content');
    });

    it('cannot write same file multiple times', async () => {
      const {project} = await mockProject(undefined, {
        maxFilesChanged: 1,
        maxLinesChanged: 10,
      });

      project.writeFile('index.html', 'updated');
      project.writeFile('index.html', 'updated2');
      assert.deepEqual(project.readFile('index.html'), 'updated2');
    });

    it('cannot write more lines than allowed', async () => {
      const {project} = await mockProject(
          [{
            path: 'example2.js',
            content: 'content',
          }],
          {
            maxFilesChanged: 1,
            maxLinesChanged: 1,
          });

      expect(() => {
        project.writeFile('example2.js', 'updated2\nupdated3');
      }).throws('Too many lines changed');
      assert.deepEqual(project.readFile('example2.js'), 'content');
    });
  });
});
