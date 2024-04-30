// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Application from '../../panels/application/application.js';

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

export const isStorageView = function(view) {
  return view instanceof Application.StorageView.StorageView;
};
