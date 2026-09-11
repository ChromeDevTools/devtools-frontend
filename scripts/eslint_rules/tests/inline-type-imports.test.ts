// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/inline-type-imports.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('inline-type-imports', rule, {
  valid: [
    {
      name: 'allows side-effect import',
      code: 'import \'./foo.js\'',
    },
    {
      name: 'allows type namespace import',
      code: 'import type * as Foo from \'./foo.js\'',
    },
    {
      name: 'allows value namespace import',
      code: 'import * as Foo from \'./foo.js\'',
    },
    {
      name: 'allows default value import',
      code: 'import Foo from \'./foo.js\'',
    },
    {
      name: 'allows default type import',
      code: 'import type Foo from \'./foo.js\'',
    },
    {
      name: 'allows single named type import statement',
      code: 'import type {Foo} from \'./foo.js\'',
    },
    {
      name: 'allows single aliased named type import statement',
      code: 'import type {Foo as Foo2} from \'./foo.js\'',
    },
    {
      name: 'allows mixed value and inline type import in single statement',
      code: 'import {SomeValue, type Foo as Foo2} from \'./foo.js\'',
    },
    {
      name: 'allows multiple named type imports in type import statement',
      code: 'import type {Bar, Foo as Foo2} from \'./foo.js\'',
    },
  ],
  invalid: [
    {
      name: 'disallows separate type import and value import from same module',
      code: `import type {AType} from './foo.js';
  import {AValue} from './foo.js';`,
      output: `
  import {AValue, type AType} from './foo.js';`,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'inlineTypeImport'}],
    },
    {
      name: 'disallows duplicate module import with unrelated third type import',
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
      name: 'disallows duplicate module import with unrelated third value import',
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
      name: 'disallows separate aliased type import from same module',
      code: `import {SomeValue} from './foo.js';
import type {Foo as Bar} from './foo.js';`,
      output: 'import {SomeValue, type Foo as Bar} from \'./foo.js\';\n',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'inlineTypeImport'}],
    },
    {
      name: 'disallows separate multiple type imports from same module',
      code: `import {SomeValue} from './foo.js';
import type {Foo as Bar, Baz} from './foo.js';`,
      output: 'import {SomeValue, type Foo as Bar, type Baz} from \'./foo.js\';\n',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'inlineTypeImport'}],
    },
  ],
});
