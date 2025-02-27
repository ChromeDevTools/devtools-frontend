// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const {v5} = require('uuid');

const {writeIfChanged} = require('./ninja/write-if-changed.js');

const [, , outputLocation] = process.argv;

const root = path.join(path.dirname(path.dirname(__dirname)), 'front_end');

// We use a pre-generated v4 UUID for the namespace
const NAMESPACE = '2ba62548-f4e9-11ef-9cd2-0242ac120002';

// Generate a v5 UUID with the root path as name.
const uuid = v5(root, NAMESPACE);

// Construct and write the `devtools.json`.
const devtools = {
  workspace: {
    root,
    uuid,
  },
};
writeIfChanged(outputLocation, JSON.stringify(devtools, null, 2));
