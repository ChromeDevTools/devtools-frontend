// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {RuleTester} from '@typescript-eslint/rule-tester';

// Add the mocha hooks to the rule tester.
RuleTester.afterAll = after;

export {RuleTester};
