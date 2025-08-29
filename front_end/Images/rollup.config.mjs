// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {importMetaAssets} from '@web/rollup-plugin-import-meta-assets';
import {optimize} from 'svgo';

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
              const {data} = await optimize(assetBuffer.toString(), {
                plugins: [
                  {
                    name: 'preset-default',
                    params: {
                      overrides: {
                        inlineStyles: false,
                      },
                    },
                  },
                ],
              });
              return data;
            }
            return null;
          }
        }),
      ],
};
