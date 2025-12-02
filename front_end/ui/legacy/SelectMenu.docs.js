// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Lit from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import { UIUtils } from './legacy.js';
const { html } = Lit;
export function render(container) {
    function createDivWithP(text) {
        const div = document.createElement('div');
        div.style.paddingLeft = '25px';
        const p = document.createElement('p');
        p.style.marginLeft = '-25px';
        p.textContent = text;
        div.appendChild(p);
        container.appendChild(div);
        return div;
    }
    function onChange(event) {
        const menu = event.target;
        if (menu instanceof HTMLSelectElement) {
            console.log('Option selected: ', menu.value);
        }
    }
    {
        const simpleMenuHTML = createDivWithP('Simple item select with lit-html');
        Lit.render(html `<select id="menu" aria-label="Select an option"
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
      </select>`, simpleMenuHTML);
    }
    {
        const disabledMenuHTML = createDivWithP('Disabled select with lit-html');
        // clang-format off
        Lit.render(html `<select disabled aria-label="Select an option" @change=${onChange}>
                <option hidden>Select an option</option>
                <option jslog=${VisualLogging.item('option-1').track({
            click: true
        })} value="Option1">Option 1</option>
              </select>`, disabledMenuHTML);
        // clang-format on
    }
    {
        const groupMenuHTML = createDivWithP('Select with groups with lit-html');
        Lit.render(html `<select aria-label="Select an option"
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
      </select>`, groupMenuHTML);
    }
    {
        const simpleMenuImperative = createDivWithP('Simple item select with imperative API');
        const simpleSelect = UIUtils.createSelect('Select an option', [
            'Option 1',
            'Option 2',
            'Option 3',
        ]);
        simpleSelect.addEventListener('change', event => onChange(event));
        simpleMenuImperative.appendChild(simpleSelect);
    }
    {
        const groupMenuImperative = createDivWithP('Select with groups with imperative API');
        const group1 = new Map([['Group 1', ['Option 1']]]);
        const group2 = new Map([['Group 2', ['Option 2', 'Option 3']]]);
        const groupSelect = UIUtils.createSelect('Select an option', [group1, group2]);
        groupSelect.addEventListener('change', event => onChange(event));
        groupMenuImperative.appendChild(groupSelect);
    }
}
//# sourceMappingURL=SelectMenu.docs.js.map