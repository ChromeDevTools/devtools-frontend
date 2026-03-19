// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ErrorStackParser from './ErrorStackParser.js';
import * as StackTrace from './StackTrace.js';

export {
  // TODO(crbug.com/485142682): Move to stack_trace_impl.js once all usage
  // goes through createStackTraceFromErrorObject.
  ErrorStackParser,
  StackTrace,
};
