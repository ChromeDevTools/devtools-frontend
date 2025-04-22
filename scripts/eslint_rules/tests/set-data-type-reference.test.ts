// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/set-data-type-reference.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('set-data-type-reference', rule, {
  valid: [
    {
      code: `class Foo extends HTMLElement {
        set data(data: FooData) {}
      }`,
      filename: 'front_end/common/foo.ts',
    },
    {
      // Outside of a component anything goes
      code: `class Foo {
        set data(data) {}
      }`,
      filename: 'front_end/common/foo.ts',
    },
  ],

  invalid: [
    {
      code: `class Foo extends HTMLElement {
        set data(data) {}
      }`,
      filename: 'front_end/common/foo.ts',
      errors: [
        {
          messageId: 'dataSetterParamTypeMustBeDefined',
        },
      ],
    },
    {
      code: `class Foo extends HTMLElement {
        set data() {}
      }`,
      filename: 'front_end/common/foo.ts',
      errors: [
        {
          messageId: 'dataSetterMustTakeExplicitlyTypedParameter',
        },
      ],
    },
    {
      code: `class Foo extends HTMLElement {
        set data(data: {some: 'literal'}) {}
      }`,
      filename: 'front_end/common/foo.ts',
      errors: [
        {
          messageId: 'dataSetterParamTypeMustBeTypeReference',
        },
      ],
    },
  ],
});
