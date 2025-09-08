// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Badge, BadgeAction} from './Badge.js';

export class DOMDetectiveBadge extends Badge {
  override readonly name = 'awards/dom-detective-badge';
  override readonly title = 'DOM Detective';

  override readonly interestedActions = [
    BadgeAction.DOM_ELEMENT_OR_ATTRIBUTE_EDITED,
  ] as const;

  handleAction(_action: BadgeAction): void {
    this.trigger();
  }
}
