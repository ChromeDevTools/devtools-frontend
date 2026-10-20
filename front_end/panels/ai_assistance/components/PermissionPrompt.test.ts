// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import * as AIAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import {
  assertScreenshot,
  querySelectorErrorOnMissing,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as AiAssistance from '../ai_assistance.js';

import permissionPromptStyles from './permissionPrompt.css.js';

const {html} = Lit;

describeWithEnvironment('PermissionPrompt', () => {
  function createStep(dialog: Partial<AiAssistance.ChatMessage.ConfirmSideEffectDialog> = {}):
      AiAssistance.ChatMessage.Step {
    return {
      state: {
        type: 'needs_approval',
        sideEffectDialog: {
          description: 'The AI wants to read the cookie "session" on https://example.com.',
          permissionTitle: 'Allow reading cookie values?',
          permissionPrompt: AIAssistanceModel.Tool.PermissionPrompt.ALLOW_ONCE,
          onAnswer: () => {},
          ...dialog,
        },
      },
      title: 'Reading cookie values and metadata',
      code: 'getCookieValues({cookieNames: ["session"]})',
    };
  }

  function renderPrompt(step: AiAssistance.ChatMessage.Step, target = document.createElement('div')): HTMLElement {
    Lit.render(
        html`<style>${permissionPromptStyles}</style>${AiAssistance.PermissionPrompt.renderPermissionPrompt(step)}`,
        target);
    return target;
  }

  function getButtons(target: HTMLElement): HTMLElement[] {
    return Array.from(target.querySelectorAll<HTMLElement>('.permission-prompt devtools-button'));
  }

  it('renders nothing for a step that does not need approval', () => {
    const target = renderPrompt({state: {type: 'completed'}, code: 'getCookieValues()'});
    assert.isNull(target.querySelector('.permission-prompt'));
  });

  it('renders the title, description and code', () => {
    const target = renderPrompt(createStep());

    const prompt = querySelectorErrorOnMissing(target, '.permission-prompt');
    assert.strictEqual(prompt.querySelector('.permission-prompt-title')?.textContent, 'Allow reading cookie values?');
    assert.include(prompt.querySelector('.permission-prompt-description')?.textContent,
                   'The AI wants to read the cookie "session"');

    const codeBlock = querySelectorErrorOnMissing<HTMLElement&{code: string}>(prompt, 'devtools-code-block');
    assert.strictEqual(codeBlock.code, 'getCookieValues({cookieNames: ["session"]})');
    assert.strictEqual(codeBlock.shadowRoot?.querySelector('.heading-text')?.textContent, 'Code to execute');
    assert.include(codeBlock.shadowRoot?.querySelector('.notice')?.textContent, 'Use code snippets with caution');
  });

  it('falls back to a generic title when the tool has none', () => {
    const target = renderPrompt(createStep({permissionTitle: undefined}));
    assert.strictEqual(target.querySelector('.permission-prompt-title')?.textContent, 'Allow this action?');
  });

  it('offers Skip and Allow once for ALLOW_ONCE', () => {
    const onAnswer = sinon.stub();
    const target = renderPrompt(createStep({onAnswer}));

    const buttons = getButtons(target);
    assert.deepEqual(buttons.map(b => b.textContent?.trim()), ['Skip', 'Yes, allow this time']);

    buttons[0].click();
    buttons[1].click();
    assert.deepEqual(onAnswer.args.map(([decision]) => decision), [
      AIAssistanceModel.Tool.PermissionDecision.REJECT,
      AIAssistanceModel.Tool.PermissionDecision.ALLOW_ONCE,
    ]);
  });

  it('offers Skip, Always allow and Allow once for ALLOW_ONCE_OR_ALWAYS', () => {
    const onAnswer = sinon.stub();
    const target = renderPrompt(createStep({
      onAnswer,
      permissionPrompt: AIAssistanceModel.Tool.PermissionPrompt.ALLOW_ONCE_OR_ALWAYS,
    }));

    const buttons = getButtons(target);
    assert.deepEqual(buttons.map(b => b.textContent?.trim()), ['Skip', 'Yes, always allow', 'Yes, allow this time']);

    buttons[1].click();
    sinon.assert.calledOnceWithExactly(onAnswer, AIAssistanceModel.Tool.PermissionDecision.ALLOW_ALWAYS);
  });

  it('renders the data disclaimer', () => {
    const target = renderPrompt(createStep());

    const footer = querySelectorErrorOnMissing(target, '.permission-prompt-footer');
    assert.strictEqual(footer.textContent?.trim(),
                       'Relevant data is sent to Google. Change permissions in settings at any time.');
  });

  it('renders the ALLOW_ONCE prompt', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});
    renderPrompt(createStep(), target);
    await assertScreenshot('ai_assistance/permission_prompt_allow_once.png');
  });

  it('renders the ALLOW_ONCE_OR_ALWAYS prompt', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});
    renderPrompt(createStep({
                   permissionPrompt: AIAssistanceModel.Tool.PermissionPrompt.ALLOW_ONCE_OR_ALWAYS,
                 }),
                 target);
    await assertScreenshot('ai_assistance/permission_prompt_allow_once_or_always.png');
  });
});
