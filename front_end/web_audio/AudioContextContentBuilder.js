// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../ui/ui.js';

export class ContextDetailBuilder {
  /**
   * @param {!Protocol.WebAudio.BaseAudioContext} context
   */
  constructor(context) {
    this._fragment = createDocumentFragment();
    this._container = createElementWithClass('div', 'context-detail-container');
    this._fragment.appendChild(this._container);
    this._build(context);
  }

  /**
   * @param {!Protocol.WebAudio.BaseAudioContext} context
   */
  _build(context) {
    const title = context.contextType === 'realtime' ? ls`AudioContext` : ls`OfflineAudioContext`;
    this._addTitle(title, context.contextId);
    this._addEntry(ls`State`, context.contextState);
    this._addEntry(ls`Sample Rate`, context.sampleRate, 'Hz');
    if (context.contextType === 'realtime') {
      this._addEntry(ls`Callback Buffer Size`, context.callbackBufferSize, 'frames');
    }
    this._addEntry(ls`Max Output Channels`, context.maxOutputChannelCount, 'ch');
  }

  /**
   * @param {string} title
   * @param {string} subtitle
   */
  _addTitle(title, subtitle) {
    this._container.appendChild(UI.Fragment.html`
      <div class="context-detail-header">
        <div class="context-detail-title">${title}</div>
        <div class="context-detail-subtitle">${subtitle}</div>
      </div>
    `);
  }

  /**
   * @param {string} entry
   * @param {(string|number)} value
   * @param {string=} unit
   */
  _addEntry(entry, value, unit) {
    const valueWithUnit = value + (unit ? ` ${unit}` : '');
    this._container.appendChild(UI.Fragment.html`
      <div class="context-detail-row">
        <div class="context-detail-row-entry">${entry}</div>
        <div class="context-detail-row-value">${valueWithUnit}</div>
      </div>
    `);
  }

  /**
   * @return {!DocumentFragment}
   */
  getFragment() {
    return this._fragment;
  }
}

export class ContextSummaryBuilder {
  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   * @param {!Protocol.WebAudio.ContextRealtimeData} contextRealtimeData
   */
  constructor(contextId, contextRealtimeData) {
    const time = contextRealtimeData.currentTime.toFixed(3);
    const mean = (contextRealtimeData.callbackIntervalMean * 1000).toFixed(3);
    const stddev = (Math.sqrt(contextRealtimeData.callbackIntervalVariance) * 1000).toFixed(3);
    const capacity = (contextRealtimeData.renderCapacity * 100).toFixed(3);
    this._fragment = createDocumentFragment();
    this._fragment.appendChild(UI.Fragment.html`
      <div class="context-summary-container">
        <span>${ls`Current Time`}: ${time} s</span>
        <span>\u2758</span>
        <span>${ls`Callback Interval`}: μ = ${mean} ms, σ = ${stddev} ms</span>
        <span>\u2758</span>
        <span>${ls`Render Capacity`}: ${capacity} %</span>
      </div>
    `);
  }

  /**
   * @return {!DocumentFragment}
   */
  getFragment() {
    return this._fragment;
  }
}
