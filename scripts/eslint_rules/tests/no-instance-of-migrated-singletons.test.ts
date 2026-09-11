// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-instance-of-migrated-singletons.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-instance-of-migrated-singletons', rule, {
  valid: [
    {
      name: 'allows instance call on unmigrated class',
      code: 'class Foo {} Foo.instance();',
      filename: 'front_end/core/common/SomeFile.ts',
    },
    {
      name: 'allows other method call on migrated class',
      code: 'TargetManager.foo();',
      filename: 'front_end/core/sdk/SomeFile.ts',
    },
  ],
  invalid: [
    {
      name: 'disallows TargetManager.instance()',
      code: 'TargetManager.instance();',
      filename: 'front_end/core/sdk/SomeFile.ts',
      errors: [{messageId: 'noInstanceCall', data: {className: 'TargetManager'}}],
    },
    {
      name: 'disallows SDK.TargetManager.instance()',
      code: 'SDK.TargetManager.instance();',
      filename: 'front_end/core/sdk/SomeFile.ts',
      errors: [{messageId: 'noInstanceCall', data: {className: 'TargetManager'}}],
    },
    {
      name: 'disallows SDK.TargetManager.TargetManager.instance()',
      code: 'SDK.TargetManager.TargetManager.instance();',
      filename: 'front_end/core/sdk/SomeFile.ts',
      errors: [{messageId: 'noInstanceCall', data: {className: 'TargetManager'}}],
    },
    {
      name: 'disallows Common.Console.Console.instance()',
      code: 'Common.Console.Console.instance();',
      filename: 'front_end/core/common/SomeFile.ts',
      errors: [{messageId: 'noInstanceCall', data: {className: 'Console'}}],
    },
    {
      name: 'disallows Settings.instance()',
      code: 'Settings.instance();',
      filename: 'front_end/core/common/SomeFile.ts',
      errors: [{messageId: 'noInstanceCall', data: {className: 'Settings'}}],
    },
  ],
});
