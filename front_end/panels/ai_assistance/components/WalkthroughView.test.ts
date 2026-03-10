// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {querySelectorErrorOnMissing, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('WalkthroughView', () => {
  const {WalkthroughView} = AiAssistance.WalkthroughView;

  async function makeWalkthrough(state: {
    isLoading: boolean,
    message: AiAssistance.ChatMessage.ModelChatMessage|null,
    isInlined: boolean,
    isExpanded: boolean,
  }): Promise<AiAssistance.WalkthroughView.WalkthroughView> {
    const view = new WalkthroughView();
    view.isLoading = state.isLoading;
    view.message = state.message;
    view.isInlined = state.isInlined;
    view.isExpanded = state.isExpanded;
    view.markdownRenderer = new AiAssistance.MarkdownRendererWithCodeBlock();

    renderElementIntoDOM(view);
    view.performUpdate();
    await view.updateComplete;
    return view;
  }

  it('renders empty state when there is no messsage', async () => {
    const view = await makeWalkthrough({
      isLoading: false,
      message: null,
      isInlined: false,
      isExpanded: false,
    });

    const emptyState = view.contentElement.querySelector('.empty-state');
    assert.isNotNull(emptyState);
    assert.include(emptyState?.textContent, 'No walkthrough steps available yet.');
  });

  it('renders empty state when there is a message but it has no steps', async () => {
    const emptyMessage: AiAssistance.ChatMessage.ModelChatMessage = {
      entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
      parts: [],
    };
    const view = await makeWalkthrough({
      isLoading: false,
      message: emptyMessage,
      isInlined: false,
      isExpanded: false,
    });

    const emptyState = view.contentElement.querySelector('.empty-state');
    assert.isNotNull(emptyState);
    assert.include(emptyState?.textContent, 'No walkthrough steps available yet.');
  });

  it('can render a step correctly when expanded', async () => {
    const message: AiAssistance.ChatMessage.ModelChatMessage = {
      entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
      parts: [{
        type: 'step',
        step: {
          isLoading: false,
          title: 'Test step 1',
        }
      }],
    };
    const view = await makeWalkthrough({
      isLoading: false,
      message,
      isInlined: false,
      isExpanded: true,
    });

    const stepsWrapper = querySelectorErrorOnMissing(view.contentElement, '.step-wrapper');
    assert.lengthOf(stepsWrapper.children, 1);
    const stepTitle = querySelectorErrorOnMissing(stepsWrapper, '.title');
    assert.strictEqual(stepTitle.innerText, 'Test step 1');
  });

  it('renders the details/summary in inline mode', async () => {
    const message: AiAssistance.ChatMessage.ModelChatMessage = {
      entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
      parts: [{
        type: 'step',
        step: {
          isLoading: false,
          title: 'Test step 1',
        }
      }],
    };
    const view = await makeWalkthrough({
      isLoading: false,
      message,
      isInlined: true,
      isExpanded: true,
    });

    const inlineWalkthrough = querySelectorErrorOnMissing(view.contentElement, '.walkthrough-inline');
    assert.isTrue(inlineWalkthrough.hasAttribute('open'));

    view.isExpanded = false;
    await view.updateComplete;
    assert.isFalse(inlineWalkthrough.hasAttribute('open'));
  });

  it('renders the titlebar in sidebar mode', async () => {
    const message: AiAssistance.ChatMessage.ModelChatMessage = {
      entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
      parts: [{
        type: 'step',
        step: {
          isLoading: false,
          title: 'Test step 1',
        }
      }],
    };
    const view = await makeWalkthrough({
      isLoading: false,
      message,
      isInlined: false,
      isExpanded: true,
    });

    const title = querySelectorErrorOnMissing(view.contentElement, '.walkthrough-title');
    assert.strictEqual(title.innerText, 'Agent walkthrough');
  });
});
