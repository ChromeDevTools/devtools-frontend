// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {{
 *   variationIds: !Array<number>,
 *   triggerVariationIds: !Array<number>,
 * }} data
 * @param {string=} variationComment
 * @param {string=} triggerVariationComment
 * @return {string}
 */
export const formatClientVariations = (data, variationComment, triggerVariationComment) => {
  // https://source.chromium.org/chromium/chromium/src/+/master:components/variations/proto/client_variations.proto;l=14-21
  const {variationIds, triggerVariationIds} = data;
  const buffer = ['message ClientVariations {'];
  if (variationIds.length) {
    buffer.push(
        `  // ${variationComment || 'Active client experiment variation IDs.'}`,
        `  repeated int32 variation_id = [${variationIds.join(', ')}];`);
  }
  if (triggerVariationIds.length) {
    buffer.push(
        `  // ${
            triggerVariationComment || 'Active client experiment variation IDs that trigger server-side behavior.'}`,
        `  repeated int32 trigger_variation_id = [${triggerVariationIds.join(', ')}];`);
  }
  buffer.push('}');
  return buffer.join('\n');
};
