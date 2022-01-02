// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/check_license_header.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

const CURRENT_YEAR = new Date().getFullYear();

ruleTester.run('check_license_header', rule, {
  valid: [
    {
      code: '',
      filename: 'front_end/empty.js',
    },
    {
      code: `
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Action from './Action.js';
`,
      filename: 'front_end/ui/ui.js',
    },
    {
      code: `
/*
* Copyright (C) 2014 Google Inc. All rights reserved.
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions are
* met:
*
*     * Redistributions of source code must retain the above copyright
* notice, this list of conditions and the following disclaimer.
*     * Redistributions in binary form must reproduce the above
* copyright notice, this list of conditions and the following disclaimer
* in the documentation and/or other materials provided with the
* distribution.
*     * Neither the name of Google Inc. nor the names of its
* contributors may be used to endorse or promote products derived from
* this software without specific prior written permission.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
* "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
* LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
* A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
* OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
* SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
* LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
* DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
* THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
* (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
* OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
const _loadedScripts = {};
`,
      filename: 'front_end/RuntimeInstantiator.js',
    },
    {
      code: `
/*
 * Copyright (C) 2009, 2010 Google Inc. All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
`,
      filename: 'front_end/sdk/DOMModel.js',
    },
    {
      filename: 'scripts/test_runner.js',
      code: `#!/usr/bin/env node

// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function main() {}
main()
`
    }
  ],

  invalid: [
    {
      code: 'import * as Action from \'./Action.js\';',
      filename: 'front_end/ui/ui.js',
      errors: [{message: 'Missing license header'}],
      output: `// Copyright ${CURRENT_YEAR} The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Action from './Action.js';`,
    },
    {
      code: `
// Copyright incorrect header

import * as Action from './Action.js';
`,
      filename: 'front_end/ui/ui.js',
      errors: [{message: 'Incorrect line license header'}],
      output: `
// Copyright ${CURRENT_YEAR} The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Copyright incorrect header

import * as Action from './Action.js';
`,
    },
    {
      code: `// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be found in the LICENSE file.

(async function() {})();`,
      filename: 'test/webtests/http/tests/devtools/a11y-axe-core/sources/call-stack-a11y-test.js',
      errors: [{message: 'Incorrect line license header'}],
      output: `// Copyright ${CURRENT_YEAR} The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be found in the LICENSE file.

(async function() {})();`
    },
    {
      code: `
// Copyright 2020 The Chromium Authors. All rights reserved.
//
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Action from './Action.js';
`,
      filename: 'front_end/ui/ui.js',
      errors: [{message: 'Incorrect line license header'}],
      output: `
// Copyright ${CURRENT_YEAR} The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Copyright 2020 The Chromium Authors. All rights reserved.
//
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Action from './Action.js';
`,
    },
    {
      code: `
/*
 * Some other comment
 */

import * as Action from './Action.js';
`,
      filename: 'front_end/ui/ui.js',
      errors: [{message: 'Incorrect block license header'}],
      output: `
// Copyright ${CURRENT_YEAR} The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Some other comment
 */

import * as Action from './Action.js';
`,
    },
    {
      code: `
interface StringConstructor {
  sprintf(format: string, ...var_arg: any): string;
  hashCode(id: string): number;
}

interface Array<T> {
  peekLast(): T | undefined;
  lowerBound(object: T, comparator: {(a:T, b:T):number}): number;
}

// Type alias for the Closure-supported ITemplateArray which is equivalent
// to TemplateStringsArray in TypeScript land
type ITemplateArray = TemplateStringsArray

interface String {
  trimEndWithMaxLength(maxLength: number): string;
}
`,
      filename: 'front_end/legacy/legacy-defs.d.ts',
      errors: [{message: 'Missing license header'}],
      output: `
// Copyright ${CURRENT_YEAR} The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

interface StringConstructor {
  sprintf(format: string, ...var_arg: any): string;
  hashCode(id: string): number;
}

interface Array<T> {
  peekLast(): T | undefined;
  lowerBound(object: T, comparator: {(a:T, b:T):number}): number;
}

// Type alias for the Closure-supported ITemplateArray which is equivalent
// to TemplateStringsArray in TypeScript land
type ITemplateArray = TemplateStringsArray

interface String {
  trimEndWithMaxLength(maxLength: number): string;
}
`,
    },
    {
      filename: 'scripts/test_runner.js',
      code: `#!/usr/bin/env node

function main() {}
main()
`,
      errors: [{message: 'Missing license header'}],
      output: `#!/usr/bin/env node

// Copyright ${CURRENT_YEAR} The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function main() {}
main()
`
    },
    {
      filename: 'scripts/test_runner.js',
      code: `#!/usr/bin/env node

// Copyright 2021 The WRONG Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
function main() {}
main()
`,
      errors: [{message: 'Incorrect line license header'}],
      output: `#!/usr/bin/env node

// Copyright ${CURRENT_YEAR} The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Copyright 2021 The WRONG Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
function main() {}
main()
`
    }
  ]
});
