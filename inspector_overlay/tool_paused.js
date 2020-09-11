// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {adoptStyleSheet, dispatch, reset, setPlatform} from './common.js';
import style from './tool_paused.css';
import {drawPausedInDebuggerMessage, initListeners} from './tool_paused_impl.js';

window.setPlatform = function(platform) {
  adoptStyleSheet(style);

  const controlsLine = document.createElement('div');
  controlsLine.classList.add('controls-line');

  const messageBox = document.createElement('div');
  messageBox.classList.add('message-box');
  const pausedInDebugger = document.createElement('div');
  pausedInDebugger.id = 'paused-in-debugger';
  messageBox.append(pausedInDebugger);
  controlsLine.append(messageBox);

  const resumeButton = document.createElement('div');
  resumeButton.id = 'resume-button';
  resumeButton.title = 'Resume script execution (F8).';
  resumeButton.classList.add('button');
  const glyph = document.createElement('div');
  glyph.classList.add('glyph');
  resumeButton.append(glyph);
  controlsLine.append(resumeButton);

  const stepOverButton = document.createElement('div');
  stepOverButton.id = 'step-over-button';
  stepOverButton.title = 'Step over next function call (F10).';
  stepOverButton.classList.add('button');
  const glyph2 = document.createElement('div');
  glyph2.classList.add('glyph');
  stepOverButton.append(glyph2);
  controlsLine.append(stepOverButton);

  document.body.append(controlsLine);

  initListeners();

  resumeButton.addEventListener('click', () => InspectorOverlayHost.send('resume'));
  stepOverButton.addEventListener('click', () => InspectorOverlayHost.send('stepOver'));

  setPlatform(platform);
};

window.reset = function(data) {
  reset(data);
};
window.drawPausedInDebuggerMessage = drawPausedInDebuggerMessage;
window.dispatch = dispatch;
