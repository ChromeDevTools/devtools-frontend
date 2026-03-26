// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Application from './application.js';

const {DEFAULT_VIEW, WebMCPView} = Application.WebMCPView;
type WebMCPView = Application.WebMCPView.WebMCPView;

describeWithEnvironment('WebMCPView (View)', () => {
  it('renders empty when no tools are available', async () => {
    const target = document.createElement('div');
    target.style.width = '600px';
    target.style.height = '400px';
    renderElementIntoDOM(target);
    DEFAULT_VIEW(
        {
          tools: [],
        },
        {}, target);

    const listElements = target.querySelectorAll('.tool-item');
    assert.lengthOf(listElements, 0);

    const emptyStateHeader = target.querySelector('.tool-list .empty-state-header');
    assert.isNotNull(emptyStateHeader);
    assert.strictEqual(emptyStateHeader?.textContent, 'Available WebMCP Tools');

    const callListElements = target.querySelectorAll('.call-item');
    assert.lengthOf(callListElements, 0);

    const callListEmptyHeader = target.querySelector('.call-log .empty-state-header');
    assert.isNotNull(callListEmptyHeader);
    assert.strictEqual(callListEmptyHeader?.textContent, 'Tool Activity');

    await assertScreenshot('application/webmcp-empty.png');
  });

  it('renders a list of tools correctly (screenshot)', async () => {
    const container = document.createElement('div');
    container.style.width = '600px';
    container.style.height = '400px';
    renderElementIntoDOM(container);

    DEFAULT_VIEW(
        {
          tools: [
            {
              name: 'calculator',
              description: 'Calculates math expressions',
              frameId: 'frame1' as Protocol.Page.FrameId
            },
            {name: 'weather', description: 'Gets the current weather', frameId: 'frame1' as Protocol.Page.FrameId}
          ],
        },
        {}, container);

    await raf();
    await assertScreenshot('application/webmcp_view.png');
  });

  it('renders a list of tools', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    DEFAULT_VIEW(
        {
          tools: [
            {name: 'tool1', description: 'desc1', frameId: 'frame1' as Protocol.Page.FrameId},
            {name: 'tool2', description: 'desc2', frameId: 'frame1' as Protocol.Page.FrameId}
          ],
        },
        {}, target);

    await raf();
    const listElements = target.querySelectorAll('.tool-item');
    assert.lengthOf(listElements, 2);
    assert.strictEqual(listElements[0].querySelector('.tool-name')?.textContent, 'tool1');
    assert.strictEqual(listElements[0].querySelector('.tool-description')?.textContent, 'desc1');
    assert.isNull(target.querySelector('.tool-list .empty-state'));
  });
});

describeWithEnvironment('WebMCPView Presenter', () => {
  let target: SDK.Target.Target;

  async function setup() {
    updateHostConfig({devToolsWebMCPSupport: {enabled: true}});
    target = createTarget();
    const model = target.model(SDK.WebMCPModel.WebMCPModel) as SDK.WebMCPModel.WebMCPModel;

    const viewStub = createViewFunctionStub(WebMCPView);
    new WebMCPView(document.createElement('div'), viewStub);
    await viewStub.nextInput;

    return {model, viewStub};
  }

  afterEach(() => {
    target?.dispose('test');
  });

  it('passes tools to the view sorted by name', async () => {
    const {model, viewStub} = await setup();
    model.onToolsAdded([
      {name: 'b-tool', description: 'desc1', frameId: 'frame1' as Protocol.Page.FrameId},
      {name: 'a-tool', description: 'desc2', frameId: 'frame1' as Protocol.Page.FrameId}
    ]);
    const input = await viewStub.nextInput;

    assert.lengthOf(input.tools, 2);
    assert.strictEqual(input.tools[0].name, 'a-tool');
    assert.strictEqual(input.tools[1].name, 'b-tool');
  });

  it('updates when tools are removed', async () => {
    const {model, viewStub} = await setup();
    const tool = {name: 'tool1', description: 'desc1', frameId: 'frame1' as Protocol.Page.FrameId};
    model.onToolsAdded([tool]);
    await viewStub.nextInput;
    assert.lengthOf(viewStub.input.tools, 1);

    model.onToolsRemoved([tool]);
    const input = await viewStub.nextInput;
    assert.lengthOf(input.tools, 0);
  });
});
