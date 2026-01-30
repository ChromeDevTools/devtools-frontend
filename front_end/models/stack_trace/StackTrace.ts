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
 * This is necessary as DebuggableFrame are just interfaces and the impl classes are hidden.
 *
 * Moreover, re-translation creates a new DebuggableFrame instance even though the
 * translation result stays the same, in which case we don't need a new instance for the flavor.
 */
export class DebuggableFrameFlavor {
  static #last?: DebuggableFrameFlavor;

  readonly frame: DebuggableFrame;

  // TODO(crbug.com/465879478): Remove once this is no longer part of SDK.CallFrame.
  //     We need to stash this separately because DebuggerModel sets this on CallFrame after the
  //     fact so we can't just check it in the `equals` below.
  readonly #missingDebugInfo: SDK.DebuggerModel.MissingDebugInfoDetails|null;

  /** Use the static {@link for}. Only public to satisfy the `setFlavor` Ctor type  */
  constructor(frame: DebuggableFrame) {
    this.frame = frame;
    this.#missingDebugInfo = frame.sdkFrame.missingDebugInfoDetails;
  }

  get sdkFrame(): SDK.DebuggerModel.CallFrame {
    return this.frame.sdkFrame;
  }

  /** @returns the same instance of DebuggableFrameFlavor for repeated calls with the same (i.e. deep equal) DebuggableFrame */
  static for(frame: DebuggableFrame): DebuggableFrameFlavor {
    function equals(a: DebuggableFrame, b: DebuggableFrame): boolean {
      return a.url === b.url && a.uiSourceCode === b.uiSourceCode && a.name === b.name && a.line === b.line &&
          a.column === b.column && a.sdkFrame === b.sdkFrame;
    }

    if (!DebuggableFrameFlavor.#last || !equals(DebuggableFrameFlavor.#last.frame, frame) ||
        DebuggableFrameFlavor.#last.#missingDebugInfo !== frame.sdkFrame.missingDebugInfoDetails) {
      DebuggableFrameFlavor.#last = new DebuggableFrameFlavor(frame);
    }
    return DebuggableFrameFlavor.#last;
  }
}
