// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-lit-render-outside-of-view.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-lit-render-outside-of-view', rule, {
  valid: [
    {
      name: 'allows render inside DEFAULT_VIEW arrow function',
      code: `const DEFAULT_VIEW = (input, output, target) => {
        render(html\`<div>Hello world</div>\`, target);
      }`,
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows render inside defaultView function declaration',
      code: `function defaultView(viewInput, viewOutput, target) {
        render(html\`<div>Hello world</div>\`, target);
      }`,
      filename: 'front_end/panels/recorder/test.ts',
    },
    {
      name: 'allows render inside default parameter view function in widget constructor',
      code: `class SomeWidget extends UI.Widget.Widget {
          constructor(view = (input, _output, target) => {
            render(html\`<div>Hello world</div>\`, target);
          }) {
          super(view);
        }
      }`,
      filename: 'front_end/panels/recorder/test.ts',
    },
  ],
  invalid: [
    {
      name: 'disallows render directly inside widget constructor',
      code: `class SomeWidget extends UI.Widget.Widget {
        constructor() {
          super();
          render(html\`<div>Hello world</div>\`, target, {host: this});
        }
      }`,
      filename: 'front_end/components/test.ts',
      errors: [
        {messageId: 'litRenderShouldBeInsideOfView'},
      ],
    },
    {
      name: 'disallows render inside widget instance method',
      code: `class SomeWidget extends UI.Widget.Widget {
        constructor() {
          super();
          this.render();
        }

        render() {
          render(html\`<div>Hello world</div>\`, target, {host: this});
        }
      }`,
      filename: 'front_end/components/test.ts',
      errors: [
        {messageId: 'litRenderShouldBeInsideOfView'},
      ],
    },
    {
      name: 'disallows host: this option in view render call',
      code: `const DEFAULT_VIEW = (input, output, target) => {
        render(html\`<div>Hello world</div>\`, target, {host: this});
      }`,
      filename: 'front_end/components/test.ts',
      errors: [
        {messageId: 'litRenderInsideOfViewMustNotUseHost'},
      ],
      output: `const DEFAULT_VIEW = (input, output, target) => {
        render(html\`<div>Hello world</div>\`, target);
      }`,
    },
    {
      name: 'disallows host: input option in view render call',
      code: `const DEFAULT_VIEW = (input, output, target) => {
        render(html\`<div>Hello world</div>\`, target, {host: input});
      }`,
      filename: 'front_end/components/test.ts',
      errors: [
        {messageId: 'litRenderInsideOfViewMustNotUseHost'},
      ],
      output: `const DEFAULT_VIEW = (input, output, target) => {
        render(html\`<div>Hello world</div>\`, target);
      }`,
    },
    {
      name: 'disallows host option when combined with renderBefore on multiple lines',
      code: `const DEFAULT_VIEW = (input, output, target) => {
        render(html\`<div>Hello world</div>\`, target,
               {renderBefore: child, host: input});
      }`,
      filename: 'front_end/components/test.ts',
      errors: [
        {messageId: 'litRenderInsideOfViewMustNotUseHost'},
      ],
      output: `const DEFAULT_VIEW = (input, output, target) => {
        render(html\`<div>Hello world</div>\`, target,
               {renderBefore: child});
      }`,
    },
    {
      name: 'disallows host option when combined with renderBefore on single line',
      code: `const DEFAULT_VIEW = (input, output, target) => {
        render(html\`<div>Hello world</div>\`, target, {
          host: input,renderBefore: child,
        });
      }`,
      filename: 'front_end/components/test.ts',
      errors: [
        {messageId: 'litRenderInsideOfViewMustNotUseHost'},
      ],
      output: `const DEFAULT_VIEW = (input, output, target) => {
        render(html\`<div>Hello world</div>\`, target, {
          renderBefore: child,
        });
      }`,
    },
    {
      name: 'disallows rendering into non-target element inside view function',
      code: `const DEFAULT_VIEW = (input, output, target) => {
        render(html\`<div>Hello world</div>\`, this.contentElement);
      }`,
      filename: 'front_end/components/test.ts',
      errors: [
        {messageId: 'litRenderInsideOfViewMustUseTarget'},
      ],
      output: `const DEFAULT_VIEW = (input, output, target) => {
        render(html\`<div>Hello world</div>\`, target);
      }`,
    },
  ],
});
