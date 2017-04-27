/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @implements {SDK.SDKModelObserver<!SDK.EmulationModel>}
 */
Main.RenderingOptionsView = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('main/renderingOptions.css');

    this._appendCheckbox(
        Common.UIString('Paint Flashing'),
        Common.UIString('Highlights areas of the page (green) that need to be repainted'),
        Common.moduleSetting('showPaintRects'));
    this._appendCheckbox(
        Common.UIString('Layer Borders'), Common.UIString('Shows layer borders (orange/olive) and tiles (cyan)'),
        Common.moduleSetting('showDebugBorders'));
    this._appendCheckbox(
        Common.UIString('FPS Meter'),
        Common.UIString('Plots frames per second, frame rate distribution, and GPU memory'),
        Common.moduleSetting('showFPSCounter'));
    this._appendCheckbox(
        Common.UIString('Scrolling Performance Issues'),
        Common.UIString(
            'Highlights elements (teal) that can slow down scrolling, including touch & wheel event handlers and other main-thread scrolling situations.'),
        Common.moduleSetting('showScrollBottleneckRects'));
    this.contentElement.createChild('div').classList.add('panel-section-separator');

    var cssMediaSubtitle = Common.UIString('Forces media type for testing print and screen styles');
    var checkboxLabel = UI.CheckboxLabel.create(Common.UIString('Emulate CSS Media'), false, cssMediaSubtitle);
    this._mediaCheckbox = checkboxLabel.checkboxElement;
    this._mediaCheckbox.addEventListener('click', this._mediaToggled.bind(this), false);
    this.contentElement.appendChild(checkboxLabel);

    var mediaRow = this.contentElement.createChild('div', 'media-row');
    this._mediaSelect = mediaRow.createChild('select', 'chrome-select');
    this._mediaSelect.appendChild(new Option(Common.UIString('print'), 'print'));
    this._mediaSelect.appendChild(new Option(Common.UIString('screen'), 'screen'));
    this._mediaSelect.addEventListener('change', this._mediaToggled.bind(this), false);
    this._mediaSelect.disabled = true;

    SDK.targetManager.observeModels(SDK.EmulationModel, this);
  }

  /**
   * @param {string} label
   * @param {string} subtitle
   * @param {!Common.Setting} setting
   */
  _appendCheckbox(label, subtitle, setting) {
    var checkboxLabel = UI.CheckboxLabel.create(label, false, subtitle);
    UI.SettingsUI.bindCheckbox(checkboxLabel.checkboxElement, setting);
    this.contentElement.appendChild(checkboxLabel);
  }

  /**
   * @override
   * @param {!SDK.EmulationModel} emulationModel
   */
  modelAdded(emulationModel) {
    if (this._mediaCheckbox.checked)
      emulationModel.emulateCSSMedia(this._mediaSelect.value);
  }

  _mediaToggled() {
    this._mediaSelect.disabled = !this._mediaCheckbox.checked;
    var media = this._mediaCheckbox.checked ? this._mediaSelect.value : null;
    for (var emulationModel of SDK.targetManager.models(SDK.EmulationModel))
      emulationModel.emulateCSSMedia(media);
  }

  /**
   * @override
   * @param {!SDK.EmulationModel} emulationModel
   */
  modelRemoved(emulationModel) {
  }
};
