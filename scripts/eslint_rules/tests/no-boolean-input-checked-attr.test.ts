// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-boolean-input-checked-attr.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-boolean-input-checked-attr', rule, {
  valid: [
    {
      name: 'allows property binding .checked on <input>',
      code: 'Lit.html`<input type="checkbox" .checked=${isChecked}>`',
      filename: 'front_end/ui/components/my-component.ts',
    },
    {
      name: 'allows property binding .selected on <option>',
      code: 'Lit.html`<option value="1" .selected=${isSelected}>Option 1</option>`',
      filename: 'front_end/ui/components/my-component.ts',
    },
    {
      name: 'allows boolean attribute ?checked on custom elements like <devtools-checkbox>',
      code: 'Lit.html`<devtools-checkbox ?checked=${isChecked}>Label</devtools-checkbox>`',
      filename: 'front_end/ui/components/my-component.ts',
    },
    {
      name: 'allows boolean attribute ?selected on non-option elements like <tr> or <li>',
      code: 'Lit.html`<tr ?selected=${isSelected}><td>Row</td></tr>`',
      filename: 'front_end/ui/components/my-component.ts',
    },
    {
      name: 'allows other boolean attributes on <input> like ?disabled',
      code: 'Lit.html`<input type="checkbox" ?disabled=${isDisabled} .checked=${isChecked}>`',
      filename: 'front_end/ui/components/my-component.ts',
    },
  ],
  invalid: [
    {
      name: 'disallows boolean attribute ?checked on <input>',
      code: 'Lit.html`<input type="checkbox" ?checked=${isChecked}>`',
      filename: 'front_end/ui/components/my-component.ts',
      errors: [{messageId: 'noBooleanInputChecked'}],
      output: 'Lit.html`<input type="checkbox" .checked=${isChecked}>`',
    },
    {
      name: 'disallows boolean attribute ?checked on <input> with previous expressions in tag',
      code: 'Lit.html`<input title=${helpText} class=${cls} ?checked=${isChecked}>`',
      filename: 'front_end/ui/components/my-component.ts',
      errors: [{messageId: 'noBooleanInputChecked'}],
      output: 'Lit.html`<input title=${helpText} class=${cls} .checked=${isChecked}>`',
    },
    {
      name: 'disallows boolean attribute ?selected on <option>',
      code: 'Lit.html`<option value="1" ?selected=${isSelected}>Option</option>`',
      filename: 'front_end/ui/components/my-component.ts',
      errors: [{messageId: 'noBooleanOptionSelected'}],
      output: 'Lit.html`<option value="1" .selected=${isSelected}>Option</option>`',
    },
    {
      name: 'disallows boolean attribute ?checked on multiline <input>',
      code: 'Lit.html`<input\n  type="checkbox"\n  ?checked=${isChecked}\n/>`',
      filename: 'front_end/ui/components/my-component.ts',
      errors: [{messageId: 'noBooleanInputChecked'}],
      output: 'Lit.html`<input\n  type="checkbox"\n  .checked=${isChecked}\n/>`',
    },
    {
      name: 'disallows boolean attribute ?selected on multiple sibling <option> elements',
      code:
          'Lit.html`<select><option value="1" ?selected=${isOne}>1</option><option value="2" ?selected=${isTwo}>2</option></select>`',
      filename: 'front_end/ui/components/my-component.ts',
      errors: [
        {messageId: 'noBooleanOptionSelected'},
        {messageId: 'noBooleanOptionSelected'},
      ],
      output:
          'Lit.html`<select><option value="1" .selected=${isOne}>1</option><option value="2" .selected=${isTwo}>2</option></select>`',
    },
    {
      name: 'disallows boolean attribute ?checked on <input> with whitespace after =',
      code: 'Lit.html`<input type="checkbox" ?checked= ${isChecked}>`',
      filename: 'front_end/ui/components/my-component.ts',
      errors: [{messageId: 'noBooleanInputChecked'}],
      output: 'Lit.html`<input type="checkbox" .checked= ${isChecked}>`',
    },
    {
      name: 'disallows boolean attribute ?checked on <input> with newline after =',
      code: 'Lit.html`<input type="checkbox" ?checked=\n  ${isChecked}>`',
      filename: 'front_end/ui/components/my-component.ts',
      errors: [{messageId: 'noBooleanInputChecked'}],
      output: 'Lit.html`<input type="checkbox" .checked=\n  ${isChecked}>`',
    },
  ],
});
