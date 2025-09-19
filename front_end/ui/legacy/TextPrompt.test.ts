// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import * as Lit from '../lit/lit.js';

import * as UI from './legacy.js';

const {html} = Lit;

describeWithLocale('TextPromptElement', () => {
  let container: HTMLDivElement;
  beforeEach(() => {
    container = document.createElement('div');
    renderElementIntoDOM(container);
  });

  function renderPrompt(template: Lit.LitTemplate): UI.TextPrompt.TextPromptElement {
    Lit.render(template, container);
    const element = container.querySelector('devtools-prompt');
    assert.exists(element);
    return element;
  }

  it('renders its contents', async () => {
    const prompt = renderPrompt(html`<devtools-prompt>Initial content</devtools-prompt>`);
    assert.strictEqual(prompt.innerText, 'Initial content');
  });

  it('turns into a text input when starting to edit', async () => {
    const prompt = renderPrompt(html`<devtools-prompt>Initial content</devtools-prompt>`);
    prompt.setAttribute('editing', 'true');

    assert.strictEqual(prompt.innerText, '');
    assert.strictEqual(prompt.deepInnerText(), 'Initial content');

    const placeholder = prompt.shadowRoot?.querySelector('[contenteditable]');
    assert.exists(placeholder);
    assert.strictEqual(placeholder.textContent, 'Initial content');
    assert.strictEqual(window.getSelection()?.toString(), 'Initial content');
  });

  it('sends commit events', () => {
    const prompt = renderPrompt(html`<devtools-prompt>Initial content</devtools-prompt>`);
    prompt.setAttribute('editing', 'true');

    const listener = sinon.stub<[Event]>();
    prompt.addEventListener('commit', listener);

    const placeholder = prompt.shadowRoot?.querySelector('[contenteditable]');
    assert.exists(placeholder);
    placeholder.textContent = 'New content';
    placeholder.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    sinon.assert.calledOnce(listener);
    assert.instanceOf(listener.args[0][0], UI.TextPrompt.TextPromptElement.CommitEvent);
    assert.strictEqual(listener.args[0][0].detail, 'New content');
  });

  it('sends cancel events', () => {
    const prompt = renderPrompt(html`<devtools-prompt>Initial content</devtools-prompt>`);
    prompt.setAttribute('editing', 'true');

    const listener = sinon.stub<[Event]>();
    prompt.addEventListener('cancel', listener);

    const placeholder = prompt.shadowRoot?.querySelector('[contenteditable]');
    assert.exists(placeholder);
    placeholder.textContent = 'New content';
    placeholder.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    sinon.assert.calledOnce(listener);
  });

  it('enters editing mode when connected to the DOM', () => {
    const prompt = document.createElement('devtools-prompt') as UI.TextPrompt.TextPromptElement;
    prompt.textContent = 'Initial content';
    prompt.setAttribute('editing', 'true');

    container.appendChild(prompt);

    const placeholder = prompt.shadowRoot?.querySelector('[contenteditable]');
    assert.exists(placeholder);
    assert.strictEqual(placeholder.textContent, 'Initial content');
  });

  function stubSuggestBox() {
    const {resolve, promise} = Promise.withResolvers<UI.SuggestBox.Suggestion[]>();
    const suggestBoxStub = sinon.stub(UI.SuggestBox.SuggestBox.prototype, 'updateSuggestions');
    suggestBoxStub.callsFake((_, suggestions) => {
      suggestBoxStub.restore();
      resolve(suggestions);
    });
    return promise;
  }

  it('shows completions', async () => {
    const prompt = renderPrompt(html`
      <devtools-prompt completions=completion-id></devtools-prompt>
      <datalist id=completion-id>
        <option>suggestion</option>
        <option>another</option>
      </datalist>`);
    const suggestBoxPromise = stubSuggestBox();
    prompt.setAttribute('editing', '');

    const suggestions = await suggestBoxPromise;
    assert.deepEqual(suggestions, [{text: 'suggestion'}, {text: 'another'}]);
  });

  it('allows attaching a completions datalist just-in-time', async () => {
    // Initial render
    renderPrompt(html`
      <devtools-prompt></devtools-prompt>
      <datalist id=completion-id>
        <option>suggestion</option>
        <option>another</option>
      </datalist>`);

    // Event handler to attch the completions datalist by setting the completions attribute
    const setCompletions = () => renderPrompt(html`
        <devtools-prompt
          editing
          completions=completion-id
          ></devtools-prompt>
        <datalist id=completion-id>
          <option>suggestion</option>
          <option>another</option>
        </datalist>`);

    const suggestBoxStub = stubSuggestBox();
    // Start editing to trigger the suggest box
    renderPrompt(html`
        <devtools-prompt
          editing
          @beforeautocomplete=${setCompletions}
          ></devtools-prompt>
        ></devtools-prompt>
        <datalist id=completion-id>
          <option>suggestion</option>
          <option>another</option>
        </datalist>`);
    const suggestions = await suggestBoxStub;
    assert.deepEqual(suggestions, [{text: 'suggestion'}, {text: 'another'}]);
  });

  it('allows updating completions content just-in-time', async () => {
    // Initial render
    renderPrompt(html`
      <devtools-prompt></devtools-prompt>
      <datalist id=completion-id>
        <option>suggestion</option>
        <option>another</option>
      </datalist>`);

    // Event handler to update the contents of the completions datalist
    const setCompletions = () => renderPrompt(html`
        <devtools-prompt
          editing
          completions=completion-id
          ></devtools-prompt>
      <datalist id=completion-id>
        <option>modified and removed</option>
      </datalist>`);

    const suggestBoxStub = stubSuggestBox();
    // Start editing to trigger the suggest box
    renderPrompt(html`
        <devtools-prompt
          editing
          completions=completion-id
          @beforeautocomplete=${setCompletions}
          ></devtools-prompt>
        ></devtools-prompt>
        <datalist id=completion-id>
          <option>suggestion</option>
          <option>another</option>
        </datalist>`);
    const suggestions = await suggestBoxStub;
    assert.deepEqual(suggestions, [{text: 'modified and removed'}]);
  });
});
