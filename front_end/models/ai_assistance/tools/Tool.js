// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// The maximum size (in bytes) of a function execution result.
// Approximately 16k tokens at ~4 characters per token, designed to limit
// result sizes to prevent overloading the LLM's context window.
export const MAX_FUNCTION_RESULT_BYTE_LENGTH = 16384 * 4;
//# sourceMappingURL=Tool.js.map