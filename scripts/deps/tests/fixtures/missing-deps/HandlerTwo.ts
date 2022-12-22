// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// NOTE: Not a real handler! Fake code to test the BuildGN import sync script

/* @eslint-disable */
// @ts-nocheck

// These two imports are in the fake BUILD.gn
import * as Platform from '../../../core/platform/platform.js';
import * as Generated from '../../../generated/generated.js';
// This import is not
import * as HandlerTwoMissingImport from '../../missing-two/missing-two.js';
