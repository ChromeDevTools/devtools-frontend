// Copyright 2026 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/naming-convention */
declare class diff_match_patch {
  diff_main(text1: string, text2: string): Array<{0: number, 1: string}>;
  diff_cleanupSemantic(diff: Array<{0: number, 1: string}>): void;
}
/* eslint-enable @typescript-eslint/naming-convention */
