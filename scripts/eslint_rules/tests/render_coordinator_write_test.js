// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/render_coordinator_write.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('render_coordinator_write', rule, {
  valid: [
    {
      code: `class Foo extends HTMLElement {
        render() {
          coordinator.write(() => {
            LitHtml.render(LitHtml.html\`<p>hello world</p>\`, this.shadow);
          })
        }
      }`,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `export async function helper() {
        return coordinator.write(() => LitHtml.render(LitHtml.html\`<span>foo</span>\`, someElement));
      }`,
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: `class Foo extends HTMLElement {
        render() {
          LitHtml.render(LitHtml.html\`<p>hello world</p>\`, this.shadow);
        }
      }`,
      filename: 'front_end/components/test.ts',
      errors: [{
        message:
            'LitHtml.render calls must be wrapped in a coordinator.write callback, where coordinator is an instance of RenderCoordinator (front_end/render_coordinator).'
      }]
    },
    {
      code: `export function helper() {
        return LitHtml.render(LitHtml.html\`<span>foo</span>\`, someElement);
      }`,
      filename: 'front_end/components/test.ts',
      errors: [{
        message:
            'LitHtml.render calls must be wrapped in a coordinator.write callback, where coordinator is an instance of RenderCoordinator (front_end/render_coordinator).'
      }]
    },
  ]
});
