// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {Overlay} from './common.js';

export class PausedOverlay extends Overlay {
  setPlatform(platform) {
    super.setPlatform(platform);

    const controlsLine = this.document.createElement('div');
    controlsLine.classList.add('controls-line');

    const messageBox = this.document.createElement('div');
    messageBox.classList.add('message-box');
    const pausedInDebugger = this.document.createElement('div');
    pausedInDebugger.id = 'paused-in-debugger';
    this.container = pausedInDebugger;
    messageBox.append(pausedInDebugger);
    controlsLine.append(messageBox);

    const resumeButton = this.document.createElement('div');
    resumeButton.id = 'resume-button';
    resumeButton.title = 'Resume script execution (F8).';
    resumeButton.classList.add('button');
    const glyph = this.document.createElement('div');
    glyph.classList.add('glyph');
    resumeButton.append(glyph);
    controlsLine.append(resumeButton);

    const stepOverButton = this.document.createElement('div');
    stepOverButton.id = 'step-over-button';
    stepOverButton.title = 'Step over next function call (F10).';
    stepOverButton.classList.add('button');
    const glyph2 = this.document.createElement('div');
    glyph2.classList.add('glyph');
    stepOverButton.append(glyph2);
    controlsLine.append(stepOverButton);

    this.document.body.append(controlsLine);

    this.initListeners();

    resumeButton.addEventListener('click', () => InspectorOverlayHost.send('resume'));
    stepOverButton.addEventListener('click', () => InspectorOverlayHost.send('stepOver'));
  }

  drawPausedInDebuggerMessage(message) {
    this.container.textContent = message;
  }

  initListeners() {
    this.document.addEventListener('keydown', event => {
      if (event.key === 'F8' || this.eventHasCtrlOrMeta(event) && event.keyCode === 220 /* backslash */) {
        InspectorOverlayHost.send('resume');
      } else if (event.key === 'F10' || this.eventHasCtrlOrMeta(event) && event.keyCode === 222 /* single quote */) {
        InspectorOverlayHost.send('stepOver');
      }
    });
  }
}
