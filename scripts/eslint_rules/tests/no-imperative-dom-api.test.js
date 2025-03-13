// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';
const rule = require('../lib/no-imperative-dom-api.js');

const {RuleTester} = require('./utils/utils.js');

new RuleTester().run('no-imperative-dom-api', rule, {
  valid: [
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `class SomeWidget extends UI.Widget.Widget {
          constructor() {
            super();
            this.element.className = 'some-class';
          }
      }`,
    },
  ],

  invalid: [
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.contentElement.appendChild(document.createElement('div'));
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div>
      <div>
      </div>
    </div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
    {
      filename: 'front_end/ui/components/component/file.ts',
      code: `
class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
    this.contentElement.className = 'some-class';
    this.contentElement.setAttribute('aria-label', 'some-label');
    this.contentElement.textContent = 'some-text';
  }
}`,
      output: `

export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`
    <div class="some-class" aria-label="some-label">some-text</div>\`,
    target, {host: input});
};

class SomeWidget extends UI.Widget.Widget {
  constructor() {
    super();
  }
}`,
      errors: [{messageId: 'preferTemplateLiterals'}],
    },
  ],
});
