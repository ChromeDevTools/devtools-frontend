// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, it} from 'mocha';

import * as i18n from '../../core/i18n/i18n.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as UI from './legacy.js';

describeWithEnvironment('StatusBarWidget', () => {
  beforeEach(() => {
    UI.ViewManager.resetViewRegistration();
  });

  function registerStatusBarItem(id: Lowercase<string>, widget: UI.Widget.Widget): void {
    UI.ViewManager.registerViewExtension({
      id,
      location: UI.ViewManager.ViewLocationValues.STATUS_BAR,
      commandPrompt: () => i18n.i18n.lockedString(id),
      title: () => i18n.i18n.lockedString(id),
      async loadView() {
        return widget;
      },
    });
  }

  function createPillItem(text: string): UI.Widget.Widget {
    const widget = new UI.Widget.Widget();
    const pill = document.createElement('button');
    pill.classList.add('devtools-pill');
    pill.textContent = text;
    widget.contentElement.appendChild(pill);
    return widget;
  }

  async function renderStatusBar(): Promise<UI.StatusBar.StatusBarWidget> {
    UI.ViewManager.ViewManager.instance({forceNew: true, universe: new TestUniverse()});
    const statusBarWidget = new UI.StatusBar.StatusBarWidget(undefined);
    renderElementIntoDOM(statusBarWidget, {includeCommonStyles: true, width: 300});
    await statusBarWidget.updateComplete;
    await statusBarWidget.viewsLoadedForTest();
    return statusBarWidget;
  }

  it('loads views registered for STATUS_BAR and attaches their widgets', async () => {
    const childWidget = new UI.Widget.Widget();
    registerStatusBarItem('test-status-bar-item', childWidget);

    const statusBarWidget = await renderStatusBar();

    assert.isTrue(childWidget.isShowing());
    const statusBarContainer = statusBarWidget.contentElement.querySelector('.status-bar');
    assert.strictEqual(childWidget.element.parentElement, statusBarContainer);
  });

  it('separates the items that render something', async () => {
    registerStatusBarItem('first-item', createPillItem('First'));
    registerStatusBarItem('empty-item', new UI.Widget.Widget());
    registerStatusBarItem('last-item', createPillItem('Last'));

    await renderStatusBar();

    await assertScreenshot('status_bar/status_bar_items.png');
  });
});
