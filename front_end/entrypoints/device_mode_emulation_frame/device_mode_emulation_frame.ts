// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../core/dom_extension/dom_extension.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: tsc 6.0 does not support side-effect imports without a type definition.
// We cannot use `@ts-expect-error` here because the import is correctly resolved
// when bundling the application (which doesn't error) and only errors in unbundled builds.
import '../../Images/Images.js';

if (window.opener) {
  const app = window.opener.Emulation.AdvancedApp.instance();
  app.deviceModeEmulationFrameLoaded(document);
}
