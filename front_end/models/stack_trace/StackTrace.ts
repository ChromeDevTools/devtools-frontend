// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Workspace from '../workspace/workspace.js';

export type StackTrace = BaseStackTrace<Fragment>;
export type DebuggableStackTrace = BaseStackTrace<DebuggableFragment>;

export interface BaseStackTrace<SyncFragmentT extends Fragment> extends Common.EventTarget.EventTarget<EventTypes> {
  readonly syncFragment: SyncFragmentT;
  readonly asyncFragments: readonly AsyncFragment[];
}

export interface Fragment {
  readonly frames: readonly Frame[];
}

export interface AsyncFragment extends Fragment {
  readonly description: string;
}

export interface DebuggableFragment {
  readonly frames: readonly DebuggableFrame[];
}

export interface Frame {
  readonly url?: string;
  readonly uiSourceCode?: Workspace.UISourceCode.UISourceCode;
  readonly name?: string;
  readonly line: number;
  readonly column: number;

  readonly missingDebugInfo?: MissingDebugInfo;
}

export interface DebuggableFrame extends Frame {
  readonly sdkFrame: SDK.DebuggerModel.CallFrame;
}

export const enum MissingDebugInfoType {
  /** No debug information at all for the call frame */
  NO_INFO = 'NO_INFO',

  /** Some debug information available, but it references files with debug information we were not able to retrieve */
  PARTIAL_INFO = 'PARTIAL_INFO',
}

export type MissingDebugInfo = {
  type: MissingDebugInfoType.NO_INFO,
}|{
  type: MissingDebugInfoType.PARTIAL_INFO,
  missingDebugFiles: SDK.DebuggerModel.MissingDebugFiles[],
};

export const enum Events {
  UPDATED = 'UPDATED',
}

export interface EventTypes {
  [Events.UPDATED]: void;
}

/**
 * A small wrapper around a DebuggableFrame usable as a UI.Context flavor.
 * This is necessary as Frame and DebuggableFrame are updated in place, but
 * for UI.Context we need a new instance.
 */
export class DebuggableFrameFlavor implements DebuggableFrame {
  static #last?: DebuggableFrameFlavor;

  readonly url?: string;
  readonly uiSourceCode?: Workspace.UISourceCode.UISourceCode;
  readonly name?: string;
  readonly line: number;
  readonly column: number;
  readonly missingDebugInfo?: MissingDebugInfo;
  readonly sdkFrame: SDK.DebuggerModel.CallFrame;

  private constructor(frame: DebuggableFrame) {
    this.url = frame.url;
    this.uiSourceCode = frame.uiSourceCode;
    this.name = frame.name;
    this.line = frame.line;
    this.column = frame.column;
    this.missingDebugInfo = frame.missingDebugInfo;
    this.sdkFrame = frame.sdkFrame;
  }

  /** @returns the same instance of DebuggableFrameFlavor for repeated calls with the same (i.e. deep equal) DebuggableFrame */
  static for(frame: DebuggableFrame): DebuggableFrameFlavor {
    function equals(a: DebuggableFrame, b: DebuggableFrame): boolean {
      return a.url === b.url && a.uiSourceCode === b.uiSourceCode && a.name === b.name && a.line === b.line &&
          a.column === b.column && a.sdkFrame === b.sdkFrame;
    }

    if (!DebuggableFrameFlavor.#last || !equals(DebuggableFrameFlavor.#last, frame)) {
      DebuggableFrameFlavor.#last = new DebuggableFrameFlavor(frame);
    }
    return DebuggableFrameFlavor.#last;
  }
}
