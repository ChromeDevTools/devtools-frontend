// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Platform from '../../../core/platform/platform.js';
import {mockAidaClient, type MockAidaResponse} from '../../../testing/AiAssistanceHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import {createFileSystemUISourceCode} from '../../../testing/UISourceCodeHelpers.js';
import {type ActionResponse, FileUpdateAgent, PatchAgent, type ResponseData, ResponseType} from '../ai_assistance.js';

/**
 * TODO: the following tests have to be added:
 *
 * - listFiles should have restricted view on files (node_modules etc).
 * - searchInFiles should work with dirty UiSourceCodes.
 * - updateFiles should verify better that working copies are updated.
 */
describeWithEnvironment('PatchAgent', () => {
  async function testAgent(
      mock: Array<[MockAidaResponse, ...MockAidaResponse[]]>,
      fileAgentMock?: Array<[MockAidaResponse, ...MockAidaResponse[]]>): Promise<ResponseData[]> {
    const {project, uiSourceCode} = createFileSystemUISourceCode({
      url: Platform.DevToolsPath.urlString`file:///path/to/overrides/example.html`,
      fileSystemPath: Platform.DevToolsPath.urlString`file:///path/to/overrides`,
      mimeType: 'text/html',
      content: 'content',
    });

    uiSourceCode.setWorkingCopy('content working copy');

    const agent = new PatchAgent({
      aidaClient: mockAidaClient(mock),
      project,
      fileUpdateAgent: new FileUpdateAgent({
        aidaClient: mockAidaClient(fileAgentMock),
      })
    });

    const {responses} = await agent.applyChanges('summary');

    return responses;
  }

  it('calls listFiles', async () => {
    const responses = await testAgent([
      [{explanation: '', functionCalls: [{name: 'listFiles', args: {}}]}], [{
        explanation: 'done',
      }]
    ]);

    const action = responses.find(response => response.type === ResponseType.ACTION);
    assert.exists(action);
    assert.deepEqual(action, {
      type: 'action' as ActionResponse['type'],
      output: '{"files":["example.html"]}',
      canceled: false,
      code: undefined,
    });
  });

  it('calls searchInFiles', async () => {
    const responses = await testAgent([
      [{
        explanation: '',
        functionCalls: [{
          name: 'searchInFiles',
          args: {
            query: 'content',
          }
        }]
      }],
      [{
        explanation: 'done',
      }]
    ]);

    const action = responses.find(response => response.type === ResponseType.ACTION);
    assert.exists(action);
    assert.deepEqual(action, {
      type: 'action' as ActionResponse['type'],
      output: '{"matches":[{"filepath":"example.html","lineNumber":0,"columnNumber":0,"matchLength":7}]}',
      canceled: false,
      code: undefined
    });
  });

  it('calls updateFiles', async () => {
    const responses = await testAgent(
        [
          [{explanation: '', functionCalls: [{name: 'updateFiles', args: {files: ['example.html']}}]}], [{
            explanation: 'done',
          }]
        ],
        [[{
          explanation: 'file updated',
        }]]);

    const action = responses.find(response => response.type === ResponseType.ACTION);
    assert.exists(action);
    assert.deepEqual(
        action,
        {type: 'action' as ActionResponse['type'], output: '{"success":true}', code: undefined, canceled: false});
  });

  it('builds a request with a user tier', async () => {
    updateHostConfig({
      devToolsFreestyler: {
        userTier: 'PUBLIC',
      },
    });
    const {project} = createFileSystemUISourceCode({
      url: Platform.DevToolsPath.urlString`file:///path/to/overrides/example.html`,
      fileSystemPath: Platform.DevToolsPath.urlString`file:///path/to/overrides`,
      mimeType: 'text/html',
      content: 'content',
    });
    const agent = new PatchAgent({
      aidaClient: mockAidaClient(),
      project,
      fileUpdateAgent: new FileUpdateAgent({
        aidaClient: mockAidaClient(),
      })
    });
    assert.strictEqual(
        agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).metadata?.user_tier,
        3,
    );
  });
});
