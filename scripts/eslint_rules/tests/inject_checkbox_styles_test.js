// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/inject_checkbox_styles.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('inject_checkbox_styles', rule, {
  valid: [
    {
      code: `import * as Input from '../input/input.js';
      export class Test extends HTMLElement {
        readonly #shadow = this.attachShadow({mode: 'open'});

        connectedCallback() {
          this.#shadow.adoptedStyleSheets = [Input.checkboxStyles];
        }

        render() {
          LitHtml.render(LitHtml.html\`<input type="checkbox" />\`, this.#shadow, {host:this});
        }
      }`,
      filename: 'front_end/ui/components/datagrid/datagrid.ts',
    },
    {
      code: `import * as ComponentHelpers from '../../components/helpers/helpers.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import * as Input from '../input/input.js';
import settingCheckboxStyles from './settingCheckbox.css.js';

export class SettingCheckbox extends HTMLElement {
  static readonly litTagName = LitHtml.literal\`setting-checkbox\`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [Input.checkboxStyles, settingCheckboxStyles];
  }

  #render(): void {
    LitHtml.render(
        LitHtml.html\`<p>
        <label>
          <input type="checkbox" />
        </label>
      </p>\`, this.#shadow, {host: this});
  }
}`,
      filename: 'front_end/ui/components/settings/SettingsCheckbox.ts',
    },
    {
      code: `import * as Input from '../input/input.js';
      export class Test extends HTMLElement {
        private readonly shadow = this.attachShadow({mode: 'open'});

        connectedCallback() {
          this.shadow.adoptedStyleSheets = [Input.checkboxStyles, someOtherStyles];
        }

        render() {
          LitHtml.render(LitHtml.html\`<input type="checkbox" />\`, this.shadow, {host:this});
        }
      }`,
      filename: 'front_end/ui/components/datagrid/datagrid.ts',
    },
    // Nothing to do with checkboxes, so this rule should not apply.
    {
      code: `import * as Input from '../input/input.js';
      import {Foo} from './bar.js';

      export class Test extends HTMLElement {
        private readonly shadow = this.attachShadow({mode: 'open'});

        connectedCallback() {
          this.shadow.adoptedStyleSheets = [Input.textStyles, Foo.somethingElse];
        }

        render() {
          LitHtml.render(LitHtml.html\`<input type="text" />\`, this.shadow, {host:this});
        }
      }`,
      filename: 'front_end/ui/components/datagrid/datagrid.ts',
    },
  ],
  invalid: [
    // No styles imported or adopted.
    {
      code: `export class Test extends HTMLElement {
        private readonly shadow = this.attachShadow({mode: 'open'});

        render() {
          LitHtml.render(LitHtml.html\`<input type="checkbox" />\`, this.shadow, {host:this});
        }
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'missingCheckboxStylesImport'}],
    },

    // Ensure we get one error per checkbox found in the LitHtml call.
    {
      code: `export class Test extends HTMLElement {
        private readonly shadow = this.attachShadow({mode: 'open'});

        render() {
          LitHtml.render(LitHtml.html\`<div><input type="checkbox" /><input value=\${this.foo} type="checkbox" /></div>\`, this.shadow, {host:this});
        }
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'missingCheckboxStylesImport'}, {messageId: 'missingCheckboxStylesImport'}],
    },

    // Importing not the right styles.
    {
      code: `import * as NotInputStyles from '../../wrong-import-path/input/input.js';
      export class Test extends HTMLElement {
        private readonly shadow = this.attachShadow({mode: 'open'});

        connectedCallback() {
          this.shadow.adoptedStylesheets = [NotInputStyles.NotCheckboxStyles];
        }

        render() {
          LitHtml.render(LitHtml.html\`<input type="checkbox" />\`, this.shadow, {host:this});
        }
      }`,
      filename: 'front_end/ui/components/datagrid/datagrid.ts',
      errors: [{messageId: 'missingCheckboxStylesImport'}],
    },

    // No adopting of the styles.
    {
      code: `import * as Input from '../input/input.js';
      export class Test extends HTMLElement {
        private readonly shadow = this.attachShadow({mode: 'open'});

        render() {
          LitHtml.render(LitHtml.html\`<input type="checkbox" />\`, this.shadow, {host:this});
        }
      }`,
      filename: 'front_end/ui/components/datagrid/datagrid.ts',
      errors: [{messageId: 'missingCheckboxStylesAdoption'}],
    },

    // Adopting the wrong styles
    {
      code: `import * as Input from '../input/input.js';
      import {fooStyles} from './who-knows.js';

      export class Test extends HTMLElement {
        private readonly shadow = this.attachShadow({mode: 'open'});

        connectedCallback() {
          this.shadow.adoptedStyleSheets = [fooStyles];
        }

        render() {
          LitHtml.render(LitHtml.html\`<input type="checkbox" />\`, this.shadow, {host:this});
        }
      }`,
      filename: 'front_end/ui/components/datagrid/datagrid.ts',
      errors: [{messageId: 'missingCheckboxStylesAdoption'}],
    },
  ]
});
