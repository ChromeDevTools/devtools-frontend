// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

type SingleSpecifier = [TSESTree.ImportNamespaceSpecifier];
/**
 * Checks if the import specifiers represent a namespace import (`import * as Name`).
 */
export function isStarAsImportSpecifier(specifiers: TSESTree.ImportClause[]): specifiers is SingleSpecifier {
  return specifiers.length === 1 && specifiers[0].type === 'ImportNamespaceSpecifier';
}
