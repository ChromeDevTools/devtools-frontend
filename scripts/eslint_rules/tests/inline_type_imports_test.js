// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/inline_type_imports.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('inline_type_imports', rule, {
  valid: [
    {
      code: 'import \'./foo.js\'',
    },
    {
      code: 'import type * as Foo from \'./foo.js\'',
    },
    {
      code: 'import * as Foo from \'./foo.js\'',
    },
    {
      code: 'import Foo from \'./foo.js\'',
    },
    {
      code: 'import type Foo from \'./foo.js\'',
    },
    {
      code: 'import type {Foo} from \'./foo.js\'',
    },
    {
      code: 'import type {Foo as Foo2} from \'./foo.js\'',
    },
    {
      code: 'import {SomeValue, type Foo as Foo2} from \'./foo.js\'',
    },
    {
      code: 'import type {Bar, Foo as Foo2} from \'./foo.js\'',
    },
  ],
  invalid: [
    {
      code: `import type {AType} from './foo.js';
  import {AValue} from './foo.js';`,
      output: `
  import {AValue, type AType} from './foo.js';`,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'inlineTypeImport'}],
    },
    {
      code: `import type {AType} from './foo.js';
  import {AValue} from './foo.js';
  import type {Foo} from './blah.js'`,
      output: `
  import {AValue, type AType} from './foo.js';
  import type {Foo} from './blah.js'`,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'inlineTypeImport'}],
    },
    {
      code: `import type {AType} from './foo.js';
  import {AValue} from './foo.js';
  import {Foo} from './blah.js'`,
      output: `
  import {AValue, type AType} from './foo.js';
  import {Foo} from './blah.js'`,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'inlineTypeImport'}],
    },
    {
      code: `import {SomeValue} from './foo.js';
import type {Foo as Bar} from './foo.js';`,
      output: 'import {SomeValue, type Foo as Bar} from \'./foo.js\';\n',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'inlineTypeImport'}],
    },
    {
      code: `import {SomeValue} from './foo.js';
import type {Foo as Bar, Baz} from './foo.js';`,
      output: 'import {SomeValue, type Foo as Bar, type Baz} from \'./foo.js\';\n',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'inlineTypeImport'}],
    },
  ]
});
