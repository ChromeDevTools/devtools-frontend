// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// eslint-disable-next-line rulesdir/es_modules_import
import {importMetaAssets} from '@web/rollup-plugin-import-meta-assets';
import {optimize} from 'svgo';

// eslint-disable-next-line import/no-default-export
export default {
  treeshake: false,
  output: [{
    format: 'esm',
    assetFileNames: '[name][extname]',
  }],
  plugins:
      [
        importMetaAssets({
          async transform(assetBuffer, assetPath) {
            if (assetPath.endsWith('.svg')) {
              const {data} = await optimize(assetBuffer.toString());
              return data;
            }
            return null;
          }
        }),
      ],
};
