// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as i18n from '../../core/i18n/i18n.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as UI from './legacy.js';

describeWithEnvironment('StatusBarWidget', () => {
  beforeEach(() => {
    UI.ViewManager.resetViewRegistration();
  });

  it('loads views registered for STATUS_BAR and attaches their widgets', async () => {
    const childWidget = new UI.Widget.Widget();
    UI.ViewManager.registerViewExtension({
      id: 'test-status-bar-item',
      location: UI.ViewManager.ViewLocationValues.STATUS_BAR,
      commandPrompt: () => i18n.i18n.lockedString('test-status-bar-item'),
      title: () => i18n.i18n.lockedString('test-status-bar-item'),
      async loadView() {
        return childWidget;
      },
    });

    UI.ViewManager.ViewManager.instance({forceNew: true, universe: new TestUniverse()});

    const statusBarWidget = new UI.StatusBar.StatusBarWidget(undefined);
    renderElementIntoDOM(statusBarWidget);

    await statusBarWidget.updateComplete;
    await statusBarWidget.viewsLoadedForTest();

    assert.isTrue(childWidget.isShowing());
    const statusBarContainer = statusBarWidget.contentElement.querySelector('.status-bar');
    assert.strictEqual(childWidget.element.parentElement, statusBarContainer);
  });
});
