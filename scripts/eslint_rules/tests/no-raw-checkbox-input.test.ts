// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-raw-checkbox-input.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-raw-checkbox-input', rule, {
  valid: [
    {
      name: 'allows devtools-checkbox in Lit templates',
      code: 'Lit.html`<devtools-checkbox .checked=${isChecked}>Enable</devtools-checkbox>`',
      filename: 'front_end/panels/example/ExampleView.ts',
    },
    {
      name: 'allows devtools-checkbox even with type attribute',
      code: 'html`<devtools-checkbox type="checkbox">Enable</devtools-checkbox>`',
      filename: 'front_end/panels/example/ExampleView.ts',
    },
    {
      name: 'allows non-checkbox input types',
      code: `html\`
        <input type="text" .value=\${textValue} />
        <input type="radio" name="group" />
        <input type="search" />
        <input type="number" min="0" />
        <input />
      \``,
      filename: 'front_end/panels/example/ExampleView.ts',
    },
    {
      name: 'allows dynamic type bindings',
      code: `html\`
        <input type=\${inputType} />
        <input type="\${inputType}" />
        <input type='\${inputType}' />
        <input type=\${'checkbox'} />
        <input type="check\${suffix}" />
        <input type=check\${suffix} />
      \``,
      filename: 'front_end/panels/example/ExampleView.ts',
    },
    {
      name: 'allows custom elements whose name starts with input',
      code: 'html`<input-field type="checkbox"></input-field>`',
      filename: 'front_end/panels/example/ExampleView.ts',
    },
    {
      name: 'allows data-type="checkbox" and .type bindings on input',
      code: 'html`<input type="text" data-type="checkbox" .type=${"checkbox"} />`',
      filename: 'front_end/panels/example/ExampleView.ts',
    },
    {
      name: 'ignores CSS selector strings outside Lit templates',
      code: 'const css = \'input[type="checkbox"] { color: red; }\';',
      filename: 'front_end/panels/example/ExampleView.ts',
    },
    {
      name: 'ignores non-Lit tagged templates',
      code: 'css`input[type="checkbox"] { color: red; }`\notherTag`<input type="checkbox">`',
      filename: 'front_end/panels/example/ExampleView.ts',
    },
    {
      name: 'ignores input[type="checkbox"] inside style tags in Lit templates',
      code: 'html`<style>input[type="checkbox"] { margin: 0; }</style><devtools-checkbox></devtools-checkbox>`',
      filename: 'front_end/panels/example/ExampleView.ts',
    },
    {
      name: 'ignores HTML comments containing raw checkbox input',
      code: 'html`<!-- <input type="checkbox"> --><devtools-checkbox></devtools-checkbox>`',
      filename: 'front_end/panels/example/ExampleView.ts',
    },
  ],
  invalid: [
    {
      name: 'disallows double-quoted type="checkbox"',
      code: 'Lit.html`<input type="checkbox" />`',
      filename: 'front_end/panels/example/ExampleView.ts',
      errors: [{messageId: 'noRawCheckboxInput'}],
    },
    {
      name: 'disallows single-quoted type=\'checkbox\'',
      code: 'html`<input type=\'checkbox\'>`',
      filename: 'front_end/panels/example/ExampleView.ts',
      errors: [{messageId: 'noRawCheckboxInput'}],
    },
    {
      name: 'disallows unquoted type=checkbox',
      code: 'html`<input type=checkbox>`',
      filename: 'front_end/panels/example/ExampleView.ts',
      errors: [{messageId: 'noRawCheckboxInput'}],
    },
    {
      name: 'disallows case-insensitive tag, attribute name, and value',
      code: 'html`<INPUT TYPE="CHECKBOX"> <Input Type=\'CheckBox\'> <input tYpE=CheckBox>`',
      filename: 'front_end/panels/example/ExampleView.ts',
      errors: [
        {messageId: 'noRawCheckboxInput'},
        {messageId: 'noRawCheckboxInput'},
        {messageId: 'noRawCheckboxInput'},
      ],
    },
    {
      name: 'disallows whitespace around equals sign',
      code: 'html`<input type = "checkbox"> <input type =\n \'checkbox\'>`',
      filename: 'front_end/panels/example/ExampleView.ts',
      errors: [
        {messageId: 'noRawCheckboxInput'},
        {messageId: 'noRawCheckboxInput'},
      ],
    },
    {
      name: 'disallows multi-line input with Lit bindings before and after type',
      code: `Lit.html\`
        <label>
          <input
            class=\${cls}
            .checked=\${this.checked}
            type="checkbox"
            ?disabled=\${this.disabled}
            @change=\${this.onChange}
          />
          Enable
        </label>
      \``,
      filename: 'front_end/panels/example/ExampleView.ts',
      errors: [{messageId: 'noRawCheckboxInput', line: 3, endLine: 9}],
    },
    {
      name: 'disallows checkbox when earlier attribute has quoted > or dynamic binding',
      code: 'html`<input title="a > b" data-x="${a > b ? \'1\' : \'2\'}" ${ref(el)} type="checkbox" />`',
      filename: 'front_end/panels/example/ExampleView.ts',
      errors: [{messageId: 'noRawCheckboxInput'}],
    },
    {
      name: 'reports each raw checkbox in interpolated templates',
      code: `html\`
        <div>
          <input value=\${this.foo} type="checkbox" />
          \${showSecond ? html\`<input type=checkbox ?disabled=\${disabled}>\` : nothing}
        </div>
      \``,
      filename: 'front_end/panels/example/ExampleView.ts',
      errors: [
        {messageId: 'noRawCheckboxInput', line: 3},
        {messageId: 'noRawCheckboxInput', line: 4},
      ],
    },
    {
      name: 'handles tags named like Object.prototype properties without crashing',
      code: 'html`<constructor><input type="checkbox"></constructor>`',
      filename: 'front_end/panels/example/ExampleView.ts',
      errors: [{messageId: 'noRawCheckboxInput'}],
    },
  ],
});
