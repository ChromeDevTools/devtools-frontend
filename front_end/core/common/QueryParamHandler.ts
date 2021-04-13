// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
/* eslint-disable rulesdir/no_underscored_properties */

export interface QueryParamHandler {
  handleQueryParam(value: string): void;
}
