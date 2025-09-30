// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export function shardFilter(
    shardingArgs: {shardCount: number, shardNumber: number, shardBias: number}, testFilePath: string): boolean {
  const {shardCount, shardNumber, shardBias} = shardingArgs;

  if (shardCount < 1 || shardNumber < 1 || (shardNumber > shardCount)) {
    return true;
  }
  const hash = radixHash(testFilePath, shardCount, shardBias);
  return hash === shardNumber - 1;
}

function radixHash(s: string, max: number, bias: number): number {
  let hash = 1;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i) + bias) % max;
  }
  return hash;
}
