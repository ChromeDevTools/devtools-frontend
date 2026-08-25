// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SplitProducer from '../../core/split_producer/split_producer.js';

export function getLegacyConsumerGreeting(): string {
  return `${SplitProducer.SplitProducer.getSplitGreeting()} -> consumed by Legacy`;
}
