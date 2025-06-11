// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {veImpression} from './visual-logging-helpers.js';

export function veImpressionForChangesPanel() {
  return veImpression('Panel', 'changes', [
    veImpression('Pane', 'sidebar'),
    veImpression('Section', 'empty-view'),
  ]);
}
