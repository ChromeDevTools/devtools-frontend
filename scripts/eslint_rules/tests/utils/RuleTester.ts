// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import tsParser from '@typescript-eslint/parser';
import {RuleTester} from '@typescript-eslint/rule-tester';

// Add the mocha hooks to the rule tester.
RuleTester.afterAll = after;

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
