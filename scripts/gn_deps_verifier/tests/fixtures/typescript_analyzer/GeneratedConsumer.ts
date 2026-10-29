// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Untracked.js is an output of the build that no BUILD.gn declares as a
// generated source. Properties.js is written by generated/BUILD.gn into the
// gen dir and is not in the source tree either.
import './Untracked.js';

import * as Properties from './generated/Properties.js';

export const consumer = Properties;
