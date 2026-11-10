// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-unscoped-light-dom-styles.ts';

import {RuleTester, typeCheckingOptions} from './utils/RuleTester.ts';

new RuleTester().run('no-unscoped-light-dom-styles', rule, {
  valid: [
    {
      name: 'allows unscoped sheet in Shadow DOM widget (super useShadowDom)',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        class ShadowWidget {
          constructor() {
            super({useShadowDom: true});
          }
          render() {
            return html\`<style>\${unscopedStyles}</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      name: 'allows fully scoped sheet in Light DOM widget',
      code: `
        import scopedStyles from './resources/no-unscoped-light-dom-styles-scoped.css.js';
        class LightWidget {
          constructor() {
            super();
          }
          render() {
            return html\`<style>\${scopedStyles}</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      name: 'allows allowed at-rules like keyframes outside @scope',
      code: `
        import keyframesStyles from './resources/no-unscoped-light-dom-styles-keyframes-scoped.css.js';
        class LightWidget {
          constructor() {
            super();
          }
          render() {
            return html\`<style>\${keyframesStyles}</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      name: 'allows @media containing only @scope',
      code: `
        import mediaScopedStyles from './resources/no-unscoped-light-dom-styles-media-scoped.css.js';
        class LightWidget {
          constructor() {
            super();
          }
          render() {
            return html\`<style>\${mediaScopedStyles}</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      name: 'allows shared namespace sheet when wrapped in inline @scope',
      code: `
        import * as UI from './ui.js';
        class LightWidget {
          constructor() {
            super();
          }
          render() {
            return html\`<style>@scope to (devtools-widget > *) { \${UI.inspectorCommonStyles} }</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      name: 'allows .template= inert template in devtools-tree',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        class LightWidget {
          constructor() {
            super();
          }
          render() {
            return html\`<devtools-tree .template=\${html\`<style>\${unscopedStyles}</style>\`}></devtools-tree>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      name: 'allows render() into shadow root target',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        class LightWidget {
          #shadow: ShadowRoot;
          constructor() {
            super();
          }
          render() {
            render(html\`<style>\${unscopedStyles}</style>\`, this.#shadow);
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      name: 'allows this.glassPane.registerRequiredCSS(styles)',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        class LightWidget {
          glassPane: any;
          constructor() {
            super();
            this.glassPane.registerRequiredCSS(unscopedStyles);
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      name: 'allows DEFAULT_VIEW used by Shadow DOM widget',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        export const DEFAULT_VIEW = () => {
          return html\`<style>\${unscopedStyles}</style>\`;
        };
        class ShadowWidget {
          constructor() {
            super({useShadowDom: true});
          }
          view = DEFAULT_VIEW;
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      name: 'allows UI.Panel.Panel subclass with super(name, true)',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        class MyPanel extends UI.Panel.Panel {
          constructor() {
            super('my-panel', true);
          }
          render() {
            return html\`<style>\${unscopedStyles}</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      name: 'allows dynamic expression in style tag',
      code: `
        class LightWidget {
          constructor() {
            super();
          }
          render(input: any) {
            return html\`<style>\${input.fontFaceRule}</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      name: 'suppresses errors for burndown-listed file with findings',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        class LightWidget {
          constructor() {
            super();
          }
          render() {
            return html\`<style>\${unscopedStyles}</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
      options: [{burndown: ['scripts/eslint_rules/tests/file.ts']}],
    },
    {
      name: 'allows super({useShadowDom: "pure"})',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        class PureShadowWidget {
          constructor() {
            super({useShadowDom: 'pure'});
          }
          render() {
            return html\`<style>\${unscopedStyles}</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      name: 'allows custom element calling this.attachShadow() and rendering unscoped styles into shadow root',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        class CustomElem extends HTMLElement {
          #shadow = this.attachShadow({mode: 'open'});
          render() {
            render(html\`<style>\${unscopedStyles}</style>\`, this.#shadow);
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      name: 'allows UI.GlassPane.GlassPane subclass calling this.registerRequiredCSS()',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        class MyGlassPane extends UI.GlassPane.GlassPane {
          constructor() {
            super();
            this.registerRequiredCSS(unscopedStyles);
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      name: 'allows multi-hop view resolution for useShadowDom: true widget',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        function renderRows() {
          return html\`<style>\${unscopedStyles}</style>\`;
        }
        export const DEFAULT_VIEW = () => {
          return renderRows();
        };
        class ShadowWidget {
          constructor() {
            super({useShadowDom: true});
          }
          view = DEFAULT_VIEW;
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
  ],

  invalid: [
    {
      name: 'reports unscoped sheet in Light DOM widget',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        class LightWidget {
          constructor() {
            super();
          }
          render() {
            return html\`<style>\${unscopedStyles}</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
      errors: [
        {
          messageId: 'unscopedSheet',
          data: {sheet: 'unscopedStyles'},
        },
      ],
    },
    {
      name: 'reports same-file inherited light widget with no constructor injecting unscoped sheet',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        class BaseWidget {
          constructor() {
            super();
          }
        }
        class DerivedWidget extends BaseWidget {
          render() {
            return html\`<style>\${unscopedStyles}</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
      errors: [
        {
          messageId: 'unscopedSheet',
          data: {sheet: 'unscopedStyles'},
        },
      ],
    },
    {
      name: 'reports multi-hop view resolution for light widget',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        function renderRows() {
          return html\`<style>\${unscopedStyles}</style>\`;
        }
        export const DEFAULT_VIEW = () => {
          return renderRows();
        };
        class LightWidget {
          constructor() {
            super();
          }
          view = DEFAULT_VIEW;
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
      errors: [
        {
          messageId: 'unscopedSheet',
          data: {sheet: 'unscopedStyles'},
        },
      ],
    },
    {
      name: 'reports grouped variable declaration VIEW_A, VIEW_B used by light widget',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        const VIEW_A = () => html\`<div>A</div>\`,
          VIEW_B = () => html\`<style>\${unscopedStyles}</style>\`;
        class LightWidget {
          constructor() {
            super();
          }
          view = VIEW_B;
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
      errors: [
        {
          messageId: 'unscopedSheet',
          data: {sheet: 'unscopedStyles'},
        },
      ],
    },
    {
      name: 'reports @media containing plain rules',
      code: `
        import mediaUnscopedStyles from './resources/no-unscoped-light-dom-styles-media-unscoped.css.js';
        class LightWidget {
          constructor() {
            super();
          }
          render() {
            return html\`<style>\${mediaUnscopedStyles}</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
      errors: [
        {
          messageId: 'unscopedSheet',
          data: {sheet: 'mediaUnscopedStyles'},
        },
      ],
    },
    {
      name: 'reports partially scoped sheet',
      code: `
        import partialStyles from './resources/no-unscoped-light-dom-styles-partial.css.js';
        class LightWidget {
          constructor() {
            super();
          }
          render() {
            return html\`<style>\${partialStyles}</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
      errors: [
        {
          messageId: 'unscopedSheet',
          data: {sheet: 'partialStyles'},
        },
      ],
    },
    {
      name: 'reports shared namespace sheet without inline wrapper',
      code: `
        import * as UI from './ui.js';
        class LightWidget {
          constructor() {
            super();
          }
          render() {
            return html\`<style>\${UI.inspectorCommonStyles}</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
      errors: [
        {
          messageId: 'unscopedSharedSheet',
          data: {name: 'UI.inspectorCommonStyles'},
        },
      ],
    },
    {
      name: 'reports inline static <style> text without @scope',
      code: `
        class LightWidget {
          constructor() {
            super();
          }
          render() {
            return html\`<style>.item { margin: 0; }</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
      errors: [
        {
          messageId: 'unscopedInlineStyle',
        },
      ],
    },
    {
      name: 'reports this.registerRequiredCSS(styles) in Light class',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        class LightWidget {
          constructor() {
            super();
            this.registerRequiredCSS(unscopedStyles);
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
      errors: [
        {
          messageId: 'unscopedSheet',
          data: {sheet: 'unscopedStyles'},
        },
      ],
    },
    {
      name: 'reports appendStyle(this.element, styles)',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        class LightWidget {
          element: HTMLElement;
          constructor() {
            UI.DOMUtilities.appendStyle(this.element, unscopedStyles);
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
      errors: [
        {
          messageId: 'unscopedSheet',
          data: {sheet: 'unscopedStyles'},
        },
      ],
    },
    {
      name: 'reports DEFAULT_VIEW used by Light DOM widget',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        export const DEFAULT_VIEW = () => {
          return html\`<style>\${unscopedStyles}</style>\`;
        };
        class LightWidget {
          constructor() {
            super();
          }
          view = DEFAULT_VIEW;
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
      errors: [
        {
          messageId: 'unscopedSheet',
          data: {sheet: 'unscopedStyles'},
        },
      ],
    },
    {
      name: 'reports only Light widget in file mixing Shadow and Light widgets',
      code: `
        import unscopedStyles from './resources/no-unscoped-light-dom-styles-unscoped.css.js';
        class ShadowWidget {
          constructor() {
            super({useShadowDom: true});
          }
          render() {
            return html\`<style>\${unscopedStyles}</style>\`;
          }
        }
        class LightWidget {
          constructor() {
            super();
          }
          render() {
            return html\`<style>\${unscopedStyles}</style>\`;
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/file.ts',
      errors: [
        {
          messageId: 'unscopedSheet',
          data: {sheet: 'unscopedStyles'},
        },
      ],
    },
    {
      name: 'reports staleBurndownEntry when burndown-listed file has no findings',
      code: `
        class CleanWidget {
          constructor() {
            super();
          }
        }
      `,
      filename: 'scripts/eslint_rules/tests/clean.ts',
      options: [{burndown: ['scripts/eslint_rules/tests/clean.ts']}],
      errors: [
        {
          messageId: 'staleBurndownEntry',
          data: {file: 'scripts/eslint_rules/tests/clean.ts'},
        },
      ],
    },
  ],
});

new RuleTester(typeCheckingOptions).run('no-unscoped-light-dom-styles (typed base class resolution)', rule, {
  valid: [
    {
      name: 'allows unscoped sheet in subclass extending ShadowBase from another file',
      code: `
        import unscopedStyles from './scripts/eslint_rules/tests/resources/no-unscoped-light-dom-styles-unscoped.css.js';
        import {ShadowBase} from './scripts/eslint_rules/tests/resources/no-unscoped-light-dom-styles-shadow-base.ts';

        class SubWidget extends ShadowBase {
          constructor() {
            super();
            this.registerRequiredCSS(unscopedStyles);
          }
        }
      `,
      filename: 'file.ts',
    },
    {
      name: 'allows unscoped sheet in multi-hop subclass extending IntermediateBase from another file',
      code: `
        import unscopedStyles from './scripts/eslint_rules/tests/resources/no-unscoped-light-dom-styles-unscoped.css.js';
        import {IntermediateBase} from './scripts/eslint_rules/tests/resources/no-unscoped-light-dom-styles-shadow-chain.ts';

        class MultiHopWidget extends IntermediateBase {
          constructor() {
            super();
            this.registerRequiredCSS(unscopedStyles);
          }
        }
      `,
      filename: 'file.ts',
    },
  ],
  invalid: [
    {
      name: 'reports unscoped sheet in subclass extending LightBase from another file',
      code: `
        import unscopedStyles from './scripts/eslint_rules/tests/resources/no-unscoped-light-dom-styles-unscoped.css.js';
        import {LightBase} from './scripts/eslint_rules/tests/resources/no-unscoped-light-dom-styles-light-base.ts';

        class LightSubWidget extends LightBase {
          constructor() {
            super();
            this.registerRequiredCSS(unscopedStyles);
          }
        }
      `,
      filename: 'file.ts',
      errors: [
        {
          messageId: 'unscopedSheet',
          data: {sheet: 'unscopedStyles'},
        },
      ],
    },
  ],
});
