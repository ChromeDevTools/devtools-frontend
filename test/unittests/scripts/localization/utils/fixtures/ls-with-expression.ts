// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck as this is a fixture for tests

const myFunc = () => {
  const x = 1;
  return ls`blah blah ${x}`;
};
