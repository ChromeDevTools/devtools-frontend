
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/enforce-optional-properties-last.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('optional-properties-last', rule, {
  valid: [
    {
      code: `
        type ValidType = {
          name: string;
          age?: number;
        };
      `,
    },
    {
      code: `
        type AnotherValidType = {
          isActive: boolean;
          address?: string;
          email?: string;
        };
      `,
    },
    {
      // As a TSInterfaceDeclaration this isn't targetted by the rule.
      // But that's fine as clang-format doesn't touch it.
      code: `
export interface LCPPhases {
  /**
   * The time between when the user initiates loading the page until when
   * the browser receives the first byte of the html response.
   */
  ttfb: Types.Timing.MilliSeconds;
  /**
   * The time between ttfb and the LCP resource request being started.
   * For a text LCP, this is undefined given no resource is loaded.
   */
  loadDelay?: Types.Timing.MilliSeconds;
  /**
   * The time it takes to load the LCP resource.
   */
  loadTime?: Types.Timing.MilliSeconds;
  /**
   * The time between when the LCP resource finishes loading and when
   * the LCP element is rendered.
   */
  renderDelay: Types.Timing.MilliSeconds;
}
      `,
    },
  ],

  invalid: [
    {
      code: `
        type InvalidType = {
          name?: string;
          age: number;
        };
      `,
      errors: [
        {
          message: 'Optional property \'name\' should be defined after required properties.',
          type: 'TSPropertySignature'
        },
      ],
      output: `
        type InvalidType = {
          age: number;
          name?: string;
        };
      `,
    },
    {
      code: `
        type AnotherInvalidType = {
          isCool?: boolean;
          isAwesome: boolean;
          job?: string;
        };
      `,
      errors: [
        {
          message: 'Optional property \'isCool\' should be defined after required properties.',
          type: 'TSPropertySignature'
        },
      ],
      output: `
        type AnotherInvalidType = {
          isAwesome: boolean;
          isCool?: boolean;
          job?: string;
        };
      `,
    },
  ],
});
