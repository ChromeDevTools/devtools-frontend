// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-empty-view-output.ts';

import {RuleTester, typeCheckingOptions} from './utils/RuleTester.ts';

new RuleTester(typeCheckingOptions).run('no-empty-view-output', rule, {
  valid: [
    {
      name: 'allows view function type with undefined output and undefined argument in view call',
      code: `type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
class MyWidget extends UI.Widget.Widget {
  #view: View;
  performUpdate(): void {
    this.#view(input, undefined, this.contentElement);
  }
}`,
    },
    {
      name: 'allows non-empty ViewOutput interface and variable argument in view call',
      code: `interface ViewOutput { focus: () => void; }
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
class MyWidget extends UI.Widget.Widget {
  #view: View;
  performUpdate(): void {
    const output: ViewOutput = {focus: () => {}};
    this.#view(input, output, this.contentElement);
  }
}`,
    },
    {
      name: 'allows passing this.#viewOutput field as second argument',
      code: `interface ViewOutput { focusInput?: () => void; }
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
class MyWidget extends UI.Widget.Widget {
  #view: View;
  #viewOutput: ViewOutput = {};
  performUpdate(): void {
    this.#view(input, this.#viewOutput, this.contentElement);
  }
}`,
    },
    {
      name: 'allows passing {} to a view function when a non-empty ViewOutput is defined',
      code: `interface ViewOutput { focusInput?: () => void; }
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
class MyWidget extends UI.Widget.Widget {
  #view: View;
  clear(): void {
    this.#view(emptyInput, {}, this.contentElement);
  }
}`,
    },
    {
      name: 'allows passing {} to a typed view function whose output type is not named *ViewOutput',
      code: `interface CustomOutput { focusInput?: () => void; }
type View = (input: ViewInput, output: CustomOutput, target: HTMLElement) => void;
class MyWidget extends UI.Widget.Widget {
  #view: View;
  clear(): void {
    this.#view(emptyInput, {}, this.contentElement);
  }
}`,
    },
    {
      name: 'allows Record<string, unknown> as View output parameter type',
      code: 'export type View = (input: ViewInput, output: Record<string, unknown>, target: HTMLElement) => void;',
    },
    {
      name: 'ignores non-void function types that happen to have view-like parameter names',
      code: 'export type Formatter = (input: string, output: object, target: HTMLElement) => string;',
    },
  ],
  invalid: [
    {
      name: 'disallows typing View output parameter as object',
      code: 'export type View = (input: ViewInput, output: object, target: HTMLElement) => void;',
      errors: [
        {messageId: 'noEmptyViewOutputType'},
      ],
      output: 'export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;',
    },
    {
      name: 'disallows typing View output parameter as empty type literal {}',
      code: 'export type View = (input: ViewInput, output: {}, target: HTMLElement) => void;',
      errors: [
        {messageId: 'noEmptyViewOutputType'},
      ],
      output: 'export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;',
    },
    {
      name: 'disallows typing View output parameter as Record<string, never>',
      code: 'export type View = (input: ViewInput, output: Record<string, never>, target: HTMLElement) => void;',
      errors: [
        {messageId: 'noEmptyViewOutputType'},
      ],
      output: 'export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;',
    },
    {
      name: 'disallows typing View output parameter with an empty ViewOutput interface in the same file',
      code: `interface ViewOutput {}
export type View = (input: ViewInput, _output: ViewOutput, target: HTMLElement) => void;`,
      errors: [
        {messageId: 'noEmptyViewOutputType'},
      ],
      output: `interface ViewOutput {}
export type View = (input: ViewInput, _output: undefined, target: HTMLElement) => void;`,
    },
    {
      name: 'disallows passing {} as output argument to this.#view(...)',
      code: 'this.#view({authoringHint: this.#authoringHint}, {}, this.contentElement);',
      errors: [
        {messageId: 'noEmptyViewOutputArgument'},
      ],
      output: 'this.#view({authoringHint: this.#authoringHint}, undefined, this.contentElement);',
    },
    {
      name: 'disallows passing {} as output argument to DEFAULT_VIEW(...)',
      code: 'DEFAULT_VIEW(input, {}, target);',
      errors: [
        {messageId: 'noEmptyViewOutputArgument'},
      ],
      output: 'DEFAULT_VIEW(input, undefined, target);',
    },
    {
      name: 'disallows passing {} to a view taking undefined even when another non-empty ViewOutput exists in the file',
      code: `interface FirstViewOutput { focusInput?: () => void; }
type SecondView = (input: ViewInput, output: undefined, target: HTMLElement) => void;
class SecondWidget extends UI.Widget.Widget {
  #view: SecondView;
  performUpdate(): void {
    this.#view(input, {}, this.contentElement);
  }
}`,
      errors: [
        {messageId: 'noEmptyViewOutputArgument'},
      ],
      output: `interface FirstViewOutput { focusInput?: () => void; }
type SecondView = (input: ViewInput, output: undefined, target: HTMLElement) => void;
class SecondWidget extends UI.Widget.Widget {
  #view: SecondView;
  performUpdate(): void {
    this.#view(input, undefined, this.contentElement);
  }
}`,
    },
  ],
});
