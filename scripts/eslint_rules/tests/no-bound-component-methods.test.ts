// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/no-bound-component-methods.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-bound-component-methods', rule, {
  valid: [
    {
      name: 'allows bound methods on non-HTMLElement classes',
      code: `export class FeedbackButton extends SomeOtherNonElementThing {
  readonly #boundClick = this.onClick.bind(this);
}`,
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows bound render method on HTMLElement',
      code: `export class FeedbackButton extends HTMLElement {
  readonly #boundRender = this.render.bind(this);
  private readonly shadow = this.attachShadow({mode: 'open'});
  private frame?: SDK.ResourceTreeModel.ResourceTreeFrame;
}`,
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows private hash bound method for global window event listener',
      code: `export class FeedbackButton extends HTMLElement {
  readonly #boundRender = this.render.bind(this);
  #globalBoundThing = this.someEvent.bind(this);
  private readonly shadow = this.attachShadow({mode: 'open'});

  constructor() {
    window.addEventListener('click', this.#globalBoundThing);
  }
}`,
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows private bound method for global window event listener',
      code: `export class FeedbackButton extends HTMLElement {
  readonly #boundRender = this.render.bind(this);
  private globalBoundThing = this.someEvent.bind(this);
  private readonly shadow = this.attachShadow({mode: 'open'});

  constructor() {
    window.addEventListener('click', this.globalBoundThing);
  }
}`,
      filename: 'front_end/components/test.ts',
    },
    {
      // Incomplete listener, treat it as valid to not cause noise to developer in the middle of them typing!
      name: 'ignores incomplete addEventListener call',
      code: `export class FeedbackButton extends HTMLElement {
  constructor() {
    window.addEventListener('click');
  }
}`,
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      name: 'disallows private hash bound method for non-render method',
      code: `export class FeedbackButton extends HTMLElement {
  static readonly litTagName = Lit.literal\`devtools-feedback-button\`;
  readonly #boundRender = this.render.bind(this);
  readonly #boundClick = this.onClick.bind(this);
}`,
      filename: 'front_end/components/test.ts',
      errors: [
        {
          messageId: 'nonRenderBindFound',
          data: {componentName: 'FeedbackButton', methodName: 'onClick'},
        },
      ],
    },
    {
      name: 'disallows private bound method for non-render method',
      code: `export class FeedbackButton extends HTMLElement {
  static readonly litTagName = Lit.literal\`devtools-feedback-button\`;
  private readonly boundClick = this.onClick.bind(this);
}`,
      filename: 'front_end/components/test.ts',
      errors: [
        {
          messageId: 'nonRenderBindFound',
          data: {componentName: 'FeedbackButton', methodName: 'onClick'},
        },
      ],
    },
    {
      name: 'disallows bound method not used in window event listener',
      code: `export class FeedbackButton extends HTMLElement {
  static readonly litTagName = Lit.literal\`devtools-feedback-button\`;
  private readonly boundClick = this.onClick.bind(this);
  private readonly boundFocus = this.onFocus.bind(this);

  constructor() {
    this.addEventListener('click', this.boundClick);
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [
        {
          messageId: 'nonRenderBindFound',
          data: {componentName: 'FeedbackButton', methodName: 'onFocus'},
        },
      ],
    },
  ],
});
