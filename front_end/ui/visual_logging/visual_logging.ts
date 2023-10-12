// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as LoggingConfig from './LoggingConfig.js';
import * as LoggingDriver from './LoggingDriver.js';
import * as LoggingState from './LoggingState.js';

const {startLogging} = LoggingDriver;
const {registerContextProvider} = LoggingState;
const treeItem = LoggingConfig.makeConfigStringBuilder.bind(null, 'TreeItem');
const ariaAttributes = LoggingConfig.makeConfigStringBuilder.bind(null, 'AriaAttributes');
const accessibilityComputedProperties =
    LoggingConfig.makeConfigStringBuilder.bind(null, 'AccessibilityComputedProperties');
const accessibilityPane = LoggingConfig.makeConfigStringBuilder.bind(null, 'AccessibilityPane');
const accessibilitySourceOrder = LoggingConfig.makeConfigStringBuilder.bind(null, 'AccessibilitySourceOrder');
const toggle = LoggingConfig.makeConfigStringBuilder.bind(null, 'Toggle');

export {
  startLogging,
  registerContextProvider,
  treeItem,
  ariaAttributes,
  accessibilityComputedProperties,
  accessibilityPane,
  accessibilitySourceOrder,
  toggle,
};
