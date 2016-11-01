/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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
 * @implements {WebInspector.TargetManager.Observer}
 * @unrestricted
 */
WebInspector.ProfileLauncherView = class extends WebInspector.VBox {
  /**
   * @param {!WebInspector.ProfilesPanel} profilesPanel
   */
  constructor(profilesPanel) {
    super();

    this._panel = profilesPanel;

    this.element.classList.add('profile-launcher-view');
    this.element.classList.add('panel-enabler-view');

    this._contentElement = this.element.createChild('div', 'profile-launcher-view-content');
    this._innerContentElement = this._contentElement.createChild('div');
    var targetSpan = this._contentElement.createChild('span');
    var selectTargetText = targetSpan.createChild('span');
    selectTargetText.textContent = WebInspector.UIString('Target:');
    var targetsSelect = targetSpan.createChild('select', 'chrome-select');
    new WebInspector.TargetsComboBoxController(targetsSelect, targetSpan);
    this._controlButton = createTextButton('', this._controlButtonClicked.bind(this), 'control-profiling');
    this._contentElement.appendChild(this._controlButton);
    this._recordButtonEnabled = true;
    this._loadButton =
        createTextButton(WebInspector.UIString('Load'), this._loadButtonClicked.bind(this), 'load-profile');
    this._contentElement.appendChild(this._loadButton);
    WebInspector.targetManager.observeTargets(this);
  }

  /**
   * @return {?WebInspector.SearchableView}
   */
  searchableView() {
    return null;
  }

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetAdded(target) {
    this._updateLoadButtonLayout();
  }

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetRemoved(target) {
    this._updateLoadButtonLayout();
  }

  _updateLoadButtonLayout() {
    this._loadButton.classList.toggle(
        'multi-target', WebInspector.targetManager.targets(WebInspector.Target.Capability.JS).length > 1);
  }

  /**
   * @param {!WebInspector.ProfileType} profileType
   */
  addProfileType(profileType) {
    var descriptionElement = this._innerContentElement.createChild('h1');
    descriptionElement.textContent = profileType.description;
    var decorationElement = profileType.decorationElement();
    if (decorationElement)
      this._innerContentElement.appendChild(decorationElement);
    this._isInstantProfile = profileType.isInstantProfile();
    this._isEnabled = profileType.isEnabled();
  }

  _controlButtonClicked() {
    this._panel.toggleRecord();
  }

  _loadButtonClicked() {
    this._panel.showLoadFromFileDialog();
  }

  _updateControls() {
    if (this._isEnabled && this._recordButtonEnabled)
      this._controlButton.removeAttribute('disabled');
    else
      this._controlButton.setAttribute('disabled', '');
    this._controlButton.title = this._recordButtonEnabled ? '' : WebInspector.anotherProfilerActiveLabel();
    if (this._isInstantProfile) {
      this._controlButton.classList.remove('running');
      this._controlButton.textContent = WebInspector.UIString('Take Snapshot');
    } else if (this._isProfiling) {
      this._controlButton.classList.add('running');
      this._controlButton.textContent = WebInspector.UIString('Stop');
    } else {
      this._controlButton.classList.remove('running');
      this._controlButton.textContent = WebInspector.UIString('Start');
    }
  }

  profileStarted() {
    this._isProfiling = true;
    this._updateControls();
  }

  profileFinished() {
    this._isProfiling = false;
    this._updateControls();
  }

  /**
   * @param {!WebInspector.ProfileType} profileType
   * @param {boolean} recordButtonEnabled
   */
  updateProfileType(profileType, recordButtonEnabled) {
    this._isInstantProfile = profileType.isInstantProfile();
    this._recordButtonEnabled = recordButtonEnabled;
    this._isEnabled = profileType.isEnabled();
    this._updateControls();
  }
};

/**
 * @unrestricted
 */
WebInspector.MultiProfileLauncherView = class extends WebInspector.ProfileLauncherView {
  /**
   * @param {!WebInspector.ProfilesPanel} profilesPanel
   */
  constructor(profilesPanel) {
    super(profilesPanel);

    this._selectedProfileTypeSetting = WebInspector.settings.createSetting('selectedProfileType', 'CPU');

    var header = this._innerContentElement.createChild('h1');
    header.textContent = WebInspector.UIString('Select profiling type');

    this._profileTypeSelectorForm = this._innerContentElement.createChild('form');

    this._innerContentElement.createChild('div', 'flexible-space');

    this._typeIdToOptionElement = {};
  }

  /**
   * @override
   * @param {!WebInspector.ProfileType} profileType
   */
  addProfileType(profileType) {
    var labelElement = createRadioLabel('profile-type', profileType.name);
    this._profileTypeSelectorForm.appendChild(labelElement);
    var optionElement = labelElement.radioElement;
    this._typeIdToOptionElement[profileType.id] = optionElement;
    optionElement._profileType = profileType;
    optionElement.style.hidden = true;
    optionElement.addEventListener('change', this._profileTypeChanged.bind(this, profileType), false);
    var descriptionElement = labelElement.createChild('p');
    descriptionElement.textContent = profileType.description;
    var decorationElement = profileType.decorationElement();
    if (decorationElement)
      labelElement.appendChild(decorationElement);
  }

  restoreSelectedProfileType() {
    var typeId = this._selectedProfileTypeSetting.get();
    if (!(typeId in this._typeIdToOptionElement))
      typeId = Object.keys(this._typeIdToOptionElement)[0];
    this._typeIdToOptionElement[typeId].checked = true;
    var type = this._typeIdToOptionElement[typeId]._profileType;
    this.dispatchEventToListeners(WebInspector.MultiProfileLauncherView.Events.ProfileTypeSelected, type);
  }

  /**
   * @override
   */
  _controlButtonClicked() {
    this._panel.toggleRecord();
  }

  /**
   * @override
   */
  _updateControls() {
    super._updateControls();
    var items = this._profileTypeSelectorForm.elements;
    for (var i = 0; i < items.length; ++i) {
      if (items[i].type === 'radio')
        items[i].disabled = this._isProfiling;
    }
  }

  /**
   * @param {!WebInspector.ProfileType} profileType
   */
  _profileTypeChanged(profileType) {
    this.dispatchEventToListeners(WebInspector.MultiProfileLauncherView.Events.ProfileTypeSelected, profileType);
    this._isInstantProfile = profileType.isInstantProfile();
    this._isEnabled = profileType.isEnabled();
    this._updateControls();
    this._selectedProfileTypeSetting.set(profileType.id);
  }

  /**
   * @override
   */
  profileStarted() {
    this._isProfiling = true;
    this._updateControls();
  }

  /**
   * @override
   */
  profileFinished() {
    this._isProfiling = false;
    this._updateControls();
  }
};

/** @enum {symbol} */
WebInspector.MultiProfileLauncherView.Events = {
  ProfileTypeSelected: Symbol('ProfileTypeSelected')
};
