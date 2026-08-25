// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LegacyProducer from '../../core/legacy_producer/legacy_producer.js';

export function getSplitConsumerGreeting(): string {
  return `${LegacyProducer.LegacyProducer.getLegacyGreeting()} -> consumed by Split`;
}
