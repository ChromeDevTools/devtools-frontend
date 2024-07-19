// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../shared/helper.js';

import {veImpression} from './visual-logging-helpers.js';

export const LAYERS_TAB_SELECTOR = '#tab-layers';

export async function getCurrentUrl() {
  await waitFor('[aria-label="layers"]');
  const element = await waitFor('[aria-label="layers"]');
  return element.evaluate(e => e.getAttribute('test-current-url'));
}

export function veImpressionForLayersPanel() {
  return veImpression('Panel', 'layers', [
    veImpression('Pane', 'sidebar'),
    veImpression(
        'Pane', 'layers-3d-view',
        [
          veImpression(
              'Toolbar', undefined,
              [
                veImpression('Toggle', 'layers.3d-pan'),
                veImpression('Toggle', 'layers.3d-rotate'),
                veImpression('Action', 'layers.3d-center'),
                veImpression('Toggle', 'frame-viewer-show-paints'),
                veImpression('Toggle', 'frame-viewer-show-slow-scroll-rects'),
              ]),
          veImpression('Canvas', 'layers'),
        ]),
    veImpression('Pane', 'layers-details', [veImpression('Section', 'empty-view')]),
    veImpression('PanelTabHeader', 'details'),
  ]);
}
