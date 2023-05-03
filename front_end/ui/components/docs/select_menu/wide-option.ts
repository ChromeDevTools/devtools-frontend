// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Menus from '../../../../ui/components/menus/menus.js';

const root = document.getElementById('root');
function makeMenu(id: string): void {
  const items: Menus.Menu.MenuItem[] = [];
  const menu = new Menus.SelectMenu.SelectMenu();

  const options = [
    {text: 'A short option', value: 'option-1'},
    {text: 'A very long option that has a lot of text', value: 'option-2'},
    {text: 'An  average sized option', value: 'option-3'},
  ];

  options.forEach(opt => {
    const item = new Menus.Menu.MenuItem();
    item.value = opt.value;
    item.textContent = opt.text;
    menu.appendChild(item);
    items.push(item);
  });

  menu.addEventListener('selectmenuselected', (event: Menus.SelectMenu.SelectMenuItemSelectedEvent) => {
    items.forEach(item => {
      item.selected = item.value === event.itemValue;
    });
    const selectedOption = options.find(option => option.value === event.itemValue);
    menu.buttonTitle = selectedOption?.text || '';
  });

  items[1].selected = true;
  menu.buttonTitle = options[1].text;
  menu.showArrow = true;
  menu.id = id;

  root?.appendChild(menu);
}

makeMenu('width-150');
makeMenu('width-400');
