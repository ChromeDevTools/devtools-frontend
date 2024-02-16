// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../../../front_end/core/host/host.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as MarkdownView from '../../../../../front_end/ui/components/markdown_view/markdown_view.js';
import {dispatchClickEvent, renderElementIntoDOM, resetTestDOM} from '../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

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
});
