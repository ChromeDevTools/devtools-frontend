// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export enum BadgeAction {
  GDP_SIGN_UP_COMPLETE = 'gdp-sign-up-complete',
  RECEIVE_BADGES_SETTING_ENABLED = 'receive-badges-setting-enabled',
  CSS_RULE_MODIFIED = 'css-rule-modified',
  DOM_ELEMENT_OR_ATTRIBUTE_EDITED = 'dom-element-or-attribute-edited',
  MODERN_DOM_BADGE_CLICKED = 'modern-dom-badge-clicked',
  STARTED_AI_CONVERSATION = 'started-ai-conversation',
  // TODO(ergunsh): Instrument performance insight clicks.
  PERFORMANCE_INSIGHT_CLICKED = 'performance-insight-clicked',
  DEBUGGER_PAUSED = 'debugger-paused',
  BREAKPOINT_ADDED = 'breakpoint-added',
  CONSOLE_PROMPT_EXECUTED = 'console-prompt-executed',
  PERFORMANCE_RECORDING_STARTED = 'performance-recording-started',
  NETWORK_SPEED_THROTTLED = 'network-speed-throttled',
  RECORDER_RECORDING_STARTED = 'recorder-recording-started',
}

export type BadgeActionEvents = Record<BadgeAction, void>;

export interface BadgeContext {
  onTriggerBadge: (badge: Badge) => void;
  badgeActionEventTarget: Common.ObjectWrapper.ObjectWrapper<BadgeActionEvents>;
}

export interface TriggerOptions {
  immediate?: boolean;
}

export abstract class Badge {
  #onTriggerBadge: (badge: Badge, opts?: TriggerOptions) => void;
  #badgeActionEventTarget: Common.ObjectWrapper.ObjectWrapper<BadgeActionEvents>;
  #eventListeners: Common.EventTarget.EventDescriptor[] = [];
  #triggeredBefore = false;

  abstract readonly name: string;
  abstract readonly title: string;
  abstract readonly imageUri: string;
  abstract readonly interestedActions: readonly BadgeAction[];
  abstract readonly jslogContext: string;
  readonly isStarterBadge: boolean = false;

  constructor(context: BadgeContext) {
    this.#onTriggerBadge = context.onTriggerBadge;
    this.#badgeActionEventTarget = context.badgeActionEventTarget;
  }

  abstract handleAction(action: BadgeAction): void;
  protected trigger(opts?: TriggerOptions): void {
    if (this.#triggeredBefore) {
      return;
    }

    this.#triggeredBefore = true;
    this.deactivate();
    this.#onTriggerBadge(this, opts);
  }

  activate(): void {
    // The event listeners are already registered, we don't re-register them.
    if (this.#eventListeners.length > 0) {
      return;
    }

    this.#eventListeners =
        this.interestedActions.map(actionType => this.#badgeActionEventTarget.addEventListener(actionType, () => {
          this.handleAction(actionType);
        }, this));
  }

  deactivate(): void {
    if (!this.#eventListeners.length) {
      return;
    }

    Common.EventTarget.removeEventListeners(this.#eventListeners);
    this.#eventListeners = [];
    this.#triggeredBefore = false;
  }
}
