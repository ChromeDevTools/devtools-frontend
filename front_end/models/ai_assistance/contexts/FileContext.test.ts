// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {createUISourceCode} from '../../../testing/AiAssistanceHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Bindings from '../../bindings/bindings.js';
import * as Workspace from '../../workspace/workspace.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('FileContext', () => {
  beforeEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
      workspace,
    });
  });

  it('should return URL, item, and title correctly', async () => {
    const uiSourceCode = await createUISourceCode({
      url: urlString`https://example.com/script.js`,
      content: 'console.log("hello");',
    });
    const context = new AiAssistance.FileContext.FileContext(uiSourceCode);

    assert.strictEqual(context.getURL(), 'https://example.com/script.js');
    assert.strictEqual(context.getItem(), uiSourceCode);
    assert.strictEqual(context.getTitle(), 'script.js');
  });

  it('should return prompt details correctly', async () => {
    const uiSourceCode = await createUISourceCode({
      url: urlString`https://example.com/script.js`,
      content: 'console.log("hello");',
      requestContentData: true,
    });
    const context = new AiAssistance.FileContext.FileContext(uiSourceCode);

    const promptDetails = await context.getPromptDetails();
    assert.strictEqual(promptDetails, `# Selected file
File name: script.js
URL: https://example.com/script.js
File content:
\`\`\`
console.log("hello");
\`\`\``);
  });

  it('should return user facing details correctly', async () => {
    const uiSourceCode = await createUISourceCode({
      url: urlString`https://example.com/script.js`,
      content: 'console.log("hello");',
      requestContentData: true,
    });
    const context = new AiAssistance.FileContext.FileContext(uiSourceCode);

    const details = await context.getUserFacingDetails();
    assert.deepEqual(details, [
      {
        title: 'Selected file',
        text: `File name: script.js
URL: https://example.com/script.js
File content:
\`\`\`
console.log("hello");
\`\`\``,
      },
    ]);
  });

  it('should request content data on refresh', async () => {
    const uiSourceCode = await createUISourceCode({
      url: urlString`https://example.com/script.js`,
      content: 'console.log("hello");',
    });
    const context = new AiAssistance.FileContext.FileContext(uiSourceCode);
    const requestContentDataSpy = sinon.spy(uiSourceCode, 'requestContentData');

    await context.refresh();

    sinon.assert.calledOnce(requestContentDataSpy);
  });
});
