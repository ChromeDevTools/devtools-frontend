// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ts from 'typescript';

import {WalkerState} from './walk_tree.js';

export const findNodeForTypeReferenceName = (state: WalkerState, typeReferenceName: string): ts.InterfaceDeclaration|
                                            ts.TypeAliasDeclaration|ts.EnumDeclaration|null => {
  const matchingNode = [...state.foundInterfaces, ...state.foundEnums].find(dec => {
    return dec.name.escapedText === typeReferenceName;
  });

  return matchingNode || null;
};
