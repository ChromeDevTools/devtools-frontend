// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Menus from '../../../../ui/components/menus/menus.js';

const menuItems = [
  {
    name: 'Opt 1',
    value: '1',
    selected: true,
    group: '',
  },
  {
    name: 'Opt 2',
    value: '2',
    group: '',
  },
  {
    name: 'Opt 3',
    value: '3',
    group: '',
  },
  {
    name: 'Opt 4',
    value: '4',
    group: '',
  },
];
const root = document.getElementById('root');
const button = document.createElement('button');
button.innerText = 'Toggle menu';

const menu = new Menus.Menu.Menu();
menu.origin = button;
menu.open = false;
menu.showDivider = true;
menu.showConnector = true;

menuItems.forEach(item => {
  const menuItem = new Menus.Menu.MenuItem();
  menuItem.value = item.value;
  menuItem.selected = Boolean(item.selected);
  const itemContent = document.createElement('div');
  itemContent.textContent = item.name;
  menuItem.appendChild(itemContent);
  menu.appendChild(menuItem);
});

menu.addEventListener('menuitemselected', evt => {
  menu.querySelectorAll('devtools-menu-item').forEach(item => {
    item.selected = item.value === evt.itemValue;
  });
});

menu.addEventListener('menucloserequest', _evt => {
  menu.open = false;
});

button.addEventListener('click', _menuEvent => {
  menu.open = !menu.open;
});

if (root) {
  root.appendChild(menu);
  root.appendChild(button);
}
