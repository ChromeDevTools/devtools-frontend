// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-unscoped-styles-in-views.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-unscoped-styles-in-views', rule, {
  valid: [
    // Valid case 1: Styles are wrapped with UI.Widget.widgetScoped
    {
      code: `const DEFAULT_VIEW = (input, output, target) => {
        render(html\`
          <div class="container">
            <style>\${UI.Widget.widgetScoped(someStyles)}</style>
          </div>
        \`, target, {host: input});
      }`,
      filename: 'front_end/components/test.ts',
    },
    // Valid case 2: Styles are wrapped with UI.Widget.widgetScoped (inline string)
    {
      code: `const defaultView = (input, output, target) => {
        render(html\`
          <style>\${UI.Widget.widgetScoped('div { background: blue; }')}</style>
        \`, target, {host: input});
      }`,
      filename: 'front_end/panels/elements/test.ts',
    },
    // Valid case 3: No style tags present
    {
      code: `const AnotherView = (input, output, target) => {
        render(html\`<div><p>Some content</p></div>\`, target, {host: input});
      }`,
      filename: 'front_end/panels/elements/test.ts',
    },
    // Valid case 4: Styles within a non-view function (this rule doesn't apply)
    {
      code: `function someHelperFunction() {
        render(html\`<style>div { color: red; }</style>\`, document.body);
      }`,
      filename: 'front_end/core/common/test.ts',
    },
    // Valid case 5: Multiple style tags, all correctly scoped
    {
      code: `const MultiStyleView = (input, output, target) => {
        render(html\`
          <style>\${UI.Widget.widgetScoped(style1)}</style>
          <div>Some content</div>
          <style>\${UI.Widget.widgetScoped(style2)}</style>
        \`, target, {host: input});
      }`,
      filename: 'front_end/components/multi.ts',
    },
    // Valid case 6: Style tag with empty content, still considered valid as it doesn't contain unscoped styles
    {
      code: `const EmptyStyleView = (input, output, target) => {
        render(html\`<style></style>\`, target, {host: input});
      }`,
      filename: 'front_end/components/empty.ts',
    },
    // Valid case 7: Style tag with just a comment, still considered valid
    {
      code: `const CommentStyleView = (input, output, target) => {
        render(html\`<style>/* No styles here */</style>\`, target, {host: input});
      }`,
      filename: 'front_end/components/comment.ts',
    },
    // Valid case 8: Style tag with a call to `widgetScoped` without `UI.Widget` part.
    {
      code: `const DEFAULT_VIEW = (input, output, target) => {
        render(html\`
          <div class="container">
            <style>\${widgetScoped(someStyles)}</style>
          </div>
        \`, target, {host: input});
      }`,
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    // Invalid case 1: Static style content not wrapped
    {
      code: `const InvalidView1 = (input, output, target) => {
        render(html\`
          <style>
            div { color: red; }
          </style>
        \`, target, {host: input});
      }`,
      filename: 'front_end/components/invalid1.ts',
      errors: [{messageId: 'styleTagMissingWidgetScoped'}],
    },
    // Invalid case 2: Dynamic style content not wrapped
    {
      code: `const myDynamicStyles = 'p { font-size: 16px; }';
      const InvalidView2 = (input, output, target) => {
        render(html\`
          <style>\${myDynamicStyles}</style>
        \`, target, {host: input});
      }`,
      filename: 'front_end/components/invalid2.ts',
      errors: [{messageId: 'styleTagMissingWidgetScoped'}],
    },
    // Invalid case 3: Both static and dynamic parts, dynamic part is unscoped
    {
      code: `const myDynamicStyles = 'body { margin: 10px; }';
      const InvalidView3 = (input, output, target) => {
        render(html\`
          <style>
            .some-class { border: 1px solid black; }
            \${myDynamicStyles}
          </style>
        \`, target, {host: input});
      }`,
      filename: 'front_end/components/invalid3.ts',
      errors: [{messageId: 'styleTagMissingWidgetScoped'}],
    },
    // Invalid case 4: Dynamic content with other function call, not widgetScoped
    {
      code: `function getSomeStyles() { return 'a { text-decoration: none; }'; }
      const InvalidView4 = (input, output, target) => {
        render(html\`
          <style>\${getSomeStyles()}</style>
        \`, target, {host: input});
      }`,
      filename: 'front_end/components/invalid4.ts',
      errors: [{messageId: 'styleTagMissingWidgetScoped'}],
    },
    // Invalid case 5: Multiple unscoped style tags in one render call
    {
      code: `const InvalidView5 = (input, output, target) => {
        render(html\`
          <style>div { color: green; }</style>
          <p>Some text</p>
          <style>\${someOtherStyles}</style>
        \`, target, {host: input});
      }`,
      filename: 'front_end/components/invalid5.ts',
      errors: [
        {messageId: 'styleTagMissingWidgetScoped', line: 2},  // For the first style tag
        {messageId: 'styleTagMissingWidgetScoped', line: 5},  // For the second style tag
      ],
    },
    // Invalid case 6: Scoped but then unscoped later in the same style tag
    {
      code: `const InvalidView6 = (input, output, target) => {
        render(html\`
          <style>\${UI.Widget.widgetScoped(scopedStyles)}
            div { background: red; }
          </style>
        \`, target, {host: input});
      }`,
      filename: 'front_end/components/invalid6.ts',
      errors: [{messageId: 'styleTagMissingWidgetScoped'}],
    },
    // Invalid case 7: Unscoped static content with newlines
    {
      code: `const InvalidView7 = (input, output, target) => {
        render(html\`
          <style>
            .foo {
              display: flex;
            }
          </style>
        \`, target, {host: input});
      }`,
      filename: 'front_end/components/invalid7.ts',
      errors: [{messageId: 'styleTagMissingWidgetScoped'}],
    }
  ],
});
