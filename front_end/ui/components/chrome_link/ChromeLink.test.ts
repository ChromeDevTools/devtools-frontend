// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import {html, render} from '../../lit/lit.js';
import * as RenderCoordinator from '../render_coordinator/render_coordinator.js';

import * as ChromeLink from './chrome_link.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('ChromeLink', () => {
  it('renders a link when given a \'chrome://\' URL', async () => {
    const target = createTarget();
    const spy = sinon.spy(target.targetAgent(), 'invoke_createTarget');

    const container = document.createElement('div');
    // clang-format off
    render(
      html`
        <devtools-chrome-link .href=${urlString`chrome://settings`}>
          link text
        </devtools-chrome-link>
      `,
      container, {host: this},
    );
    // clang-format on
    renderElementIntoDOM(container);
    await RenderCoordinator.done();

    const chromeLink = container.querySelector('devtools-chrome-link');
    assert.instanceOf(chromeLink, ChromeLink.ChromeLink.ChromeLink);
    assert.isNotNull(chromeLink.shadowRoot);
    assert.strictEqual(chromeLink.innerHTML.trim(), 'link text');

    const link = chromeLink.shadowRoot.querySelector('a');
    assert.instanceOf(link, HTMLAnchorElement);
    sinon.assert.notCalled(spy);
    link.click();

    sinon.assert.calledOnce(spy);
    assert.deepEqual(spy.firstCall.firstArg, {url: 'chrome://settings'});
  });
});

describe('ChromeLink', () => {
  it('throws an error when given a non-\'chrome://\' URL', async () => {
    const component = new ChromeLink.ChromeLink.ChromeLink();
    assert.throws(() => {
      component.href = urlString`https://www.example.com`;
    }, 'ChromeLink href needs to start with \'chrome://\'');
  });
});
