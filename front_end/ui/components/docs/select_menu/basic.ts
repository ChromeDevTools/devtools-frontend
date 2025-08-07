// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../lit/lit.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';

const {html} = Lit;

function createDivWithP(text: string): HTMLDivElement {
  const div = document.createElement('div');
  div.style.paddingLeft = '25px';
  const p = document.createElement('p');
  p.style.marginLeft = '-25px';
  p.textContent = text;
  div.appendChild(p);
  document.body.appendChild(div);
  return div;
}

{
  const simpleMenuHTML = createDivWithP('Simple item select with lit-html');
  Lit.render(
      html`<select id="menu" aria-label="Select an option"
              @change=${onChange}>
      <option hidden>Select an option</option>
      <option id="option-1" jslog=${VisualLogging.item('option-1').track({
        click: true
      })}
              value="Option1">Option 1</option>
      <option jslog=${VisualLogging.item('option-2').track({
        click: true
      })}
              value="Option2">Option 2</option>
      <option disabled jslog=${VisualLogging.item('option-3').track({
        click: true
      })}
              value="Option3">Option 3</option>
    </select>`,
      simpleMenuHTML);
}

{
  const groupMenuHTML = createDivWithP('Select with groups with lit-html');
  Lit.render(
      html`<select aria-label="Select an option"
                @change=${onChange}>
      <optgroup label="Group 1">
        <option jslog=${VisualLogging.item('option-1').track({
        click: true
      })}
        value="Option1">Option 1</option>
      </optgroup>
      <optgroup label="Group 2">
        <option jslog=${VisualLogging.item('option-2').track({
        click: true
      })}
        value="Option2">Option 2</option>
        <option jslog=${VisualLogging.item('option-3').track({
        click: true
      })}
        value="Option3">Option 3</option>
      </optgroup>
    </select>`,
      groupMenuHTML);
}

{
  const simpleMenuImperative = createDivWithP('Simple item select with imperative API');
  const simpleSelect = UI.UIUtils.createSelect('Select an option', [
    'Option 1',
    'Option 2',
    'Option 3',
  ]);
  simpleSelect.addEventListener('change', event => onChange(event));
  simpleMenuImperative.appendChild(simpleSelect);
}

{
  const groupMenuImperative = createDivWithP('Select with groups with imperative API');
  const group1 = new Map<string, string[]>([['Group 1', ['Option 1']]]);
  const group2 = new Map<string, string[]>([['Group 2', ['Option 2', 'Option 3']]]);
  const groupSelect = UI.UIUtils.createSelect('Select an option', [group1, group2]);
  groupSelect.addEventListener('change', event => onChange(event));
  groupMenuImperative.appendChild(groupSelect);
}

function onChange(event: Event): void {
  const menu = event.target;
  if (menu instanceof HTMLSelectElement) {
    // eslint-disable-next-line no-console
    console.log('Option selected: ', menu.value);
  }
}
