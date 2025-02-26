// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';
const rule = require('../lib/no-commented-out-import.js');

const {RuleTester} = require('./utils/utils.js');

new RuleTester().run('no-commented-out-import', rule, {
  valid: [
    {
      code: 'import * as Platform from "platform.js"',
      filename: 'front_end/components/test.ts',
    },
    {
      code: '// important: foo bar',
      filename: 'front_end/components/test.ts',
    },
    {
      code: '// importSomeFunc()',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: '// import * as Platform from "platform.js"',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundImport'}],
    },
    {
      code: '// import {Foo, Bar} from "platform.js"',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundImport'}],
    },
    {
      code: '// import {type Foo, type Bar} from "platform.js"',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundImport'}],
    },
    {
      code: '// import type * as Platform from "platform.js"',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundImport'}],
    },
  ],
});
