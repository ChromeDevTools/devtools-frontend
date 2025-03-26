// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createNetworkProject} from '../../testing/AiAssistanceHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as AiAssistanceModel from '../ai_assistance/ai_assistance.js';

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
    const {uiSourceCode} = createNetworkProject('https://example.com', files);
    return {project: new AiAssistanceModel.AgentProject(options), uiSourceCode};
  }

  it('can list files', async () => {
    const {project} = await mockProject();

    assert.deepEqual(project.getFiles(), ['/index.html']);
  });

  it('ignores inspector-stylesheet', async () => {
    const {project} = await mockProject([
      {
        path: 'inspector-stylesheet',
        content: 'content',
      },
    ]);

    assert.deepEqual(project.getFiles(), ['/index.html']);
  });

  it('can search files', async () => {
    const {project} = await mockProject();

    assert.deepEqual(await project.searchFiles('content'), [{
                       columnNumber: 0,
                       filepath: '/index.html',
                       lineNumber: 0,
                       matchLength: 7,
                     }]);
  });

  it('can read files', async () => {
    const {project} = await mockProject();

    assert.deepEqual(project.readFile('/index.html'), 'content');
  });

  it('can report processed files', async () => {
    const {project} = await mockProject();
    assert.deepEqual(project.getProcessedFiles(), []);
    project.readFile('/index.html');
    assert.deepEqual(project.getProcessedFiles(), ['/index.html']);
  });

  it('can write files files', async () => {
    const {project} = await mockProject();
    project.writeFile('/index.html', 'updated');
    assert.deepEqual(project.readFile('/index.html'), 'updated');
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

      project.writeFile('/index.html', 'updated');
      expect(() => {
        project.writeFile('/example2.js', 'updated2');
      }).throws('Too many files changed');
      assert.deepEqual(project.readFile('/index.html'), 'updated');
      assert.deepEqual(project.readFile('/example2.js'), 'content');
    });

    it('cannot write same file multiple times', async () => {
      const {project} = await mockProject(undefined, {
        maxFilesChanged: 1,
        maxLinesChanged: 10,
      });

      project.writeFile('/index.html', 'updated');
      project.writeFile('/index.html', 'updated2');
      assert.deepEqual(project.readFile('/index.html'), 'updated2');
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
        project.writeFile('/example2.js', 'updated2\nupdated3');
      }).throws('Too many lines changed');
      assert.deepEqual(project.readFile('/example2.js'), 'content');
    });
  });
});
