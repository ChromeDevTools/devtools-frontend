// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import {join} from 'path';

export const storeGeneratedResults = (file: string, content: string) => {
  const directory = join(__dirname, '..', '..', '..', '..', '..', '..', 'perf-data');
  fs.mkdirSync(directory, {recursive: true});

  const filePath = join(directory, file);
  fs.writeFileSync(filePath, content, {encoding: 'utf8'});
};

export const percentile = (values: number[], position: number) => {
  if (values.length === 0) {
    return 0;
  }

  values = Array.from(values).sort((a, b) => a - b);
  const idx = Math.floor(values.length * position);
  if (values.length % 2 === 1) {
    return values[idx];
  }
  return (values[idx] + values[idx - 1]) / 2;
};

export const mean = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((prev, curr) => prev + curr, 0) / values.length;
};
