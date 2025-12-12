// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  dispatchKeyDownEvent,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

describeWithEnvironment('SoftContextMenu', () => {
  const items: UI.SoftContextMenu.SoftContextMenuDescriptor[] = [
    {
      type: 'item',
      id: 0,
      label: 'First',
      enabled: true,
    },
    {
      type: 'subMenu',
      label: 'Second',
      enabled: true,
      subItems: [
        {
          type: 'subMenu',
          label: 'Child 1',
          enabled: true,
          subItems: [
            {type: 'item', label: 'Grandchild', id: 2, enabled: true},
          ],
        },
        {type: 'item', label: 'Child 2', enabled: true},
        {type: 'item', label: 'Child 3', enabled: true},
        {type: 'item', label: 'Child 4', enabled: true},
      ],
    },
    {
      type: 'separator',
    },
    {
      type: 'item',
      id: 1,
      label: 'Third',
      enabled: true,
    },
  ];

  function getOpenMenus(): HTMLElement[] {
    const glassPanes = document.querySelectorAll('div[data-devtools-glass-pane]');
    return Array.from(glassPanes)
        .map(pane => pane.shadowRoot?.querySelector('.widget > .soft-context-menu') as HTMLElement);
  }

  function getSelectedText(menuElement: HTMLElement): string|null {
    const selected = menuElement.querySelector('.soft-context-menu-item-mouse-over');
    if (!selected) {
      return null;
    }
    return selected.textContent?.trim() || null;
  }

  function getSelection(): string {
    const menus = getOpenMenus();
    if (menus.length === 0) {
      return '';
    }
    return menus
        .map(menu => {
          const selected = getSelectedText(menu);
          return selected ? `[${selected}]` : 'null';
        })
        .join(' -> ');
  }

  function dispatchKeyDown(key: string) {
    const activeElement = UI.DOMUtilities.deepActiveElement(document);
    if (activeElement) {
      dispatchKeyDownEvent(activeElement, {key, bubbles: true});
    } else {
      assert.fail('No active element found to dispatch keydown event');
    }
  }

  it('navigates with keyboard', () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    const itemSelected = sinon.spy();
    const menu = new UI.SoftContextMenu.SoftContextMenu(items, itemSelected, true);
    menu.show(document, new AnchorBox(50, 50, 0, 0));

    assert.strictEqual(getSelection(), '[First]');

    dispatchKeyDown('ArrowDown');
    assert.strictEqual(getSelection(), '[Second]');

    dispatchKeyDown('ArrowDown');
    assert.strictEqual(getSelection(), '[Third]');

    dispatchKeyDown('ArrowDown');  // Does not wrap
    assert.strictEqual(getSelection(), '[Third]');

    dispatchKeyDown('ArrowUp');
    assert.strictEqual(getSelection(), '[Second]');

    dispatchKeyDown('ArrowUp');
    assert.strictEqual(getSelection(), '[First]');

    dispatchKeyDown('ArrowUp');  // Does not wrap
    assert.strictEqual(getSelection(), '[First]');

    dispatchKeyDown('ArrowDown');
    assert.strictEqual(getSelection(), '[Second]');

    dispatchKeyDown('ArrowRight');  // Enters submenu
    assert.strictEqual(getSelection(), '[Second] -> [Child 1]');

    dispatchKeyDown('ArrowDown');
    assert.strictEqual(getSelection(), '[Second] -> [Child 2]');

    dispatchKeyDown('ArrowDown');
    assert.strictEqual(getSelection(), '[Second] -> [Child 3]');

    dispatchKeyDown('ArrowDown');
    assert.strictEqual(getSelection(), '[Second] -> [Child 4]');

    dispatchKeyDown('ArrowLeft');  // Leaves submenu
    assert.strictEqual(getSelection(), '[Second]');

    dispatchKeyDown('ArrowRight');  // Enters submenu
    assert.strictEqual(getSelection(), '[Second] -> [Child 1]');

    dispatchKeyDown('Escape');  // Closes submenu
    assert.strictEqual(getSelection(), '[Second]');

    dispatchKeyDown(' ');  // Opens on Space
    assert.strictEqual(getSelection(), '[Second] -> [Child 1]');

    dispatchKeyDown('Enter');  // Opens on Enter
    assert.strictEqual(getSelection(), '[Second] -> [Child 1] -> [Grandchild]');

    dispatchKeyDown('Enter');  // Selects item
    sinon.assert.calledWith(itemSelected, 2);

    menu.discard();
  });
});
