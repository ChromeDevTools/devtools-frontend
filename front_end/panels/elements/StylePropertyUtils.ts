// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';

export function getCssDeclarationAsJavascriptProperty(declaration: SDK.CSSProperty.CSSProperty): string {
  const {name, value} = declaration;
  const declarationNameAsJs =
      name.startsWith('--') ? `'${name}'` : name.replace(/-([a-z])/gi, (_str, group) => group.toUpperCase());
  const declarationAsJs = `'${value.replaceAll('\'', '\\\'')}'`;
  return `${declarationNameAsJs}: ${declarationAsJs}`;
}
