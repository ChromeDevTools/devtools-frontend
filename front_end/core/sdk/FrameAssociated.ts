// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {PageResourceLoadInitiator} from './PageResourceLoader.js';
import type {DebugId} from './SourceMap.js';

export interface FrameAssociated {
  createPageResourceLoadInitiator(): PageResourceLoadInitiator;
  debugId(): DebugId|null;
}
