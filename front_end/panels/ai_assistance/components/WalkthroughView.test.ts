// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
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

  it('calls scrollIntoView on the last step when it is loading', async () => {
    const message: AiAssistance.ChatMessage.ModelChatMessage = {
      entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
      parts: [
        {
          type: 'step',
          step: {
            isLoading: false,
            title: 'Step 1',
            widgets: [
              {
                name: 'CORE_VITALS',
              } as unknown as AiAssistanceModel.AiAgent.AiWidget,
            ]
          }
        },
        {type: 'step', step: {isLoading: false, title: 'Step 2', widgets: []}}
      ],
    };

    const view = new WalkthroughView();
    renderElementIntoDOM(view);
    view.markdownRenderer = new AiAssistance.MarkdownRendererWithCodeBlock();
    view.isLoading = true;

    const scrollIntoViewSpy = sinon.spy(HTMLElement.prototype, 'scrollIntoView');

    view.message = message;
    view.performUpdate();
    await view.updateComplete;

    // We need to wait for the requestAnimationFrame in scrollToBottom
    await new Promise(resolve => window.requestAnimationFrame(resolve));

    const steps = view.contentElement.querySelectorAll('.walkthrough-step');
    const lastStep = steps[steps.length - 1] as HTMLElement;

    // Verify it was called with the right options
    sinon.assert.calledWithMatch(scrollIntoViewSpy, {behavior: 'smooth', block: 'end'});
    // Verify it was called on the last element
    sinon.assert.calledOn(scrollIntoViewSpy, lastStep);

    scrollIntoViewSpy.restore();
  });

  it('does not call scrollIntoView on the last step when it is not loading', async () => {
    const message: AiAssistance.ChatMessage.ModelChatMessage = {
      entity: AiAssistance.ChatMessage.ChatMessageEntity.MODEL,
      parts: [
        {type: 'step', step: {isLoading: false, title: 'Step 1', widgets: []}},
      ],
    };

    const view = new WalkthroughView();
    renderElementIntoDOM(view);
    view.markdownRenderer = new AiAssistance.MarkdownRendererWithCodeBlock();
    view.isLoading = false;

    const scrollIntoViewSpy = sinon.spy(HTMLElement.prototype, 'scrollIntoView');

    view.message = message;
    view.performUpdate();
    await view.updateComplete;

    // We need to wait for the requestAnimationFrame in scrollToBottom
    await new Promise(resolve => window.requestAnimationFrame(resolve));

    // Verify it was NOT called
    sinon.assert.notCalled(scrollIntoViewSpy);

    scrollIntoViewSpy.restore();
  });

  describe('walkthrough titles', () => {
    it('returns the correct walkthrough title when not loading', () => {
      const lastStep = {isLoading: false, title: 'Step 1'};
      assert.strictEqual(
          AiAssistance.WalkthroughView.walkthroughTitle({
            isLoading: false,
            hasWidgets: false,
            lastStep,
          }),
          'Show thinking');

      assert.strictEqual(
          AiAssistance.WalkthroughView.walkthroughTitle({
            isLoading: false,
            hasWidgets: true,
            lastStep,
          }),
          'Show agent walkthrough');
    });

    it('returns the step title when loading', () => {
      const lastStep = {isLoading: true, title: 'Investigating...'};
      assert.strictEqual(
          AiAssistance.WalkthroughView.walkthroughTitle({
            isLoading: true,
            hasWidgets: false,
            lastStep,
          }),
          'Investigating...');
    });

    it('returns the correct walkthrough close title', () => {
      assert.strictEqual(
          AiAssistance.WalkthroughView.walkthroughCloseTitle({
            hasWidgets: false,
          }),
          'Hide thinking');

      assert.strictEqual(
          AiAssistance.WalkthroughView.walkthroughCloseTitle({
            hasWidgets: true,
          }),
          'Hide agent walkthrough');

      assert.strictEqual(
          AiAssistance.WalkthroughView.walkthroughCloseTitle({
            hasWidgets: false,
            isInlined: true,
          }),
          'Agent walkthrough');

      assert.strictEqual(
          AiAssistance.WalkthroughView.walkthroughCloseTitle({
            hasWidgets: true,
            isInlined: true,
          }),
          'Agent walkthrough');
    });
  });
});
