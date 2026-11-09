// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import tsParser from '@typescript-eslint/parser';
import {RuleTester} from '@typescript-eslint/rule-tester';
import {after, describe, it} from 'mocha';

// Add the mocha functions to the rule tester. The test runner does not expose
// them as globals (see test/scripts/run_mocha.ts), which RuleTester otherwise
// falls back to.
RuleTester.afterAll = after;
RuleTester.describe = describe;
RuleTester.describeSkip = describe.skip;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.itSkip = it.skip;

/**
 * Provide this when you have a rule that needs to use TypeScript
 * typechecking resolutions in EsLint rule.
 */
const typeCheckingOptions = {
  languageOptions: {
    ecmaVersion: 'latest' as const,
    sourceType: 'module' as const,
    parser: tsParser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts'],
      },
    },
  },
};

export {RuleTester, typeCheckingOptions};
