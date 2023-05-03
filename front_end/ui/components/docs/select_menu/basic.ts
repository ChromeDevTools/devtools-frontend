// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Dialogs from '../../../../ui/components/dialogs/dialogs.js';
import * as Menus from '../../../../ui/components/menus/menus.js';

const menus = [
  {
    items: [
      {
        name: 'Opt 1',
        value: '1',
      },
      {
        name: 'Opt 2',
        value: '2',
        selected: false,
      },
      {
        name: 'Opt 3',
        value: '3',
        group: '',
      },
      {
        name: 'Opt 4',
        value: '4',
      },
    ],
    buttonTitle: 'Show dialog',
  },
  {
    items: [
      {
        name: 'Opt 1',
        value: '1',
      },
      {
        name: 'Opt 2',
        value: '2',
        selected: false,
      },
      {
        name: 'Opt 3',
        value: '3',
      },
      {
        name: 'Opt 4',
        value: '4',
      },
    ],
    buttonTitle: 'Show dialog',
    position: Dialogs.Dialog.DialogVerticalPosition.TOP,
    showArrow: true,
  },
  {
    items: [
      {
        name: 'Opt 1',
        value: '1',
        selected: false,
      },
      {
        name: 'Opt 2',
        value: '2',
      },
      {
        name: 'Opt 3',
        value: '3',
      },
      {
        name: 'Opt 4',
        value: '4',
      },
    ],
    buttonTitle: 'Show dialog',
    position: Dialogs.Dialog.DialogVerticalPosition.BOTTOM,
    showConnector: true,
  },
  {
    items: [
      {
        name: 'Opt 1',
        value: '1',
        group: 'Group 1',
        selected: false,
      },
      {
        name: 'Opt 2',
        value: '2',
        group: 'Group 1',
      },
      {
        name: 'Opt 3',
        value: '3',
        group: 'Group 2',
      },
      {
        name: 'Opt 4',
        value: '4',
        group: 'Group 2',
      },
    ],
    buttonTitle: 'Show dialog',
    position: Dialogs.Dialog.DialogVerticalPosition.TOP,
    showConnector: true,
    hasGroups: true,
  },
  {
    items: [
      {
        name: 'Option 1',
        value: '1',
        selected: true,
      },
      {
        name: 'Option 2',
        value: '2',
      },
      {
        name: 'Option 3',
        value: '3',
      },
      {
        name: 'Option 4',
        value: '4',
      },
    ],
    showArrow: true,
  },
  {
    items: [
      {
        name: 'Option 1',
        value: '1',
        selected: true,
      },
    ],
    buttonTitle: 'Disabled',
    disabled: true,
  },
];
const root = document.getElementById('root');
menus.forEach((menu, i) => {
  const allItems: Menus.Menu.MenuItem[] = [];
  const selectMenu = new Menus.SelectMenu.SelectMenu();
  if (menu.buttonTitle) {
    selectMenu.buttonTitle = menu.buttonTitle;
  }
  selectMenu.position = menu.position || Dialogs.Dialog.DialogVerticalPosition.BOTTOM;
  selectMenu.showConnector = Boolean(menu.showConnector);
  const firstMenuGroup = new Menus.SelectMenu.SelectMenuGroup();
  firstMenuGroup.name = 'Group 1';
  const secondMenuGroup = new Menus.SelectMenu.SelectMenuGroup();
  secondMenuGroup.name = 'Group 2';
  selectMenu.showArrow = Boolean(menu.showArrow) || Boolean(menu.showConnector);
  selectMenu.disabled = Boolean(menu.disabled);
  menu.items.forEach((item, j) => {
    const selectMenuItem = new Menus.Menu.MenuItem();
    selectMenuItem.value = item.value;
    selectMenuItem.selected = Boolean(item.selected);
    const itemContent = document.createElement('div');
    itemContent.textContent = item.name;
    selectMenuItem.appendChild(itemContent);
    if (menu.hasGroups && j < 2) {
      firstMenuGroup.appendChild(selectMenuItem);
    } else if (menu.hasGroups) {
      secondMenuGroup.appendChild(selectMenuItem);
    } else {
      selectMenu.appendChild(selectMenuItem);
    }
    allItems.push(selectMenuItem);
  });

  if (menu.hasGroups) {
    selectMenu.appendChild(firstMenuGroup);
    selectMenu.appendChild(secondMenuGroup);
  }

  if (root) {
    const ph = document.createElement('div');
    ph.classList.add('place-holder');
    ph.setAttribute('id', `place-holder-${i + 1}`);
    root.appendChild(ph);
    const result = document.createElement('div');
    ph.appendChild(result);
    selectMenu.addEventListener('selectmenuselected', (_evt: Event) => {
      const evt = _evt as Menus.SelectMenu.SelectMenuItemSelectedEvent;
      let item = null;
      for (let i = 0; i < allItems.length; i++) {
        allItems[i].selected = allItems[i].value === evt.itemValue;
        if (allItems[i].selected) {
          item = allItems[i];
        }
      }
      if (!item) {
        return;
      }
      result.innerText = `Selected option: ${item.innerText.trim()}`;
    });

    ph.appendChild(selectMenu);
  }
});
