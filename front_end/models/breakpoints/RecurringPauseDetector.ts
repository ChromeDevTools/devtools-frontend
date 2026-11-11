// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as Bindings from '../bindings/bindings.js';

import {type BreakpointManager, BreakpointOrigin, NEVER_PAUSE_HERE_CONDITION} from './BreakpointManager.js';

export const RECURRING_PAUSE_WINDOW_MS = 10_000;
const RECURRING_PAUSE_THRESHOLD = 2;

const NON_RECURRING_PAUSE_REASONS = new Set<Protocol.Debugger.PausedEventReason>([
  Protocol.Debugger.PausedEventReason.Step,
  Protocol.Debugger.PausedEventReason.OOM,
]);

const NEVER_PAUSE_HERE_REASONS = new Set<Protocol.Debugger.PausedEventReason>([
  Protocol.Debugger.PausedEventReason.Ambiguous,
  Protocol.Debugger.PausedEventReason.DebugCommand,
  Protocol.Debugger.PausedEventReason.Exception,
  Protocol.Debugger.PausedEventReason.Other,
  Protocol.Debugger.PausedEventReason.PromiseRejection,
]);

export interface RecurringPauseActions {
  disableBreakpoint?: () => Promise<void>;
  neverPauseHere?: () => Promise<void>;
  deactivateBreakpointsAndResume?: () => void;
}

export class RecurringPauseDetector {
  readonly #debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;
  readonly #breakpointManager: BreakpointManager;
  readonly #breakpointsActiveSetting: Common.Settings.Setting<boolean>;
  #lastPausedDetails: SDK.DebuggerModel.DebuggerPausedDetails|null = null;
  #lastPauseLocationKey: string|null = null;
  #lastPauseTimestamp = -Infinity;
  #recurringPauseCount = 0;

  constructor(
      debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding,
      breakpointManager: BreakpointManager,
      settings: Common.Settings.Settings,
  ) {
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this.#breakpointManager = breakpointManager;
    this.#breakpointsActiveSetting = settings.resolve(SDK.SDKSettings.breakpointsActiveSettingDescriptor);
  }

  async onPaused(details: SDK.DebuggerModel.DebuggerPausedDetails|null): Promise<RecurringPauseActions> {
    if (!details) {
      this.#lastPausedDetails = null;
      return {};
    }

    const locationKey = RecurringPauseDetector.#computeLocationKey(details);
    if (details !== this.#lastPausedDetails) {
      this.#lastPausedDetails = details;
      const now = Date.now();
      if (locationKey !== null && locationKey === this.#lastPauseLocationKey &&
          now - this.#lastPauseTimestamp <= RECURRING_PAUSE_WINDOW_MS) {
        this.#recurringPauseCount++;
      } else {
        this.#lastPauseLocationKey = locationKey;
        this.#recurringPauseCount = locationKey !== null ? 1 : 0;
      }
      this.#lastPauseTimestamp = now;
    }

    if (this.#recurringPauseCount < RECURRING_PAUSE_THRESHOLD) {
      return {};
    }

    const rawLocation = details.callFrames[0]?.location() ?? null;
    const uiLocation = rawLocation ? await this.#debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation) : null;
    if (details !== this.#lastPausedDetails) {
      return {};
    }

    const actions: RecurringPauseActions = {};
    const existingBreakpoint = uiLocation ? this.#breakpointManager.findBreakpoint(uiLocation)?.breakpoint : null;
    if (existingBreakpoint?.enabled()) {
      actions.disableBreakpoint = async () => {
        if (!details.debuggerModel.isPaused()) {
          return;
        }
        existingBreakpoint.setEnabled(false);
        await existingBreakpoint.updateBreakpoint();
        if (details.debuggerModel.isPaused()) {
          details.debuggerModel.resume();
        }
      };
    } else if (!existingBreakpoint && uiLocation && NEVER_PAUSE_HERE_REASONS.has(details.reason) &&
               this.#breakpointManager.supportsConditionalBreakpoints(uiLocation.uiSourceCode)) {
      actions.neverPauseHere = async () => {
        if (!details.debuggerModel.isPaused()) {
          return;
        }
        this.#breakpointsActiveSetting.set(true);
        if (!this.#breakpointManager.findBreakpoint(uiLocation)) {
          const breakpoint = await this.#breakpointManager.setBreakpoint(
              uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber, NEVER_PAUSE_HERE_CONDITION,
              /* enabled */ true, /* isLogpoint */ false, BreakpointOrigin.USER_ACTION);
          await breakpoint?.updateBreakpoint();
        }
        if (details.debuggerModel.isPaused()) {
          details.debuggerModel.resume();
        }
      };
    }

    if (this.#breakpointsActiveSetting.get()) {
      actions.deactivateBreakpointsAndResume = () => {
        this.#breakpointsActiveSetting.set(false);
        if (details.debuggerModel.isPaused()) {
          details.debuggerModel.resume();
        }
      };
    }

    return actions;
  }

  static #computeLocationKey(details: SDK.DebuggerModel.DebuggerPausedDetails): string|null {
    if (NON_RECURRING_PAUSE_REASONS.has(details.reason)) {
      return null;
    }
    const targetId = details.debuggerModel.target()?.id() ?? '';
    const rawLocation = details.callFrames[0]?.location();
    if (rawLocation) {
      return `${targetId}:${rawLocation.scriptId}:${rawLocation.lineNumber}:${rawLocation.columnNumber}`;
    }
    const auxDiscriminator =
        String(details.auxData?.['url'] ?? details.auxData?.['eventName'] ?? details.auxData?.['violationType'] ?? '');
    return `${targetId}:${details.reason}:${auxDiscriminator}`;
  }
}
