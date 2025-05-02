// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import {
  dispatchClickEvent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';

import * as MarkdownView from './markdown_view.js';

describeWithEnvironment('CodeBlock', () => {
  it('copies the code to clipboard', async () => {
    const component = new MarkdownView.CodeBlock.CodeBlock();
    component.code = 'test';
    component.showCopyButton = true;
    renderElementIntoDOM(component);
    const clock = sinon.useFakeTimers();
    try {
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
    } finally {
      clock.restore();
    }
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
});
