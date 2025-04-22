// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ESLintUtils} from '@typescript-eslint/utils';

export interface ExtraDocs {
  requiresTypeChecking?: boolean;
  category?: string;
}

const LINK_BASE =
    'https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/scripts/eslint_rules/lib';
export const createRule = ESLintUtils.RuleCreator<ExtraDocs>(
    name => `${LINK_BASE}/${name}.ts`,
);
