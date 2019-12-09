#!/bin/bash

# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

if [ -z "$1" ]; then
  echo "Must supply folder name"
  exit
fi

npm run move-side-effects-to-legacy $1
