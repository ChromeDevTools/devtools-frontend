// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

//  Copyright (C) 2012 Google Inc. All rights reserved.

//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions
//  are met:

//  1.  Redistributions of source code must retain the above copyright
//      notice, this list of conditions and the following disclaimer.
//  2.  Redistributions in binary form must reproduce the above copyright
//      notice, this list of conditions and the following disclaimer in the
//      documentation and/or other materials provided with the distribution.
//  3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
//      its contributors may be used to endorse or promote products derived
//      from this software without specific prior written permission.

//  THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
//  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
//  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
//  DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
//  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
//  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
//  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
//  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
//  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
//  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

import {Overlay, ResetData} from './common.js';
import {drawLayoutGridHighlight, GridHighlight} from './highlight_grid_common.js';

export class HighlightGridOverlay extends Overlay {
  private gridLabelState = {
    gridLayerCounter: 1,
    ridPainted: false,
  }

  private gridLabels!: HTMLElement;

  reset(resetData: ResetData) {
    super.reset(resetData);
    this.gridLabels.innerHTML = '';
  }

  setPlatform(platform: string) {
    super.setPlatform(platform);

    this.document.body.classList.add('fill');

    const canvas = this.document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.classList.add('fill');
    this.document.body.append(canvas);

    this.renderGridMarkup();

    this.setCanvas(canvas);
  }

  renderGridMarkup() {
    const gridLabels = this.document.createElement('div');
    gridLabels.id = 'grid-label-container';
    this.document.body.append(gridLabels);
    this.gridLabels = gridLabels;
  }

  drawGridHighlight(highlight: GridHighlight) {
    this.context.save();
    drawLayoutGridHighlight(
        highlight, this.context, this.deviceScaleFactor, this.canvasWidth, this.canvasHeight, this.emulationScaleFactor,
        this.gridLabelState);
    this.context.restore();
  }
}
