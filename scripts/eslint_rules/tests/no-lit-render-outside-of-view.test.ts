// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-lit-render-outside-of-view.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-lit-render-outside-of-view', rule, {
  valid: [
    {
      code: `const DEFAULT_VIEW = (input, output, target) => {
        render(html\`<div>Hello world</div>\`, target);
      }`,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `function defaultView(viewInput, viewOutput, target) {
        render(html\`<div>Hello world</div>\`, target);
      }`,
      filename: 'front_end/panels/recorder/test.ts',
    },
    {
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
