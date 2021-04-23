// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../front_end/core/common/common.js';
import type * as SDKModule from '../../../../../front_end/core/sdk/sdk.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

describeWithEnvironment('OverlayColorGenerator', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../../front_end/core/sdk/sdk.js');
  });

  const mockModel = {
    getDOMModel() {
      return {
        nodeForId() {
          return true;
        },
      };
    },
    target() {
      return {
        overlayAgent() {
          return {
            invoke_setShowGridOverlays() {},
            invoke_setShowFlexOverlays() {},
            invoke_setShowScrollSnapOverlays() {},
          };
        },
      };
    },
    setShowViewportSizeOnResize() {},
  };

  it('is able to highlight flexbox elements', () => {
    const highlighter = new SDK.OverlayPersistentHighlighter.OverlayPersistentHighlighter(mockModel);
    const nodeId = 1;
    highlighter.highlightFlexInOverlay(nodeId);
    assert(highlighter.isFlexHighlighted(nodeId));
    assert(!highlighter.isGridHighlighted(nodeId));
    assert(highlighter.colorOfFlex(nodeId) instanceof Common.Color.Color);
    highlighter.hideFlexInOverlay(nodeId);
    assert(!highlighter.isFlexHighlighted(nodeId));
  });

  it('is able to highlight grid elements', () => {
    const highlighter = new SDK.OverlayPersistentHighlighter.OverlayPersistentHighlighter(mockModel);
    const nodeId = 1;
    highlighter.highlightGridInOverlay(nodeId);
    assert(highlighter.isGridHighlighted(nodeId));
    assert(!highlighter.isFlexHighlighted(nodeId));
    assert(highlighter.colorOfGrid(nodeId) instanceof Common.Color.Color);
    highlighter.hideGridInOverlay(nodeId);
    assert(!highlighter.isGridHighlighted(nodeId));
  });

  it('is able to highlight scroll snal elements', () => {
    const highlighter = new SDK.OverlayPersistentHighlighter.OverlayPersistentHighlighter(mockModel);
    const nodeId = 1;
    highlighter.highlightScrollSnapInOverlay(nodeId);
    assert(highlighter.isScrollSnapHighlighted(nodeId));
    assert(!highlighter.isFlexHighlighted(nodeId));
    assert(!highlighter.isGridHighlighted(nodeId));
    highlighter.hideScrollSnapInOverlay(nodeId);
    assert(!highlighter.isScrollSnapHighlighted(nodeId));
  });
});
