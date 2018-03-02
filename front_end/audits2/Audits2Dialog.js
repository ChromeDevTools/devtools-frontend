// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
Audits2.Audits2Dialog = class {
  constructor(onAuditComplete, protocolService) {
    this._onAuditComplete = onAuditComplete;
    this._protocolService = protocolService;
    this._protocolService.registerStatusCallback(msg => this._updateStatus(Common.UIString(msg)));
  }

  /**
   * @param {!Element} dialogRenderElement
   */
  render(dialogRenderElement) {
    this._dialog = new UI.Dialog();
    this._dialog.setOutsideClickCallback(event => event.consume(true));
    const root = UI.createShadowRootWithCoreStyles(this._dialog.contentElement, 'audits2/audits2Dialog.css');
    const auditsViewElement = root.createChild('div', 'audits2-view vbox');

    const closeButton = auditsViewElement.createChild('div', 'dialog-close-button', 'dt-close-button');
    closeButton.addEventListener('click', () => this._cancelAndClose());

    const uiElement = auditsViewElement.createChild('div', 'vbox launcher-container');
    const headerElement = uiElement.createChild('header');
    this._headerTitleElement = headerElement.createChild('p');
    this._headerTitleElement.textContent = Common.UIString('Audits to perform');
    uiElement.appendChild(headerElement);

    this._auditSelectorForm = uiElement.createChild('form', 'audits2-form');

    for (const preset of Audits2.Audits2Panel.Presets) {
      preset.setting.setTitle(preset.title);
      const checkbox = new UI.ToolbarSettingCheckbox(preset.setting);
      const row = this._auditSelectorForm.createChild('div', 'vbox audits2-launcher-row');
      row.appendChild(checkbox.element);
      row.createChild('span', 'audits2-launcher-description dimmed').textContent = preset.description;
    }

    this._statusView = new Audits2.Audits2StatusView();
    this._statusView.render(uiElement);
    this._dialogHelpText = uiElement.createChild('div', 'audits2-dialog-help-text');

    const buttonsRow = uiElement.createChild('div', 'audits2-dialog-buttons hbox');
    this._startButton =
        UI.createTextButton(Common.UIString('Run audit'), this._start.bind(this), '', true /* primary */);
    buttonsRow.appendChild(this._startButton);
    this._cancelButton = UI.createTextButton(Common.UIString('Cancel'), this._cancel.bind(this));
    buttonsRow.appendChild(this._cancelButton);

    auditsViewElement.tabIndex = 0;
    this._dialog.setDefaultFocusedElement(this._startButton);
    this._dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.SetExactWidthMaxHeight);
    this._dialog.setMaxContentSize(new UI.Size(500, 400));
    this._dialog.show(dialogRenderElement);
  }

  hide() {
    if (!this._dialog)
      return;

    this._dialog.hide();

    delete this._dialog;
    delete this._statusView;
    delete this._startButton;
    delete this._cancelButton;
    delete this._auditSelectorForm;
    delete this._headerTitleElement;
    delete this._emulationEnabledBefore;
    delete this._emulationOutlineEnabledBefore;
  }

  /**
   * @param {boolean} isEnabled
   */
  setStartEnabled(isEnabled) {
    if (this._dialogHelpText)
      this._dialogHelpText.classList.toggle('hidden', isEnabled);

    if (this._startButton)
      this._startButton.disabled = !isEnabled;
  }

  /**
   * @param {string} text
   */
  setHelpText(text) {
    if (this._dialogHelpText)
      this._dialogHelpText.textContent = text;
  }

  /**
   * @param {string} message
   */
  _updateStatus(message) {
    if (!this._statusView)
      return;
    this._statusView.updateStatus(message);
  }

  _cancelAndClose() {
    this._cancel();
    this.hide();
  }

  async _cancel() {
    if (this._auditRunning) {
      this._updateStatus(Common.UIString('Cancelling\u2026'));
      await this._stopAndReattach();

      if (this._statusView)
        this._statusView.reset();
    } else {
      this.hide();
    }
  }

  /**
   * @return {!Promise<undefined>}
   */
  _getInspectedURL() {
    const mainTarget = SDK.targetManager.mainTarget();
    const runtimeModel = mainTarget.model(SDK.RuntimeModel);
    const executionContext = runtimeModel && runtimeModel.defaultExecutionContext();
    let inspectedURL = mainTarget.inspectedURL();
    if (!executionContext)
      return Promise.resolve(inspectedURL);

    // Evaluate location.href for a more specific URL than inspectedURL provides so that SPA hash navigation routes
    // will be respected and audited.
    return executionContext
        .evaluate(
            {
              expression: 'window.location.href',
              objectGroup: 'audits',
              includeCommandLineAPI: false,
              silent: false,
              returnByValue: true,
              generatePreview: false
            },
            /* userGesture */ false, /* awaitPromise */ false)
        .then(result => {
          if (!result.exceptionDetails && result.object) {
            inspectedURL = result.object.value;
            result.object.release();
          }

          return inspectedURL;
        });
  }

  /**
   * @return {!Object}
   */
  _getFlags() {
    const flags = {};
    for (const runtimeSetting of Audits2.Audits2Panel.RuntimeSettings)
      runtimeSetting.setFlags(flags, runtimeSetting.setting.get());
    return flags;
  }

  async _start() {
    const flags = this._getFlags();

    const emulationModel = self.singleton(Emulation.DeviceModeModel);
    this._emulationEnabledBefore = emulationModel.enabledSetting().get();
    this._emulationOutlineEnabledBefore = emulationModel.deviceOutlineSetting().get();
    emulationModel.toolbarControlsEnabledSetting().set(false);

    if (flags.disableDeviceEmulation) {
      emulationModel.enabledSetting().set(false);
      emulationModel.deviceOutlineSetting().set(false);
      emulationModel.emulate(Emulation.DeviceModeModel.Type.None, null, null);
    } else {
      emulationModel.enabledSetting().set(true);
      emulationModel.deviceOutlineSetting().set(true);

      for (const device of Emulation.EmulatedDevicesList.instance().standard()) {
        if (device.title === 'Nexus 5X')
          emulationModel.emulate(Emulation.DeviceModeModel.Type.Device, device, device.modes[0], 1);
      }
    }

    this._dialog.setCloseOnEscape(false);

    const categoryIDs = [];
    for (const preset of Audits2.Audits2Panel.Presets) {
      if (preset.setting.get())
        categoryIDs.push(preset.configID);
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.Audits2Started);

    try {
      this._auditURL = await this._getInspectedURL();
      await this._protocolService.attach();

      this._auditRunning = true;
      this._updateButton(this._auditURL);
      this._updateStatus(Common.UIString('Loading\u2026'));

      const lighthouseResult = await this._protocolService.startLighthouse(this._auditURL, categoryIDs, flags);
      if (lighthouseResult && lighthouseResult.fatal) {
        const error = new Error(lighthouseResult.message);
        error.stack = lighthouseResult.stack;
        throw error;
      }

      if (!lighthouseResult)
        throw new Error('Auditing failed to produce a result');

      await this._stopAndReattach();
      await this._onAuditComplete(lighthouseResult);
    } catch (err) {
      if (err instanceof Error)
        this._statusView.renderBugReport(err, this._auditURL);
    }
  }

  /**
   * @return {!Promise<undefined>}
   */
  async _stopAndReattach() {
    await this._protocolService.detach();

    const emulationModel = self.singleton(Emulation.DeviceModeModel);
    emulationModel.enabledSetting().set(this._emulationEnabledBefore);
    emulationModel.deviceOutlineSetting().set(this._emulationOutlineEnabledBefore);
    emulationModel.toolbarControlsEnabledSetting().set(true);
    Emulation.InspectedPagePlaceholder.instance().update(true);

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.Audits2Finished);
    const resourceTreeModel = SDK.targetManager.mainTarget().model(SDK.ResourceTreeModel);
    // reload to reset the page state
    await resourceTreeModel.navigate(this._auditURL);
    this._auditRunning = false;
    this._updateButton(this._auditURL);
  }

  /**
   * @param {string} auditURL
   */
  _updateButton(auditURL) {
    if (!this._dialog)
      return;
    this._startButton.classList.toggle('hidden', this._auditRunning);
    this._startButton.disabled = this._auditRunning;
    this._statusView.setVisible(this._auditRunning);
    this._auditSelectorForm.classList.toggle('hidden', this._auditRunning);
    if (this._auditRunning) {
      const parsedURL = (auditURL || '').asParsedURL();
      const pageHost = parsedURL && parsedURL.host;
      this._headerTitleElement.textContent =
          pageHost ? ls`Auditing ${pageHost}\u2026` : ls`Auditing your web page\u2026`;
    } else {
      this._headerTitleElement.textContent = Common.UIString('Audits to perform');
    }
  }
};
