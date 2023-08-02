// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {WorkerPlugin} from '../gen/DevToolsPluginHost.bundle.js';

const plugin = WorkerPlugin.create().catch(console.error);

globalThis.RegisterExtension = function(extensionAPI) {
  if (typeof chrome === 'undefined') {
    globalThis.chrome = {devtools: {languageServices: extensionAPI.languageServices}};
  }
  return new Promise(resolve => {
    plugin
        .then(
            plugin => extensionAPI.languageServices.registerLanguageExtensionPlugin(
                plugin, 'C++/DWARF Plugin',
                {language: 'WebAssembly', symbol_types: ['EmbeddedDWARF', 'ExternalDWARF']}))
        .then(result => resolve(result));
  });
};
