// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as LoggingConfig from './LoggingConfig.js';
import * as LoggingDriver from './LoggingDriver.js';
import * as LoggingState from './LoggingState.js';

const {startLogging} = LoggingDriver;
const {registerContextProvider} = LoggingState;
const treeItem = LoggingConfig.makeConfigStringBuilder('TreeItem');

export {
  startLogging,
  registerContextProvider,
  treeItem,
};
