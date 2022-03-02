// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ChromeLink from '../../../../../front_end/ui/components/chrome_link/chrome_link.js';
import * as Coordinator from '../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as LitHtml from '../../../../../front_end/ui/lit-html/lit-html.js';
import {assertElement, assertShadowRoot, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

describeWithMockConnection('ChromeLink', () => {
  it('renders a link when given a \'chrome://\' URL', async () => {
    const target = createTarget();
    const spy = sinon.spy(target.targetAgent(), 'invoke_createTarget');

    const container = document.createElement('div');
    // clang-format off
    LitHtml.render(
      LitHtml.html`
        <${ChromeLink.ChromeLink.ChromeLink.litTagName} .href=${'chrome://settings'}>
          link text
        </${ChromeLink.ChromeLink.ChromeLink.litTagName}>
      `,
      container,
    );
    // clang-format on
    renderElementIntoDOM(container);
    await coordinator.done();

    const chromeLink = container.querySelector('devtools-chrome-link');
    assertElement(chromeLink, ChromeLink.ChromeLink.ChromeLink);
    assertShadowRoot(chromeLink.shadowRoot);
    assert.strictEqual(chromeLink.innerHTML.trim(), 'link text');

    const link = chromeLink.shadowRoot.querySelector('a');
    assertElement(link, HTMLAnchorElement);
    assert.isTrue(spy.notCalled);
    link.click();

    assert.isTrue(spy.calledOnce);
    assert.deepEqual(spy.firstCall.firstArg, {url: 'chrome://settings'});
  });
});

describe('ChromeLink', () => {
  it('throws an error when given a non-\'chrome://\' URL', async () => {
    const component = new ChromeLink.ChromeLink.ChromeLink();
    assert.throws(() => {
      component.href = 'https://www.example.com';
    }, 'ChromeLink href needs to start with \'chrome://\'');
  });
});
