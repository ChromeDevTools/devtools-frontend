// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {createUISourceCode} from '../../../testing/AiAssistanceHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('FileContext', () => {
  setupSettingsHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  it('should return URL, item, and title correctly', async () => {
    const uiSourceCode = await createUISourceCode({
      url: urlString`https://example.com/script.js`,
      content: 'console.log("hello");',
    });
    const context = new AiAssistance.FileContext.FileContext(uiSourceCode, universe.debuggerWorkspaceBinding);

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
    const context = new AiAssistance.FileContext.FileContext(uiSourceCode, universe.debuggerWorkspaceBinding);

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
    const context = new AiAssistance.FileContext.FileContext(uiSourceCode, universe.debuggerWorkspaceBinding);

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
    const context = new AiAssistance.FileContext.FileContext(uiSourceCode, universe.debuggerWorkspaceBinding);
    const requestContentDataSpy = sinon.spy(uiSourceCode, 'requestContentData');

    await context.refresh();

    sinon.assert.calledOnce(requestContentDataSpy);
  });

  it('should prioritize project securityOrigin over spoofable URL origin if available', async () => {
    const uiSourceCode = await createUISourceCode({
      url: urlString`https://trusted-site.com/spoofed.js`,
      content: 'console.log("spoof");',
    });

    sinon.stub(uiSourceCode.project(), 'securityOrigin')
        .returns(SDK.SecurityOrigin.SecurityOrigin.create('http://attacker.com'));

    const context = new AiAssistance.FileContext.FileContext(uiSourceCode, universe.debuggerWorkspaceBinding);

    const origin = context.getOrigin();
    const siteId = origin instanceof SDK.SecurityOrigin.SecurityOrigin ? origin.siteId() : origin;
    assert.strictEqual(siteId, 'http://attacker.com');
  });

  it('should fall back to URL origin if project securityOrigin is absent', async () => {
    const uiSourceCode = await createUISourceCode({
      url: urlString`https://trusted-site.com/script.js`,
      content: 'console.log("no spoof");',
    });

    // Mock project securityOrigin natively returning null (i.e. regular first-party file bucket)
    sinon.stub(uiSourceCode.project(), 'securityOrigin').returns(null);

    const context = new AiAssistance.FileContext.FileContext(uiSourceCode, universe.debuggerWorkspaceBinding);

    const origin = context.getOrigin();
    const siteId = origin instanceof SDK.SecurityOrigin.SecurityOrigin ? origin.siteId() : origin;
    assert.strictEqual(siteId, 'https://trusted-site.com');
  });
});
