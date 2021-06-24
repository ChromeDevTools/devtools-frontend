// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


type ValueFn = () => string;
export type Values = {
  [key: string]: string|boolean|number|null|undefined|ValueFn|DOMException|Date,
};

export interface SerializedMessage {
  string: string;
  values: Values;
}
