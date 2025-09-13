// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export type Values = Record<string, string|boolean|number>;

export interface SerializedMessage {
  string: string;
  values: Values;
}
