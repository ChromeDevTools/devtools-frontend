// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getMessage, type Message} from './exporting.js';

export function run(): string {
  const m: Message = getMessage();
  return m.text;
}
