// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/inject-checkbox-styles.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('inject-checkbox-styles', rule, {
  valid: [
    {
      code: `import * as Input from '../input/input.js';
      export class Test extends HTMLElement {
        readonly #shadow = this.attachShadow({mode: 'open'});

        connectedCallback() {
          this.#shadow.adoptedStyleSheets = [Input.checkboxStyles];
        }

        render() {
          Lit.render(Lit.html\`<input type="checkbox" />\`, this.#shadow, {host:this});
        }
      }`,
      filename: 'front_end/ui/components/datagrid/datagrid.ts',
    },
    {
      code: `import * as ComponentHelpers from '../../components/helpers/helpers.js';
import * as Lit from '../../lit/lit.js';
import * as Input from '../input/input.js';
import settingCheckboxStylesRaw from './settingCheckbox.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const settingCheckboxStyles = new CSSStyleSheet();
settingCheckboxStyles.replaceSync(settingCheckboxStylesRaw.cssText);

export class SettingCheckbox extends HTMLElement {
  static readonly litTagName = Lit.literal\`setting-checkbox\`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [Input.checkboxStyles, settingCheckboxStyles];
  }

  #render(): void {
    Lit.render(
        Lit.html\`<p>
        <label>
          <input type="checkbox" />
        </label>
      </p>\`, this.#shadow, {host: this});
  }
}`,
      filename: 'front_end/ui/components/settings/SettingsCheckbox.ts',
    },
    {
      code: `import * as ComponentHelpers from '../../components/helpers/helpers.js';
import * as Lit from '../../lit/lit.js';
import * as Input from '../input/input.js';


export class SettingCheckbox extends HTMLElement {
  static readonly litTagName = Lit.literal\`setting-checkbox\`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #render(): void {
    Lit.render(
        Lit.html\`
      <style>\${Input.checkboxStyles}</style>
      <p>
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
          Lit.render(Lit.html\`<input type="checkbox" />\`, this.shadow, {host:this});
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
          Lit.render(Lit.html\`<input type="text" />\`, this.shadow, {host:this});
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
          Lit.render(Lit.html\`<input type="checkbox" />\`, this.shadow, {host:this});
        }
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'missingCheckboxStylesImport'}],
    },

    // Ensure we get one error per checkbox found in the Lit call.
    {
      code: `export class Test extends HTMLElement {
        private readonly shadow = this.attachShadow({mode: 'open'});

        render() {
          Lit.render(Lit.html\`<div><input type="checkbox" /><input value=\${this.foo} type="checkbox" /></div>\`, this.shadow, {host:this});
        }
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [
        {messageId: 'missingCheckboxStylesImport'},
        {messageId: 'missingCheckboxStylesImport'},
      ],
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
          Lit.render(Lit.html\`<input type="checkbox" />\`, this.shadow, {host:this});
        }
      }`,
      filename: 'front_end/ui/components/datagrid/datagrid.ts',
      errors: [{messageId: 'missingCheckboxStylesImport'}],
    },
    {
      code: `import * as NotInputStyles from '../../wrong-import-path/input/input.js';
      export class Test extends HTMLElement {
        private readonly shadow = this.attachShadow({mode: 'open'});

        render() {
          Lit.render(Lit.html\`<style>\${NotInputStyles.NotCheckboxStyles}</style><input type="checkbox" />\`, this.shadow, {host:this});
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
          Lit.render(Lit.html\`<input type="checkbox" />\`, this.shadow, {host:this});
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
          Lit.render(Lit.html\`<input type="checkbox" />\`, this.shadow, {host:this});
        }
      }`,
      filename: 'front_end/ui/components/datagrid/datagrid.ts',
      errors: [{messageId: 'missingCheckboxStylesAdoption'}],
    },
    {
      code: `import * as Input from '../input/input.js';
      import {fooStyles} from './who-knows.js';

      export class Test extends HTMLElement {
        private readonly shadow = this.attachShadow({mode: 'open'});

        render() {
          Lit.render(Lit.html\`<style>\${fooStyles}</style><input type="checkbox" />\`, this.shadow, {host:this});
        }
      }`,
      filename: 'front_end/ui/components/datagrid/datagrid.ts',
      errors: [{messageId: 'missingCheckboxStylesAdoption'}],
    },
  ],
});
