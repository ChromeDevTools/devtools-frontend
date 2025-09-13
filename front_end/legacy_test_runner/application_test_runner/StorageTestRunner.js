// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Application from '../../panels/application/application.js';

/**
 * @file using private properties isn't a Closure violation in tests.
 */

export const isStorageView = function(view) {
  return view instanceof Application.StorageView.StorageView;
};
