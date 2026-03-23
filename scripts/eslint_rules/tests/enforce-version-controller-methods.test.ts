// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/enforce-version-controller-methods.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('enforce-version-controller-methods', rule, {
  valid: [
    {
      code: `
        export class VersionController {
          static readonly CURRENT_VERSION = 2;
          updateVersionFrom0To1() {}
          updateVersionFrom1To2() {}
        }
      `,
      filename: 'front_end/core/common/VersionController.ts',
    },
    {
      // It should ignore classes without CURRENT_VERSION
      code: `
        export class VersionController {
          updateVersionFrom0To1() {}
        }
      `,
      filename: 'front_end/core/common/VersionController.ts',
    },
    {
      // It should ignore other classes entirely
      code: `
        export class OtherClass {
          static readonly CURRENT_VERSION = 2;
          updateVersionFrom0To1() {}
        }
      `,
      filename: 'front_end/core/common/OtherClass.ts',
    }
  ],
  invalid: [
    {
      code: `
        export class VersionController {
          static readonly CURRENT_VERSION = 2;
          updateVersionFrom0To1() {}
        }
      `,
      filename: 'front_end/core/common/VersionController.ts',
      errors: [
        {
          messageId: 'incorrectMethodCount',
          data: {
            currentVersion: 2,
            methodCount: 1,
          }
        },
      ],
    },
    {
      code: `
        export class VersionController {
          static readonly CURRENT_VERSION = 3;
          updateVersionFrom0To1() {}
          updateVersionFrom2To3() {}
          updateVersionFrom3To4() {}
        }
      `,
      filename: 'front_end/core/common/VersionController.ts',
      errors: [
        {
          messageId: 'nonContiguousMethods',
          data: {
            expectedFrom: 1,
            expectedTo: 2,
          }
        },
      ],
    },
    {
      code: `
        export class VersionController {
          static readonly CURRENT_VERSION = 2;
          updateVersionFrom0To1() {}
          updateVersionFrom1To2() {}
          updateVersionFrom2To3() {}
        }
      `,
      filename: 'front_end/core/common/VersionController.ts',
      errors: [
        {
          messageId: 'incorrectMethodCount',
          data: {
            currentVersion: 2,
            methodCount: 3,
          }
        },
      ],
    },
  ],
});
