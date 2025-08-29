// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as Workspace from '../workspace/workspace.js';

export interface StackTrace extends Common.EventTarget.EventTarget<EventTypes> {
  readonly syncFragment: Fragment;
  readonly asyncFragments: readonly AsyncFragment[];
}

export interface Fragment {
  readonly frames: readonly Frame[];
}

export interface AsyncFragment extends Fragment {
  readonly description: string;
}

export interface Frame {
  readonly url?: string;
  readonly uiSourceCode?: Workspace.UISourceCode.UISourceCode;
  readonly name?: string;
  readonly line: number;
  readonly column: number;
}

export const enum Events {
  UPDATED = 'UPDATED',
}

export interface EventTypes {
  [Events.UPDATED]: void;
}
