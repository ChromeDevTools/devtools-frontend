// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import {querySelectorErrorOnMissing, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {deinitializeGlobalVars, initializeGlobalVars} from '../../../testing/EnvironmentHelpers.js';
import type * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as AiAssistance from '../ai_assistance.js';

describe('ExportForAgentsDialog', () => {
  const noop = () => {};
  let dialog: UI.Dialog.Dialog;
  let inspectorFrontendHostStub:
      sinon.SinonStubbedInstance<typeof Host.InspectorFrontendHost.InspectorFrontendHostInstance>;
  let promptText: string;
  let markdownText: string;

  beforeEach(async () => {
    await initializeGlobalVars();
    dialog = new UI.Dialog.Dialog();
    inspectorFrontendHostStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance);
    promptText = 'This is prompt text.';
    markdownText = '# This is markdown text.\n\nWith some content.';
  });

  afterEach(async () => {
    await deinitializeGlobalVars();
  });

  it('renders correctly in initial (prompt) state', async () => {
    const component = new AiAssistance.ExportForAgentsDialog.ExportForAgentsDialog({
      dialog,
      promptText,
      markdownText,
      onConversationSaveAs: noop,
    });
    renderElementIntoDOM(component);
    await component.updateComplete;

    const h2 = component.contentElement.querySelector('h2');
    const promptRadioButton =
        querySelectorErrorOnMissing<HTMLInputElement>(component.contentElement, 'input[value="prompt"]');
    const markdownRadioButton =
        querySelectorErrorOnMissing<HTMLInputElement>(component.contentElement, 'input[value="conversation"]');
    const textarea = querySelectorErrorOnMissing<HTMLTextAreaElement>(component.contentElement, 'textarea');
    const primaryButton = querySelectorErrorOnMissing(component.contentElement, 'devtools-button');

    assert.strictEqual(h2?.textContent?.trim(), 'Copy to coding agent');
    assert.isTrue(promptRadioButton?.checked);
    assert.isFalse(markdownRadioButton?.checked);
    assert.strictEqual(textarea?.value, promptText);
    assert.strictEqual(primaryButton?.textContent?.trim(), 'Copy to clipboard');
  });

  it('renders loading state when promptText is a Promise and updates when it is loaded', async () => {
    let resolvePrompt: (value: string) => void = () => {};
    const promptTextPromise = new Promise<string>(resolve => {
      resolvePrompt = resolve;
    });

    const component = new AiAssistance.ExportForAgentsDialog.ExportForAgentsDialog({
      dialog,
      promptText: promptTextPromise,
      markdownText,
      onConversationSaveAs: noop,
    });
    renderElementIntoDOM(component);
    await component.updateComplete;

    const spinner = component.contentElement.querySelector('devtools-spinner');
    assert.isNotNull(spinner);

    const loadingText = component.contentElement.querySelector('.prompt-loading');
    assert.isNotNull(loadingText);
    assert.include(loadingText?.textContent?.trim(), 'Generating summary…');

    const textarea = querySelectorErrorOnMissing<HTMLTextAreaElement>(component.contentElement, 'textarea');
    assert.strictEqual(textarea.value, '');

    const primaryButton =
        querySelectorErrorOnMissing<Buttons.Button.Button>(component.contentElement, 'devtools-button');
    assert.isTrue(primaryButton.disabled);
    assert.strictEqual(primaryButton.textContent?.trim(), 'Copy to clipboard');

    // Resolve at the end to satisfy the test runner's pending promise
    // check.
    resolvePrompt('Done');
    await promptTextPromise;
    await component.updateComplete;

    assert.isNull(component.contentElement.querySelector('devtools-spinner'));
    assert.strictEqual(textarea.value, 'Done');
  });

  it('enables the "Save as..." button for Markdown when the summary prompt is generating', async () => {
    let resolvePrompt: (value: string) => void = () => {};
    const promptTextPromise = new Promise<string>(resolve => {
      resolvePrompt = resolve;
    });
    const component = new AiAssistance.ExportForAgentsDialog.ExportForAgentsDialog({
      dialog,
      promptText: promptTextPromise,
      markdownText,
      onConversationSaveAs: noop,
    });
    renderElementIntoDOM(component);
    await component.updateComplete;

    const markdownRadioButton =
        querySelectorErrorOnMissing<HTMLInputElement>(component.contentElement, 'input[value="conversation"]');
    markdownRadioButton.click();
    await component.updateComplete;

    const primaryButton =
        querySelectorErrorOnMissing<Buttons.Button.Button>(component.contentElement, 'devtools-button');
    assert.isFalse(primaryButton.disabled);
    assert.strictEqual(primaryButton.textContent?.trim(), 'Save as…');

    // Resolve at the end to satisfy the test runner's pending promise check.
    resolvePrompt('Done');
    await promptTextPromise;
    await component.updateComplete;
  });

  it('switches to markdown state on radio button click', async () => {
    const component = new AiAssistance.ExportForAgentsDialog.ExportForAgentsDialog({
      dialog,
      promptText,
      markdownText,
      onConversationSaveAs: noop,
    });
    renderElementIntoDOM(component);
    await component.updateComplete;

    const markdownRadioButton =
        querySelectorErrorOnMissing<HTMLInputElement>(component.contentElement, 'input[value="conversation"]');
    const textarea = querySelectorErrorOnMissing<HTMLTextAreaElement>(component.contentElement, 'textarea');
    const primaryButton =
        querySelectorErrorOnMissing<Buttons.Button.Button>(component.contentElement, 'devtools-button');

    assert.isNotNull(markdownRadioButton);
    markdownRadioButton?.click();
    await component.updateComplete;

    assert.isTrue(markdownRadioButton?.checked);
    assert.strictEqual(textarea?.value, markdownText);
    assert.strictEqual(primaryButton?.textContent?.trim(), 'Save as…');
    assert.strictEqual(primaryButton.jslogContext, 'ai-export-for-agents.save-as-markdown');
  });

  it('copies prompt text to clipboard when in prompt state', async () => {
    const hideStub = sinon.stub(dialog, 'hide');
    const component = new AiAssistance.ExportForAgentsDialog.ExportForAgentsDialog({
      dialog,
      promptText,
      markdownText,
      onConversationSaveAs: noop,
    });
    renderElementIntoDOM(component);
    await component.updateComplete;

    const primaryButton = component.contentElement?.querySelector<Buttons.Button.Button>('devtools-button');
    assert.isNotNull(primaryButton);
    assert.strictEqual(primaryButton?.jslogContext, 'ai-export-for-agents.copy-to-clipboard');
    primaryButton?.click();
    await component.updateComplete;

    sinon.assert.calledWith(inspectorFrontendHostStub.copyText, promptText);
    sinon.assert.calledOnce(hideStub);
  });

  it('calls onConversationSaveAs when the save as button is clicked in markdown mode', async () => {
    const hideStub = sinon.stub(dialog, 'hide');
    const onConversationSaveAs = sinon.stub();
    const component = new AiAssistance.ExportForAgentsDialog.ExportForAgentsDialog({
      dialog,
      promptText,
      markdownText,
      onConversationSaveAs,
    });
    renderElementIntoDOM(component);
    await component.updateComplete;

    const markdownRadioButton =
        querySelectorErrorOnMissing<HTMLInputElement>(component.contentElement, 'input[value="conversation"]');
    markdownRadioButton.click();
    await component.updateComplete;

    const primaryButton = component.contentElement.querySelector<Buttons.Button.Button>('devtools-button');
    assert.isNotNull(primaryButton);
    assert.strictEqual(primaryButton?.jslogContext, 'ai-export-for-agents.save-as-markdown');
    primaryButton.click();
    await component.updateComplete;

    sinon.assert.calledOnce(onConversationSaveAs);
    sinon.assert.calledOnce(hideStub);
  });
});
