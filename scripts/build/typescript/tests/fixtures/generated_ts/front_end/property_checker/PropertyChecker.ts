// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as GeneratedMapping from '../generated/properties-mapping.js';
import * as Generated from '../generated/Properties.js';

export type PropertyName = keyof GeneratedMapping.PropertyMapping;

export function isProperty(name: string): name is PropertyName {
  return Generated.PROPERTIES.includes(name);
}
