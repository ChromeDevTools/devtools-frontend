// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/html-tagged-template.js');

const {ruleTester} = require('./utils/utils.js');

const error = {
  message: 'Use unqualified html tagged template for compatibility with lit-analyzer',
};

ruleTester.run('html-tagged-template', rule, {
  valid: [
    {
      code: `import * as Lit from '../../../../ui/lit/lit.js';

      const {html} = Lit;

      function render() {
        Lit.render(
            html\`<div></div>\`,
            this.shadow, {host: this});
      }
      `,
    },
  ],
  invalid: [
    {
      code: `import * as Lit from '../../../../ui/lit/lit.js';

      function render() {
        Lit.render(
            Lit.html\`<div></div>\`,
            this.shadow, {host: this});
      }

      function render2() {
        Lit.render(
            Lit.html\`<div></div>\`,
            this.shadow, {host: this});
      }`,
      errors: [error, error],
      output: `import * as Lit from '../../../../ui/lit/lit.js';

const {html} = Lit;

      function render() {
        Lit.render(
            html\`<div></div>\`,
            this.shadow, {host: this});
      }

      function render2() {
        Lit.render(
            html\`<div></div>\`,
            this.shadow, {host: this});
      }`,
    },
    {
      code: `import * as Lit from '../../../../ui/lit/lit.js';

      const {html} = Lit;

      function render() {
        Lit.render(
            html\`<div></div>\`,
            this.shadow, {host: this});
      }

      function render2() {
        Lit.render(
            Lit.html\`<div></div>\`,
            this.shadow, {host: this});
      }`,
      errors: [error],
      output: `import * as Lit from '../../../../ui/lit/lit.js';

      const {html} = Lit;

      function render() {
        Lit.render(
            html\`<div></div>\`,
            this.shadow, {host: this});
      }

      function render2() {
        Lit.render(
            html\`<div></div>\`,
            this.shadow, {host: this});
      }`,
    },
  ],
});
