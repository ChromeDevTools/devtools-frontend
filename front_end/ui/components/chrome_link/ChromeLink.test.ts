// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import * as Coordinator from '../render_coordinator/render_coordinator.js';

import * as ChromeLink from './chrome_link.js';

const {html} = LitHtml;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithMockConnection('ChromeLink', () => {
  it('renders a link when given a \'chrome://\' URL', async () => {
    const target = createTarget();
    const spy = sinon.spy(target.targetAgent(), 'invoke_createTarget');

    const container = document.createElement('div');
    // clang-format off
    LitHtml.render(
      html`
        <devtools-chrome-link .href=${'chrome://settings' as Platform.DevToolsPath.UrlString}>
          link text
        </devtools-chrome-link>
      `,
      container, {host: this},
    );
    // clang-format on
    renderElementIntoDOM(container);
    await coordinator.done();

    const chromeLink = container.querySelector('devtools-chrome-link');
    assert.instanceOf(chromeLink, ChromeLink.ChromeLink.ChromeLink);
    assert.isNotNull(chromeLink.shadowRoot);
    assert.strictEqual(chromeLink.innerHTML.trim(), 'link text');

    const link = chromeLink.shadowRoot.querySelector('a');
    assert.instanceOf(link, HTMLAnchorElement);
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
      component.href = 'https://www.example.com' as Platform.DevToolsPath.UrlString;
    }, 'ChromeLink href needs to start with \'chrome://\'');
  });
});
