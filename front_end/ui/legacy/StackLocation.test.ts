// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as i18n from '../../core/i18n/i18n.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';

import * as UI from './legacy.js';

describe('StackLocation', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let manager: UI.ViewManager.ViewManager;

  const createMockView = (id: string, title: string): UI.View.View => {
    const view = sinon.createStubInstance<UI.View.View>(UI.View.SimpleView);
    view.viewId.returns(id);
    view.title.returns(i18n.i18n.lockedString(title));
    view.widget.resolves(sinon.createStubInstance(UI.Widget.Widget));
    view.toolbarItems.resolves([]);
    return view;
  };

  beforeEach(() => {
    manager = UI.ViewManager.ViewManager.instance({forceNew: true});
  });

  it('should register view in ViewManager and append to StackedPane when showView is called', async () => {
    const viewA = createMockView('viewA', 'View A');
    const stackLocation = manager.createStackLocation();

    await stackLocation.showView(viewA);

    // Verify it's in ViewManager's views map
    assert.isTrue(manager.views.has('viewA'));
    assert.strictEqual(manager.views.get('viewA'), viewA);

    // Verify it's appended to the StackedPane
    const stackedPane = stackLocation.widget() as UI.StackedPane.StackedPane;
    assert.lengthOf(stackedPane.contentElement.children, 1);
    assert.isTrue(stackedPane.contentElement.children[0].shadowRoot?.textContent?.includes('View A'));
  });

  it('should remove view from ViewManager and StackedPane when removeView is called', async () => {
    const viewA = createMockView('viewA', 'View A');
    const stackLocation = manager.createStackLocation();
    await stackLocation.showView(viewA);

    assert.isTrue(manager.views.has('viewA'));
    assert.lengthOf((stackLocation.widget() as UI.StackedPane.StackedPane).contentElement.children, 1);

    stackLocation.removeView(viewA);

    assert.isFalse(manager.views.has('viewA'));
    assert.lengthOf((stackLocation.widget() as UI.StackedPane.StackedPane).contentElement.children, 0);
  });
});
