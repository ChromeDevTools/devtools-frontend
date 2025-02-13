// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const tsParser = require('@typescript-eslint/parser');
const eslint = require('eslint');

/**
 * The eslint-plugin-eslint-plugin expects a newly created class
 * with this name, emulate it so the rules run correctly
 * Also provides the default values that are expected
 */
class RuleTester extends eslint.RuleTester {
  /**
   * @param {import(eslint).Linter.Config} config
   */
  constructor(config = {}) {
    super({
      ...config,
      languageOptions: {
        ...config.languageOptions,
        ecmaVersion: 'latest',
        sourceType: 'module',
        parser: tsParser,
      },
    });
  }
}

module.exports = {
  RuleTester,
};
