// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ESLintUtils, type TSESTree} from '@typescript-eslint/utils';

type SingleSpecifier = [TSESTree.ImportNamespaceSpecifier];
/**
 * Checks if the import specifiers represent a namespace import (`import * as Name`).
 */
export function isStarAsImportSpecifier(specifiers: TSESTree.ImportClause[]): specifiers is SingleSpecifier {
  return specifiers.length === 1 && specifiers[0].type === 'ImportNamespaceSpecifier';
}

export interface ExtraDocs {
  requiresTypeChecking?: boolean;
  category?: string;
}

const LINK_BASE =
    'https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/scripts/eslint_rules/lib';
export const createRule = ESLintUtils.RuleCreator<ExtraDocs>(
    name => `${LINK_BASE}/${name}.ts`,
);
