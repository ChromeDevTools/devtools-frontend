// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/set-data-type-reference.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('set-data-type-reference', rule, {
  valid: [
    {
      name: 'allows typed data setter on HTMLElement subclass',
      code: `class Foo extends HTMLElement {
        set data(data: FooData) {}
      }`,
      filename: 'front_end/common/foo.ts',
    },
    {
      // Outside of a component anything goes
      name: 'allows untyped data setter outside HTMLElement class',
      code: `class Foo {
        set data(data) {}
      }`,
      filename: 'front_end/common/foo.ts',
    },
  ],

  invalid: [
    {
      name: 'disallows untyped parameter on HTMLElement data setter',
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
      name: 'disallows data setter with no parameters on HTMLElement',
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
      name: 'disallows inline literal type for HTMLElement data setter',
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
