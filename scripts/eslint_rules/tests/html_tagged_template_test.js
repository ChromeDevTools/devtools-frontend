// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/html_tagged_template.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
});

const error = {
  message: 'Use unqualified html tagged template for compatibility with lit-analyzer'
};

ruleTester.run('html_tagged_template', rule, {
  valid: [
    {
      code: `import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

      const {html} = LitHtml;

      function render() {
        LitHtml.render(
            html\`<div></div>\`,
            this.shadow, {host: this});
      }
      `,
    },
  ],
  invalid: [
    {
      code: `import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

      function render() {
        LitHtml.render(
            LitHtml.html\`<div></div>\`,
            this.shadow, {host: this});
      }

      function render2() {
        LitHtml.render(
            LitHtml.html\`<div></div>\`,
            this.shadow, {host: this});
      }`,
      errors: [error, error],
      output: `import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

const {html} = LitHtml;

      function render() {
        LitHtml.render(
            html\`<div></div>\`,
            this.shadow, {host: this});
      }

      function render2() {
        LitHtml.render(
            html\`<div></div>\`,
            this.shadow, {host: this});
      }`,
    },
    {
      code: `import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

      const {html} = LitHtml;

      function render() {
        LitHtml.render(
            html\`<div></div>\`,
            this.shadow, {host: this});
      }

      function render2() {
        LitHtml.render(
            LitHtml.html\`<div></div>\`,
            this.shadow, {host: this});
      }`,
      errors: [error],
      output: `import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

      const {html} = LitHtml;

      function render() {
        LitHtml.render(
            html\`<div></div>\`,
            this.shadow, {host: this});
      }

      function render2() {
        LitHtml.render(
            html\`<div></div>\`,
            this.shadow, {host: this});
      }`,
    },
  ]
});
