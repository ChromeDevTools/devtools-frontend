/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
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
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.OverridesView = function()
{
    WebInspector.VBox.call(this);
    this.setMinimumSize(0, 30);
    this.registerRequiredCSS("emulation/overrides.css");
    this.element.classList.add("overrides-view");

    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.setShrinkableTabs(false);
    this._tabbedPane.setVerticalTabLayout(true);

    new WebInspector.OverridesView.DeviceTab().appendAsTab(this._tabbedPane);
    new WebInspector.OverridesView.NetworkTab().appendAsTab(this._tabbedPane);

    this._lastSelectedTabSetting = WebInspector.settings.createSetting("lastSelectedEmulateTab", "device");
    this._tabbedPane.selectTab(this._lastSelectedTabSetting.get());
    this._tabbedPane.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
    this._tabbedPane.show(this.element);

    var resetButtonElement = createTextButton(WebInspector.UIString("Reset"), WebInspector.overridesSupport.reset.bind(WebInspector.overridesSupport));
    resetButtonElement.id = "overrides-reset-button";
    this._tabbedPane.appendAfterTabStrip(resetButtonElement);

    var disableButtonElement = createTextButton(WebInspector.UIString("Disable"), this._toggleEmulationEnabled.bind(this), "overrides-disable-button");
    disableButtonElement.id = "overrides-disable-button";
    this._tabbedPane.appendAfterTabStrip(disableButtonElement);

    this._splashScreenElement = this.element.createChild("div", "overrides-splash-screen");
    this._splashScreenElement.appendChild(createTextButton(WebInspector.UIString("Enable emulation"), this._toggleEmulationEnabled.bind(this), "overrides-enable-button"));

    this._unavailableSplashScreenElement = this.element.createChild("div", "overrides-splash-screen");
    this._unavailableSplashScreenElement.createTextChild(WebInspector.UIString("Emulation is not available."));

    this._warningFooter = this.element.createChild("div", "overrides-footer");
    this._overridesWarningUpdated();

    WebInspector.overridesSupport.addEventListener(WebInspector.OverridesSupport.Events.OverridesWarningUpdated, this._overridesWarningUpdated, this);
    WebInspector.overridesSupport.addEventListener(WebInspector.OverridesSupport.Events.EmulationStateChanged, this._emulationStateChanged, this);
    this._emulationStateChanged();
}

WebInspector.OverridesView.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _tabSelected: function(event)
    {
        this._lastSelectedTabSetting.set(this._tabbedPane.selectedTabId);
    },

    _overridesWarningUpdated: function()
    {
        var message = WebInspector.overridesSupport.warningMessage();
        this._warningFooter.classList.toggle("hidden", !message);
        this._warningFooter.textContent = message;
    },

    _toggleEmulationEnabled: function()
    {
        WebInspector.overridesSupport.setEmulationEnabled(!WebInspector.overridesSupport.emulationEnabled());
    },

    _emulationStateChanged: function()
    {
        this._unavailableSplashScreenElement.classList.toggle("hidden", WebInspector.overridesSupport.canEmulate());
        this._tabbedPane.element.classList.toggle("hidden", !WebInspector.overridesSupport.emulationEnabled());
        this._splashScreenElement.classList.toggle("hidden", WebInspector.overridesSupport.emulationEnabled() || !WebInspector.overridesSupport.canEmulate());
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {string} id
 * @param {string} name
 * @param {!Array.<!WebInspector.Setting>} settings
 * @param {!Array.<function():boolean>=} predicates
 */
WebInspector.OverridesView.Tab = function(id, name, settings, predicates)
{
    WebInspector.VBox.call(this);
    this._id = id;
    this._name = name;
    this._settings = settings;
    this._predicates = predicates || [];
    for (var i = 0; i < settings.length; ++i)
        settings[i].addChangeListener(this.updateActiveState, this);
}

WebInspector.OverridesView.Tab.prototype = {
    /**
     * @param {!WebInspector.TabbedPane} tabbedPane
     */
    appendAsTab: function(tabbedPane)
    {
        this._tabbedPane = tabbedPane;
        tabbedPane.appendTab(this._id, this._name, this);
        this.updateActiveState();
    },

    updateActiveState: function()
    {
        if (!this._tabbedPane)
            return;
        var active = false;
        for (var i = 0; !active && i < this._settings.length; ++i)
            active = this._settings[i].get();
        for (var i = 0; !active && i < this._predicates.length; ++i)
            active = this._predicates[i]();
        this._tabbedPane.toggleTabClass(this._id, "overrides-activate", active);
    },

    /**
     * @param {string} name
     * @param {!WebInspector.Setting} setting
     * @param {function(boolean)=} callback
     */
    _createSettingCheckbox: function(name, setting, callback)
    {
        var checkbox = WebInspector.SettingsUI.createSettingCheckbox(name, setting, true);

        function changeListener(value)
        {
            callback(setting.get());
        }

        if (callback)
            setting.addChangeListener(changeListener);

        return checkbox;
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.OverridesView.Tab}
 */
WebInspector.OverridesView.DeviceTab = function()
{
    WebInspector.OverridesView.Tab.call(this, "device", WebInspector.UIString("Device"),  [
        WebInspector.overridesSupport.settings.emulateResolution,
        WebInspector.overridesSupport.settings.deviceScaleFactor,
        WebInspector.overridesSupport.settings.emulateMobile,
        WebInspector.overridesSupport.settings.emulateTouch
    ]);
    this.element.classList.add("overrides-device");

    this.element.appendChild(this._createDeviceElement());

    var footnote = this.element.createChild("p", "help-footnote");
    footnote.appendChild(WebInspector.linkifyDocumentationURLAsNode("setup/remote-debugging/remote-debugging", WebInspector.UIString("More information about screen emulation")));
}

WebInspector.OverridesView.DeviceTab.prototype = {
    _createDeviceElement: function()
    {
        var fieldsetElement = createElement("fieldset");
        fieldsetElement.id = "metrics-override-section";

        var deviceModelElement = fieldsetElement.createChild("p", "overrides-device-model-section");
        deviceModelElement.createChild("span").textContent = WebInspector.UIString("Model:");

        var rotateButton = createElement("button");
        rotateButton.textContent = " \u21C4 ";
        var deviceSelect = new WebInspector.DeviceSelect(rotateButton, null);
        deviceModelElement.appendChild(deviceSelect.element);

        var emulateResolutionCheckbox = WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Emulate screen resolution"), WebInspector.overridesSupport.settings.emulateResolution, true);
        fieldsetElement.appendChild(emulateResolutionCheckbox);
        var resolutionFieldset = WebInspector.SettingsUI.createSettingFieldset(WebInspector.overridesSupport.settings.emulateResolution);
        fieldsetElement.appendChild(resolutionFieldset);

        var tableElement = resolutionFieldset.createChild("table");
        var rowElement = tableElement.createChild("tr");
        var cellElement = rowElement.createChild("td");
        cellElement.createTextChild(WebInspector.UIString("Resolution:"));
        cellElement = rowElement.createChild("td");

        var widthOverrideInput = WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceWidth, true, 4, "80px", WebInspector.OverridesSupport.deviceSizeValidator, true, true, WebInspector.UIString("\u2013"));
        cellElement.appendChild(widthOverrideInput);
        var heightOverrideInput = WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceHeight, true, 4, "80px", WebInspector.OverridesSupport.deviceSizeValidator, true, true, WebInspector.UIString("\u2013"));
        cellElement.appendChild(heightOverrideInput);

        rowElement = tableElement.createChild("tr");
        cellElement = rowElement.createChild("td");
        cellElement.colSpan = 4;

        rowElement = tableElement.createChild("tr");
        rowElement.title = WebInspector.UIString("Ratio between a device's physical pixels and device-independent pixels");
        rowElement.createChild("td").createTextChild(WebInspector.UIString("Device pixel ratio:"));
        rowElement.createChild("td").appendChild(WebInspector.SettingsUI.createSettingInputField("", WebInspector.overridesSupport.settings.deviceScaleFactor, true, 4, "80px", WebInspector.OverridesSupport.deviceScaleFactorValidator, true, true, WebInspector.UIString("\u2013")));

        var mobileCheckbox = this._createSettingCheckbox(WebInspector.UIString("Emulate mobile"), WebInspector.overridesSupport.settings.emulateMobile);
        mobileCheckbox.title = WebInspector.UIString("Enable meta viewport, overlay scrollbars, text autosizing and default 980px body width");
        fieldsetElement.appendChild(mobileCheckbox);

        fieldsetElement.appendChild(this._createSettingCheckbox(WebInspector.UIString("Shrink to fit"), WebInspector.overridesSupport.settings.deviceFitWindow));

        fieldsetElement.appendChild(this._createSettingCheckbox(WebInspector.UIString("Emulate touch screen"), WebInspector.overridesSupport.settings.emulateTouch));
        return fieldsetElement;
    },

    __proto__: WebInspector.OverridesView.Tab.prototype
}

/**
 * @constructor
 * @extends {WebInspector.OverridesView.Tab}
 */
WebInspector.OverridesView.NetworkTab = function()
{
    WebInspector.OverridesView.Tab.call(this, "network", WebInspector.UIString("Network"), [], [this._userAgentOverrideEnabled.bind(this)]);
    this.element.classList.add("overrides-network");
    this._createUserAgentSection();
}

WebInspector.OverridesView.NetworkTab.prototype = {
    /**
     * @return {boolean}
     */
    _userAgentOverrideEnabled: function()
    {
        return !!WebInspector.overridesSupport.settings.userAgent.get();
    },

    _createUserAgentSection: function()
    {
        var fieldsetElement = this.element.createChild("fieldset");
        fieldsetElement.createChild("label").textContent = WebInspector.UIString("Spoof user agent:");
        var selectAndInput = WebInspector.OverridesUI.createUserAgentSelectAndInput();
        fieldsetElement.appendChild(selectAndInput.select);
        fieldsetElement.appendChild(selectAndInput.input);

        WebInspector.overridesSupport.settings.userAgent.addChangeListener(this.updateActiveState, this);
    },

    __proto__: WebInspector.OverridesView.Tab.prototype
}


/**
 * @constructor
 * @implements {WebInspector.Revealer}
 */
WebInspector.OverridesView.Revealer = function()
{
}

WebInspector.OverridesView.Revealer.prototype = {
    /**
     * @override
     * @param {!Object} overridesSupport
     * @return {!Promise}
     */
    reveal: function(overridesSupport)
    {
        WebInspector.inspectorView.showViewInDrawer("emulation");
        return Promise.resolve();
    }
}
