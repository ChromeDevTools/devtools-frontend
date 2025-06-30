// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {AST_NODE_TYPES} from '@typescript-eslint/utils';

import rule from '../lib/enforce-optional-properties-last.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('optional-properties-last', rule, {
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
      // As a TSInterfaceDeclaration it's top-level properties are not linted.
      // But that's fine as clang-format doesn't touch it.
      code: `
export interface LCPBreakdown {
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
          messageId: 'optionalPropertyBeforeRequired',
          type: 'TSPropertySignature' as AST_NODE_TYPES,
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
          messageId: 'optionalPropertyBeforeRequired',
          type: 'TSPropertySignature' as AST_NODE_TYPES,
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

    // Type literals inside an interface are linted.
    {
      code: `
        interface AnotherInvalidType {
          isCool?: boolean;
          isAwesome: boolean;
          job?: string;
          obj: {
            isCool?: boolean;
            isAwesome: boolean;
            job?: string;
          };
        };
      `,
      errors: [
        {
          messageId: 'optionalPropertyBeforeRequired',
          type: 'TSPropertySignature' as AST_NODE_TYPES,
        },
      ],
      output: `
        interface AnotherInvalidType {
          isCool?: boolean;
          isAwesome: boolean;
          job?: string;
          obj: {
            isAwesome: boolean;
            isCool?: boolean;
            job?: string;
          };
        };
      `,
    },
  ],
});
