// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Badge, BadgeAction} from './Badge.js';

export class SpeedsterBadge extends Badge {
  override readonly name = 'awards/speedster';
  override readonly title = 'Speedster';
  override readonly interestedActions = [BadgeAction.PERFORMANCE_INSIGHT_CLICKED] as const;

  handleAction(_action: BadgeAction): void {
    this.trigger();
  }
}
