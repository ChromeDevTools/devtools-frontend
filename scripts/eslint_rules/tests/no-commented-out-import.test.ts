// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/no-commented-out-import.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-commented-out-import', rule, {
  valid: [
    {
      name: 'allows uncommented import',
      code: 'import * as Platform from "platform.js"',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows comment starting with important',
      code: '// important: foo bar',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows comment with importSomeFunc call',
      code: '// importSomeFunc()',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      name: 'disallows commented namespace import',
      code: '// import * as Platform from "platform.js"',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundImport'}],
    },
    {
      name: 'disallows commented named import',
      code: '// import {Foo, Bar} from "platform.js"',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundImport'}],
    },
    {
      name: 'disallows commented inline type import',
      code: '// import {type Foo, type Bar} from "platform.js"',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundImport'}],
    },
    {
      name: 'disallows commented type namespace import',
      code: '// import type * as Platform from "platform.js"',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundImport'}],
    },
  ],
});
