// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export function parseClientVariations(data: string): {
  variationIds: number[],
  triggerVariationIds: number[],
}
