// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/html-tagged-template.ts';

import {RuleTester} from './utils/RuleTester.ts';

const error = {
  messageId: 'useUnqualifiedHtmlTaggedTemplate',
} as const;

new RuleTester().run('html-tagged-template', rule, {
  valid: [
    {
      name: 'allows unqualified html import from lit',
      code: `import {html, render} from '../../ui/lit/lit.js';

      function render() {
        render(
            html\`<div></div>\`,
            this.shadow, {host: this});
      }
      `,
    },
    {
      name: 'allows destructured html from Lit namespace',
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
      name: 'disallows multiple Lit.html usages and adds destructured import',
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
      name: 'disallows Lit.html when html is already destructured',
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
