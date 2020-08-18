// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {string} data
 * @return {{
 *   variationIds: !Array<number>,
 *   triggerVariationIds: !Array<number>,
 * }}
 */
export function parseClientVariations(data) {}

/**
 * @param {{
 *   variationIds: !Array<number>,
 *   triggerVariationIds: !Array<number>,
 * }} data
 * @param {string=} variationIdsComment
 * @param {string=} triggerVariationIdsComment
 * @return {string}
 */
export function formatClientVariations(
    data, variationIdsComment, triggerVariationIdsComment) {}
