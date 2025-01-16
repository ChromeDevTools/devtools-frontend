// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../helpers/helpers.js';
import * as IconButton from '../../icon_button/icon_button.js';

await ComponentHelpers.ComponentServerSetup.setup();

const iconTable = document.getElementById('icon-overview');

const row1 = document.createElement('tr');
const iconName1 = document.createElement('td');
iconName1.textContent = 'select-element';
row1.appendChild(iconName1);

const icon = IconButton.Icon.create('select-element');
const icon1 = document.createElement('td');
icon1.appendChild(icon);
row1.appendChild(icon1);

iconTable?.appendChild(row1);

icon.onclick = () => {
  // Change of colour through a data-setter, which rerenders the component. Getting the data first in order not to specify the data fields all over again
  icon.data = {...icon.data, color: 'blue'};
};

const row2 = document.createElement('tr');
const iconName2 = document.createElement('td');
iconName2.textContent = 'issue-exclamation-filled';
row2.appendChild(iconName2);

const otherIcon = IconButton.Icon.create('issue-exclamation-filled');
otherIcon.style.color = 'var(--icon-link)';
const icon2 = document.createElement('td');
icon2.appendChild(otherIcon);
row2.appendChild(icon2);

iconTable?.appendChild(row2);

const row3 = document.createElement('tr');
const iconName3 = document.createElement('td');
iconName3.textContent = 'select-element';
row3.appendChild(iconName3);

const otherIcon2 = IconButton.Icon.create('select-element', 'custom-color');
const icon3 = document.createElement('td');
icon3.appendChild(otherIcon2);
row3.appendChild(icon3);

iconTable?.appendChild(row3);

(() => {
  const div = document.createElement('div');
  const span1 = document.createElement('span');
  span1.textContent = 'Some text';
  div.appendChild(span1);
  const otherIcon3 = IconButton.Icon.create('select-element', 'custom-color');
  div.appendChild(otherIcon3);
  const span2 = document.createElement('span');
  span2.textContent = 'with a large icon';
  div.appendChild(span2);
  document.body.append(div);
})();

(() => {
  const div = document.createElement('div');
  const span1 = document.createElement('span');
  span1.textContent = 'Some text';
  div.appendChild(span1);
  const otherIcon3 = IconButton.Icon.create('select-element', 'custom-color');
  otherIcon3.style.width = '14px';
  otherIcon3.style.height = '14px';
  div.appendChild(otherIcon3);
  const span2 = document.createElement('span');
  span2.textContent = 'with a small icon';
  div.appendChild(span2);

  document.body.append(div);
})();

const iconInFlex = document.getElementById('icon-in-flex') as IconButton.Icon.Icon;
iconInFlex.data = {
  iconName: 'cross-circle',
  width: '20px',
  height: '20px',
  color: 'var(--icon-error)',
};
