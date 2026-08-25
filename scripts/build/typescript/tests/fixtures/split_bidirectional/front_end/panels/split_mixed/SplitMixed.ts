// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LegacyConsumer from '../legacy_consumer/legacy_consumer.js';
import * as SplitConsumer from '../split_consumer/split_consumer.js';

export function getSplitMixedGreeting(): string {
  const fromSplit: string = SplitConsumer.SplitConsumer.getSplitConsumerGreeting();
  const fromLegacy: string = LegacyConsumer.LegacyConsumer.getLegacyConsumerGreeting();
  return `SplitMixed: [${fromSplit}] and [${fromLegacy}]`;
}
