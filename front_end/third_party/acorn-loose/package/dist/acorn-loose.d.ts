// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Note: this file is not provided as part of the upstream third party
// deps. It has been written solely to satisfy the TypeScript compiler in
// this repo.

export as namespace AcornLoose
export = AcornLoose

import { Options } from '../../../acorn/package/dist/acorn.mjs';

declare namespace AcornLoose {
  function parse(input: string, options?: Options): Node;
}
