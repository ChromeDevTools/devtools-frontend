// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../lit/lit.js';
import * as ComponentHelpers from '../../helpers/helpers.js';
import * as IconButton from '../../icon_button/icon_button.js';

const {html} = Lit;

await ComponentHelpers.ComponentServerSetup.setup();

const iconTable = document.getElementById('icon-overview');

const row1 = document.createElement('tr');
const iconDescription1 = document.createElement('td');
iconDescription1.textContent = 'Programmatically created with default size and color';
row1.appendChild(iconDescription1);

const icon = IconButton.Icon.create('select-element');
const icon1 = document.createElement('td');
icon1.appendChild(icon);
row1.appendChild(icon1);

iconTable?.appendChild(row1);

const row2 = document.createElement('tr');
const iconDescription2 = document.createElement('td');
iconDescription2.textContent = 'Programmatically created with custom size and color';
row2.appendChild(iconDescription2);

const otherIcon = IconButton.Icon.create('issue-exclamation-filled');
otherIcon.classList.toggle('custom-size-and-color');
const icon2 = document.createElement('td');
icon2.appendChild(otherIcon);
row2.appendChild(icon2);

iconTable?.appendChild(row2);

const row3 = document.createElement('tr');
const iconDescription3 = document.createElement('td');
iconDescription3.textContent = 'Created through html template with default size and color';
row3.appendChild(iconDescription3);

const icon3 = document.createElement('td');
Lit.render(
    html`
        <devtools-icon name="select-element"></devtools-icon>
      `,
    icon3);
row3.appendChild(icon3);

iconTable?.appendChild(row3);

const row4 = document.createElement('tr');
const iconDescription4 = document.createElement('td');
iconDescription4.textContent = 'Created through html template with custom size and color';
row4.appendChild(iconDescription4);

const icon4 = document.createElement('td');
Lit.render(
    html`
        <devtools-icon name="select-element" class="custom-color small"></devtools-icon>
      `,
    icon4);
row4.appendChild(icon4);

iconTable?.appendChild(row4);
