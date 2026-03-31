// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import {
  dispatchClickEvent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import type * as TextEditor from '../../components/text_editor/text_editor.js';

import * as MarkdownView from './markdown_view.js';

describeWithEnvironment('CodeBlock', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('copies the code to clipboard', async () => {
    const component = new MarkdownView.CodeBlock.CodeBlock();
    component.code = 'test';
    component.showCopyButton = true;
    renderElementIntoDOM(component);
    const copyText = sinon
                         .stub(
                             Host.InspectorFrontendHost.InspectorFrontendHostInstance,
                             'copyText',
                             )
                         .returns();
    const button = component.shadowRoot!.querySelector('devtools-button');
    assert.exists(button);
    dispatchClickEvent(button, {
      bubbles: true,
      composed: true,
    });
    sinon.assert.calledWith(copyText, 'test');

    clock.tick(100);
    let buttonContainer = component.shadowRoot!.querySelector('.copy-button-container');
    assert.exists(buttonContainer);
    assert.strictEqual(buttonContainer.textContent?.trim(), 'Copied to clipboard');
    clock.tick(1100);
    buttonContainer = component.shadowRoot!.querySelector('.copy-button-container');
    assert.exists(buttonContainer);
    assert.strictEqual(buttonContainer.textContent?.trim(), '');
  });

  it('renders no legal notice by default', () => {
    const component = new MarkdownView.CodeBlock.CodeBlock();
    component.code = 'test';
    renderElementIntoDOM(component);
    const notice = component.shadowRoot!.querySelector('.notice') as HTMLElement;
    assert.isNull(notice, '.notice was found');
  });

  it('renders legal notice if configured', () => {
    const component = new MarkdownView.CodeBlock.CodeBlock();
    component.code = 'test';
    component.displayNotice = true;
    renderElementIntoDOM(component);
    const notice = component.shadowRoot!.querySelector('.notice') as HTMLElement;
    assert.exists(notice);
    assert.strictEqual(notice.innerText, 'Use code snippets with caution');
  });

  it('renders citations', () => {
    const handler1 = sinon.spy();
    const handler2 = sinon.spy();
    const component = new MarkdownView.CodeBlock.CodeBlock();
    component.code = 'test';
    component.citations = [
      {
        index: 1,
        clickHandler: handler1,
      },
      {
        index: 2,
        clickHandler: handler2,
      },
    ];
    renderElementIntoDOM(component);
    const citations = component.shadowRoot!.querySelectorAll('button.citation');
    assert.lengthOf(citations, 2);
    assert.strictEqual(citations[0].textContent, '[1]');
    assert.strictEqual(citations[1].textContent, '[2]');
    (citations[0] as HTMLElement).click();
    sinon.assert.calledOnce(handler1);
    (citations[1] as HTMLElement).click();
    sinon.assert.calledOnce(handler2);
  });

  it('truncates code if lines exceed displayLimit and shows a button', async () => {
    const component = new MarkdownView.CodeBlock.CodeBlock();
    component.code = 'line1\nline2\nline3\nline4\nline5';
    component.displayLimit = 3;
    renderElementIntoDOM(component);

    await clock.tickAsync(0);
    const textEditor = component.shadowRoot!.querySelector('devtools-text-editor') as TextEditor.TextEditor.TextEditor;
    assert.exists(textEditor);
    // CodeMirror document should still have all lines in the state
    assert.strictEqual(textEditor.state.doc.lines, 5);
    assert.strictEqual(textEditor.state.doc.toString(), 'line1\nline2\nline3\nline4\nline5');

    // But only 3 lines should be visible in the DOM
    assert.lengthOf(textEditor.shadowRoot!.querySelectorAll('.cm-line'), 3);

    const showAllButton = component.shadowRoot!.querySelector('.show-all-container > devtools-button');
    assert.exists(showAllButton);
    assert.strictEqual(showAllButton.textContent?.trim(), 'Show all lines (2 more)');
  });

  it('shows all lines and removes button after clicking "Show all lines"', async () => {
    const component = new MarkdownView.CodeBlock.CodeBlock();
    component.code = 'line1\nline2\nline3\nline4\nline5';
    component.displayLimit = 3;
    renderElementIntoDOM(component);
    await clock.tickAsync(0);

    const showAllButton = component.shadowRoot!.querySelector('.show-all-container > devtools-button') as HTMLElement;
    assert.exists(showAllButton);

    showAllButton.click();

    await clock.tickAsync(0);
    const showAllButtonAfter = component.shadowRoot!.querySelector('.show-all-container > devtools-button');
    assert.isNull(showAllButtonAfter);

    const textEditor = component.shadowRoot!.querySelector('devtools-text-editor') as TextEditor.TextEditor.TextEditor;
    assert.exists(textEditor);
    assert.strictEqual(textEditor.state.doc.lines, 5);

    // All 5 lines should now be visible in the DOM
    assert.lengthOf(textEditor.shadowRoot!.querySelectorAll('.cm-line'), 5);
  });
});
