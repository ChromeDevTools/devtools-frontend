// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import {querySelectorErrorOnMissing, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {deinitializeGlobalVars, initializeGlobalVars} from '../../../testing/EnvironmentHelpers.js';
import type * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Snackbars from '../../../ui/components/snackbars/snackbars.js';
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
    AiAssistance.ExportForAgentsDialog.ExportForAgentsDialog.clearPersistedViewState();
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

    const h1 = querySelectorErrorOnMissing(component.contentElement, 'h1');
    const stateSelection = querySelectorErrorOnMissing(component.contentElement, '.state-selection');
    const promptRadioButton =
        querySelectorErrorOnMissing<HTMLInputElement>(component.contentElement, 'input[value="prompt"]');
    const markdownRadioButton =
        querySelectorErrorOnMissing<HTMLInputElement>(component.contentElement, 'input[value="conversation"]');
    const textarea = querySelectorErrorOnMissing<HTMLTextAreaElement>(component.contentElement, 'textarea');
    const primaryButton = querySelectorErrorOnMissing(component.contentElement, 'devtools-button');

    assert.strictEqual(h1.textContent?.trim(), 'Copy to coding agent');
    assert.strictEqual(h1.getAttribute('id'), 'export-for-agents-dialog-title');
    assert.strictEqual(stateSelection.getAttribute('role'), 'radiogroup');
    assert.strictEqual(stateSelection.getAttribute('aria-labelledby'), 'export-for-agents-dialog-title');
    assert.isTrue(promptRadioButton.checked);
    assert.isFalse(markdownRadioButton.checked);
    assert.strictEqual(promptRadioButton.getAttribute('aria-label'), 'As prompt');
    assert.strictEqual(markdownRadioButton.getAttribute('aria-label'), 'As markdown');
    assert.strictEqual(textarea.value, promptText);
    assert.isTrue(textarea.classList.contains('prompt'));
    assert.strictEqual(primaryButton.textContent?.trim(), 'Copy to clipboard');
    assert.strictEqual(primaryButton?.getAttribute('accessibleLabel'), 'Copy to clipboard');
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

  it('hides the loading spinner and shows markdown text when switching to markdown view while prompt is loading',
     async () => {
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

       // Verify initial state: spinner is present, textarea is empty.
       assert.isNotNull(
           component.contentElement.querySelector('devtools-spinner'),
           'Spinner should be present in prompt view while loading');
       const textarea = querySelectorErrorOnMissing<HTMLTextAreaElement>(component.contentElement, 'textarea');
       assert.strictEqual(textarea.value, '', 'Textarea should be empty in prompt view while loading');

       // Switch to markdown view.
       const markdownRadioButton =
           querySelectorErrorOnMissing<HTMLInputElement>(component.contentElement, 'input[value="conversation"]');
       markdownRadioButton.click();
       await component.updateComplete;

       // spinner should be hidden, textarea should show markdown text.
       assert.isNull(
           component.contentElement.querySelector('devtools-spinner'), 'Spinner should be hidden in markdown view');

       const textareaAfterSwitch =
           querySelectorErrorOnMissing<HTMLTextAreaElement>(component.contentElement, 'textarea');
       assert.strictEqual(
           textareaAfterSwitch.value, markdownText,
           'Textarea should show markdown text in markdown view even if prompt is still loading');

       // Clean up.
       resolvePrompt('Done');
       await promptTextPromise;
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
    assert.strictEqual(primaryButton.getAttribute('accessibleLabel'), 'Save as…');

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
    const primaryButton =
        querySelectorErrorOnMissing<Buttons.Button.Button>(component.contentElement, 'devtools-button');

    assert.isNotNull(markdownRadioButton);
    markdownRadioButton?.click();
    await component.updateComplete;

    assert.isTrue(markdownRadioButton?.checked);
    const textareaAfterSwitch = querySelectorErrorOnMissing<HTMLTextAreaElement>(component.contentElement, 'textarea');
    assert.strictEqual(textareaAfterSwitch.value, markdownText);
    assert.isTrue(textareaAfterSwitch.classList.contains('conversation'));
    assert.strictEqual(primaryButton?.textContent?.trim(), 'Save as…');
    assert.strictEqual(primaryButton.getAttribute('accessibleLabel'), 'Save as…');
    assert.strictEqual(primaryButton.jslogContext, 'ai-export-for-agents.save-as-markdown');
  });

  it('copies prompt text to clipboard when in prompt state', async () => {
    const hideStub = sinon.stub(dialog, 'hide');
    const snackbarStub = sinon.stub(Snackbars.Snackbar.Snackbar, 'show');
    const mockSnackbar = document.createElement('div');
    const setAttributeSpy = sinon.spy(mockSnackbar, 'setAttribute');
    snackbarStub.returns(mockSnackbar as unknown as Snackbars.Snackbar.Snackbar);

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
    sinon.assert.calledOnce(snackbarStub);
    sinon.assert.calledWith(setAttributeSpy, 'aria-label', 'Copied to clipboard');
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

  it('persists the selected state across dialog loads', async () => {
    const component1 = new AiAssistance.ExportForAgentsDialog.ExportForAgentsDialog({
      dialog,
      promptText,
      markdownText,
      onConversationSaveAs: noop,
    });
    renderElementIntoDOM(component1);
    await component1.updateComplete;

    const markdownRadioButton =
        querySelectorErrorOnMissing<HTMLInputElement>(component1.contentElement, 'input[value="conversation"]');
    markdownRadioButton.click();
    await component1.updateComplete;

    assert.isTrue(markdownRadioButton.checked);
    component1.detach();

    const component2 = new AiAssistance.ExportForAgentsDialog.ExportForAgentsDialog({
      dialog,
      promptText,
      markdownText,
      onConversationSaveAs: noop,
    });
    renderElementIntoDOM(component2);
    await component2.updateComplete;

    const markdownRadioButton2 =
        querySelectorErrorOnMissing<HTMLInputElement>(component2.contentElement, 'input[value="conversation"]');
    const promptRadioButton2 =
        querySelectorErrorOnMissing<HTMLInputElement>(component2.contentElement, 'input[value="prompt"]');

    assert.isTrue(markdownRadioButton2.checked);
    assert.isFalse(promptRadioButton2.checked);
  });

  it('resets scroll position of textarea when switching tabs', async () => {
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
    const promptRadioButton =
        querySelectorErrorOnMissing<HTMLInputElement>(component.contentElement, 'input[value="prompt"]');

    const textarea1 = querySelectorErrorOnMissing<HTMLTextAreaElement>(component.contentElement, 'textarea');
    textarea1.scrollTop = 100;

    markdownRadioButton.click();
    await component.updateComplete;

    const textarea2 = querySelectorErrorOnMissing<HTMLTextAreaElement>(component.contentElement, 'textarea');
    assert.notStrictEqual(textarea1, textarea2, 'Textarea should be recreated on tab switch');
    assert.strictEqual(textarea2.scrollTop, 0, 'Scroll position should be reset');

    textarea2.scrollTop = 50;
    promptRadioButton.click();
    await component.updateComplete;

    const textarea3 = querySelectorErrorOnMissing<HTMLTextAreaElement>(component.contentElement, 'textarea');
    assert.notStrictEqual(textarea2, textarea3, 'Textarea should be recreated on tab switch back');
    assert.strictEqual(textarea3.scrollTop, 0, 'Scroll position should be reset');
  });
});
