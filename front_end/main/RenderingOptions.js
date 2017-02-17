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
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Main.RenderingOptionsView = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('main/renderingOptions.css');

    /** @type {!Map.<string, !Element>} */
    this._settings = new Map();

    var options = [
      {
        label: Common.UIString('Paint Flashing'),
        subtitle: Common.UIString('Highlights areas of the page (green) that need to be repainted'),
        setterName: 'setShowPaintRects'
      },
      {
        label: Common.UIString('Layer Borders'),
        subtitle: Common.UIString('Shows layer borders (orange/olive) and tiles (cyan)'),
        setterName: 'setShowDebugBorders'
      },
      {
        label: Common.UIString('FPS Meter'),
        subtitle: Common.UIString('Plots frames per second, frame rate distribution, and GPU memory'),
        setterName: 'setShowFPSCounter'
      },
      {
        label: Common.UIString('Scrolling Performance Issues'),
        subtitle: Common.UIString(
            'Highlights elements (teal) that can slow down scrolling, including touch & wheel event handlers and other main-thread scrolling situations.'),
        setterName: 'setShowScrollBottleneckRects'
      }
    ];
    for (var i = 0; i < options.length; i++)
      this._appendCheckbox(options[i].label, options[i].setterName, options[i].subtitle);

    this.contentElement.createChild('div').classList.add('panel-section-separator');

    var cssMediaSubtitle = Common.UIString('Forces media type for testing print and screen styles');
    var checkboxLabel = UI.createCheckboxLabel(Common.UIString('Emulate CSS Media'), false, cssMediaSubtitle);
    this._mediaCheckbox = checkboxLabel.checkboxElement;
    this._mediaCheckbox.addEventListener('click', this._mediaToggled.bind(this), false);
    this.contentElement.appendChild(checkboxLabel);

    var mediaRow = this.contentElement.createChild('div', 'media-row');
    this._mediaSelect = mediaRow.createChild('select', 'chrome-select');
    this._mediaSelect.appendChild(new Option(Common.UIString('print'), 'print'));
    this._mediaSelect.appendChild(new Option(Common.UIString('screen'), 'screen'));
    this._mediaSelect.addEventListener('change', this._mediaToggled.bind(this), false);
    this._mediaSelect.disabled = true;

    SDK.targetManager.observeTargets(this, SDK.Target.Capability.Browser);
  }

  /**
   * @return {!Main.RenderingOptionsView}
   */
  static instance() {
    if (!Main.RenderingOptionsView._instanceObject)
      Main.RenderingOptionsView._instanceObject = new Main.RenderingOptionsView();
    return Main.RenderingOptionsView._instanceObject;
  }

  /**
   * @param {string} label
   * @param {string} setterName
   * @param {string=} subtitle
   */
  _appendCheckbox(label, setterName, subtitle) {
    var checkboxLabel = UI.createCheckboxLabel(label, false, subtitle);
    this._settings.set(setterName, checkboxLabel.checkboxElement);
    checkboxLabel.checkboxElement.addEventListener('click', this._settingToggled.bind(this, setterName));
    this.contentElement.appendChild(checkboxLabel);
  }

  /**
   * @param {string} setterName
   */
  _settingToggled(setterName) {
    var enabled = this._settings.get(setterName).checked;
    for (var target of SDK.targetManager.targets(SDK.Target.Capability.Browser))
      target.renderingAgent()[setterName](enabled);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    for (var setterName of this._settings.keysArray()) {
      if (this._settings.get(setterName).checked)
        target.renderingAgent()[setterName](true);
    }
    if (this._mediaCheckbox.checked)
      this._applyPrintMediaOverride(target);
  }

  _mediaToggled() {
    this._mediaSelect.disabled = !this._mediaCheckbox.checked;
    var targets = SDK.targetManager.targets(SDK.Target.Capability.Browser);
    for (var target of targets)
      this._applyPrintMediaOverride(target);
  }

  /**
   * @param {!SDK.Target} target
   */
  _applyPrintMediaOverride(target) {
    target.emulationAgent().setEmulatedMedia(this._mediaCheckbox.checked ? this._mediaSelect.value : '');
    var cssModel = target.model(SDK.CSSModel);
    if (cssModel)
      cssModel.mediaQueryResultChanged();
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
  }
};
