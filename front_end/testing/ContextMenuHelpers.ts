// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../ui/legacy/legacy.js';

export function getMenu(action: () => void): UI.ContextMenu.ContextMenu {
  const sandbox = sinon.createSandbox();

  const contextMenuShow = sandbox.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
  action();
  sandbox.restore();
  return contextMenuShow.thisValues[0];
}

export function getMenuForToolbarButton(button: UI.Toolbar.ToolbarMenuButton): UI.ContextMenu.ContextMenu {
  return getMenu(() => {
    button.clicked(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }));
  });
}

export function findMenuItemWithLabel(section: UI.ContextMenu.Section, label: string): UI.ContextMenu.Item|undefined {
  return section.items.find((item: UI.ContextMenu.Item) => item.buildDescriptor().label === label);
}

export function getMenuItemLabels(section: UI.ContextMenu.Section): string[] {
  return section.items.map((item: UI.ContextMenu.Item) => item.buildDescriptor().label as string);
}

export function getContextMenuForElement(element: Element, target?: Element): UI.ContextMenu.ContextMenu {
  return getMenu(() => {
    const event = new MouseEvent('contextmenu', {bubbles: true});
    if (target) {
      sinon.stub(event, 'target').value(target);
    }
    element.dispatchEvent(event);
  });
}

export function getMenuForShiftClick(element: Element): UI.ContextMenu.ContextMenu {
  return getMenu(() => {
    element.dispatchEvent(new MouseEvent('click', {shiftKey: true}));
  });
}
