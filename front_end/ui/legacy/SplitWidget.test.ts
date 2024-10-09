// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';

import * as UI from './legacy.js';

const {render, html} = LitHtml;
const widgetRef = UI.Widget.widgetRef;
const SplitWidget = UI.SplitWidget.SplitWidget;

describeWithEnvironment('SplitWidget', () => {
  describe('toggling', () => {
    it('returns the open state of the sidebar', async () => {
      const widget = new SplitWidget(
          true,   // isVertical
          false,  // secondIsSidebar
      );
      widget.showBoth();

      // Sidebar is showing, so toggling it hides it.
      assert.isFalse(widget.toggleSidebar());

      // Now it toggles to make it visible again
      assert.isTrue(widget.toggleSidebar());
    });
  });

  it('can be instantiated from the template', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    let widget!: UI.SplitWidget.SplitWidget;

    // clang-format off
    render(
        html`
      <devtools-split-widget .options=${{vertical: true,
                                         defaultSidebarWidth: 100,
                                         markAsRoot: true}}
                             ${widgetRef(SplitWidget, e => {widget = e;})}>
        <div slot="main">Main content</div>
        <div slot="sidebar">Sidebar content</div>
        </div>
      </devtools-split-widget>`,
        container, {host: this});
    // clang-format on

    await new Promise(resolve => setTimeout(resolve, 0));

    assert.exists(widget);
    assert.exists(widget.mainWidget());
    assert.strictEqual(widget.mainWidget()!.contentElement.textContent!.trim(), 'Main content');
    assert.strictEqual(widget.sidebarWidget()!.contentElement.textContent!.trim(), 'Sidebar content');
  });
});
