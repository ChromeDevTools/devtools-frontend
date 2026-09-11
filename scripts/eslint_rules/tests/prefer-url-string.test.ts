// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/prefer-url-string.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('prefer-url-string', rule, {
  valid: [
    {
      name: 'allows RawPathString type assertion',
      code: 'assert.isOk(foo as Platform.DevTools.RawPathString);',
    },
    {
      name: 'allows EncodedPathString type assertion',
      code: 'assert.isOk(foo as Platform.DevTools.EncodedPathString);',
    },
    {
      name: 'allows urlString tagged template',
      code: `import * as Platform from './platform.js';

const {urlString} = Platform.DevToolsPath;

it('test', () => {
  assert.strictEqual('http://foo', urlString\`http://foo\`);
});`,
    },
  ],

  invalid: [
    {
      name: 'disallows UrlString assertion with literal string',
      code: `import type * as Platform from './platform.js';

it('test', () => {
  assertIsUrl('http://foo' as Platform.DevToolsPath.UrlString);
});`,
      output: `import * as Platform from './platform.js';

const {urlString} = Platform.DevToolsPath;

it('test', () => {
  assertIsUrl(urlString\`http://foo\`);
});`,
      errors: [
        {
          messageId: 'useUrlString',
        },
      ],
    },
    {
      name: 'disallows UrlString assertion with string concatenation',
      code: `import type * as Platform from './platform.js';

it('test', () => {
  assertIsUrl(('http://' + host) as Platform.DevToolsPath.UrlString);
});`,
      output: `import * as Platform from './platform.js';

const {urlString} = Platform.DevToolsPath;

it('test', () => {
  assertIsUrl(urlString\`\${'http://' + host}\`);
});`,
      errors: [
        {
          messageId: 'useUrlString',
        },
      ],
    },
    {
      name: 'disallows UrlString assertion with variable in function',
      code: `import type * as Platform from './platform.js';

function assertEqualUrlStringString(actual: Platform.DevToolsPath.UrlString|null, expected: string, message?: string) {
  assert.strictEqual(actual, expected as Platform.DevToolsPath.UrlString, message);
}`,
      output: `import * as Platform from './platform.js';

const {urlString} = Platform.DevToolsPath;

function assertEqualUrlStringString(actual: Platform.DevToolsPath.UrlString|null, expected: string, message?: string) {
  assert.strictEqual(actual, urlString\`\${expected}\`, message);
}`,
      errors: [
        {
          messageId: 'useUrlString',
        },
      ],
    },
  ],
});
