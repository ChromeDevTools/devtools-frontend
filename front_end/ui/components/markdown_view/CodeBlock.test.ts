// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import {assertNotNullOrUndefined} from '../../../core/platform/platform.js';
import {
  dispatchClickEvent,
  renderElementIntoDOM,
  resetTestDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';

import * as MarkdownView from './markdown_view.js';

const {assert} = chai;

describeWithEnvironment('CodeBlock', () => {
  it('copies the code to clipboard', () => {
    const component = new MarkdownView.CodeBlock.CodeBlock();
    component.code = 'test';
    renderElementIntoDOM(component);
    const button = component.shadowRoot!.querySelector('.copy-button');
    assertNotNullOrUndefined(button);
    const clock = sinon.useFakeTimers();
    try {
      assert.strictEqual(button.querySelector('span')?.innerText, 'Copy code');
      const copyText = sinon
                           .stub(
                               Host.InspectorFrontendHost.InspectorFrontendHostInstance,
                               'copyText',
                               )
                           .returns();
      dispatchClickEvent(button, {
        bubbles: true,
        composed: true,
      });
      assert.isTrue(copyText.calledWith('test'));
      clock.tick(100);
      assert.strictEqual(button.querySelector('span')!.innerText, 'Copied to clipboard');
      clock.tick(1100);
      assert.strictEqual(button.querySelector('span')!.innerText, 'Copy code');
    } finally {
      clock.restore();
      resetTestDOM();
    }
  });

  it('renders no legal notice by default', () => {
    try {
      const component = new MarkdownView.CodeBlock.CodeBlock();
      component.code = 'test';
      renderElementIntoDOM(component);
      const notice = component.shadowRoot!.querySelector('.notice') as HTMLElement;
      assert(notice === null, '.notice was found');
    } finally {
      resetTestDOM();
    }
  });

  it('renders legal notice if configured', () => {
    try {
      const component = new MarkdownView.CodeBlock.CodeBlock();
      component.code = 'test';
      component.displayNotice = true;
      renderElementIntoDOM(component);
      const notice = component.shadowRoot!.querySelector('.notice') as HTMLElement;
      assertNotNullOrUndefined(notice);
      assert.strictEqual(notice!.innerText, 'Use code snippets with caution');
    } finally {
      resetTestDOM();
    }
  });
});
