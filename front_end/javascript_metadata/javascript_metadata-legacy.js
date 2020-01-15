// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as JavaScriptMetadataModule from './javascript_metadata.js';

self.JavaScriptMetadata = self.JavaScriptMetadata || {};
JavaScriptMetadata = JavaScriptMetadata || {};

/**
 * @constructor
 */
JavaScriptMetadata.JavaScriptMetadata = JavaScriptMetadataModule.JavaScriptMetadata.JavaScriptMetadataImpl;

JavaScriptMetadata.NativeFunctions = JavaScriptMetadataModule.NativeFunctions.NativeFunctions;

/**
 * @type {!Array<{
 *  name: string,
 *  signatures: !Array<!Array<string>>,
 *  static: (boolean|undefined),
 *  receiver: (string|undefined),
 * }>}
 */
JavaScriptMetadata.NativeFunctions;
