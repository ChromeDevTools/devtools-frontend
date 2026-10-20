// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {TestRunner} from '../test_runner/test_runner.js';

/**
 * @file using private properties isn't a Closure violation in tests.
 */
export const SecurityTestRunner = {};

/**
 * @param {SDK.NetworkRequest.NetworkRequest} request
 */
SecurityTestRunner.dispatchRequestFinished = function(request) {
  // @ts-ignore
  TestRunner.networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);
};
