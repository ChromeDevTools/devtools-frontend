// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPages, getTestServerPort} from '../../shared/helper.js';

export const loadComponentDocExample = async (url: string) => {
  const {frontend} = getBrowserAndPages();
  await frontend.goto(`http://localhost:${getTestServerPort()}/component_docs/${url}`);
};
