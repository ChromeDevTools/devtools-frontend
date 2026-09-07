// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as PrebuiltLib from '../../third_party/prebuilt_lib/prebuilt_lib.js';

export function renderPanel(): string {
  const opt: PrebuiltLib.Lib.LibOptions = {name: 'DevTools'};
  return PrebuiltLib.Lib.formatName(opt);
}
