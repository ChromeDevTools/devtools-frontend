// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export enum BadgeAction {
  CSS_RULE_MODIFIED = 'css-rule-modified',
  DOM_ELEMENT_OR_ATTRIBUTE_EDITED = 'dom-element-or-attribute-edited',
  MODERN_DOM_BADGE_CLICKED = 'modern-dom-badge-clicked',
  PERFORMANCE_INSIGHT_CLICKED = 'performance-insight-clicked',
}

export type BadgeActionEvents = Record<BadgeAction, void>;

export interface BadgeContext {
  onTriggerBadge: (badge: Badge) => void;
  badgeActionEventTarget: Common.ObjectWrapper.ObjectWrapper<BadgeActionEvents>;
}

export abstract class Badge {
  #onTriggerBadge: (badge: Badge) => void;
  #badgeActionEventTarget: Common.ObjectWrapper.ObjectWrapper<BadgeActionEvents>;
  #eventListeners: Common.EventTarget.EventDescriptor[] = [];
  #triggeredBefore = false;

  abstract readonly name: string;
  abstract readonly title: string;
  abstract readonly imageUri: string;
  abstract readonly interestedActions: readonly BadgeAction[];
  readonly isStarterBadge: boolean = false;

  constructor(context: BadgeContext) {
    this.#onTriggerBadge = context.onTriggerBadge;
    this.#badgeActionEventTarget = context.badgeActionEventTarget;
  }

  abstract handleAction(action: BadgeAction): void;
  protected trigger(): void {
    if (this.#triggeredBefore) {
      return;
    }

    this.#triggeredBefore = true;
    this.deactivate();
    this.#onTriggerBadge(this);
  }

  activate(): void {
    // We don't reactivate a badge that's triggered before.
    if (this.#triggeredBefore) {
      return;
    }

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
  }
}
