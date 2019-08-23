// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Some settings that control the shape of the graph (in pixels).
WebAudio.GraphVisualizer.GraphStyles = {
  PortPadding: 4,
  InputPortRadius: 10,
  AudioParamRadius: 5,
  LeftMarginOfText: 12,
  RightMarginOfText: 30,
  LeftSideTopPadding: 5,
  BottomPaddingWithoutParam: 6,
  BottomPaddingWithParam: 8,
  ArrowHeadSize: 12,
  // GraphPadding is used to add extra space for the layouted graph.
  GraphPadding: 20,
  GraphMargin: 20,
};

WebAudio.GraphVisualizer.GraphStyles.TotalInputPortHeight =
    WebAudio.GraphVisualizer.GraphStyles.InputPortRadius * 2 + WebAudio.GraphVisualizer.GraphStyles.PortPadding;

WebAudio.GraphVisualizer.GraphStyles.TotalOutputPortHeight = WebAudio.GraphVisualizer.GraphStyles.TotalInputPortHeight;

WebAudio.GraphVisualizer.GraphStyles.TotalParamPortHeight =
    WebAudio.GraphVisualizer.GraphStyles.AudioParamRadius * 2 + WebAudio.GraphVisualizer.GraphStyles.PortPadding;

WebAudio.GraphVisualizer.GraphStyles.NodeLabelFontStyle = '14px Segoe UI, Arial';
WebAudio.GraphVisualizer.GraphStyles.ParamLabelFontStyle = '12px Segoe UI, Arial';
