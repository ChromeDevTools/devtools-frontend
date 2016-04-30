// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.AppManifestView = function()
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("resources/appManifestView.css");

    this._contentBox = this.contentElement.createChild("div", "app-content-box");
    this._contentBox.createChild("div", "app-manifest-title").textContent = WebInspector.UIString("App Manifest");
    this._urlElement = this._contentBox.createChild("div", "app-manifest-url link");
    this._identitySection = this._createSection(WebInspector.UIString("Identity"));
    this._presentationSection = this._createSection(WebInspector.UIString("Presentation"));
    var iconsSection = this._createSection(WebInspector.UIString("Icons"));
    this._iconsList = iconsSection.createChild("div", "app-manifest-icons");
    this._errorsSection = this._createSection(WebInspector.UIString("Errors and warnings"));
    this._errorsList = this._errorsSection.createChild("div", "app-manifest-errors");

    this._nameField = this._createField(this._identitySection, WebInspector.UIString("Name"));
    this._shortNameField = this._createField(this._identitySection, WebInspector.UIString("Short name"));

    this._startURLField = this._createField(this._presentationSection, WebInspector.UIString("Start URL"));

    var themeColorField = this._createField(this._presentationSection, WebInspector.UIString("Theme color"));
    this._themeColorSwatch = WebInspector.ColorSwatch.create();
    themeColorField.appendChild(this._themeColorSwatch);

    var backgroundColorField = this._createField(this._presentationSection, WebInspector.UIString("Background color"));
    this._backgroundColorSwatch = WebInspector.ColorSwatch.create();
    backgroundColorField.appendChild(this._backgroundColorSwatch);

    this._orientationField = this._createField(this._presentationSection, WebInspector.UIString("Orientation"));
    this._displayField = this._createField(this._presentationSection, WebInspector.UIString("Display"));

    WebInspector.targetManager.observeTargets(this);
}

WebInspector.AppManifestView.prototype = {
    /**
     * @param {string} title
     * @return {!Element}
     */
    _createSection: function(title)
    {
        var section = this._contentBox.createChild("div", "app-manifest-section");
        section.createChild("div", "app-manifest-section-title").textContent = title;
        return section;
    },

    /**
     * @param {string} title
     * @param {!Element} section
     * @return {!Element}
     */
    _createField: function(section, title)
    {
        var row = section.createChild("div", "app-manifest-field");
        row.createChild("div", "app-manifest-field-name").textContent = title;
        return row.createChild("div", "app-manifest-field-value");
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        if (this._target)
            return;
        this._target = target;

        this._updateManifest();
        WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.MainFrameNavigated, this._updateManifest, this);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
    },

    _updateManifest: function()
    {
        this._target.resourceTreeModel.fetchAppManifest(this._renderManifest.bind(this));
    },

    /**
     * @param {string} url
     * @param {?string} data
     * @param {!Array<!PageAgent.AppManifestError>} errors
     */
    _renderManifest: function(url, data, errors)
    {
        this._urlElement.removeChildren();
        if (url)
            this._urlElement.appendChild(WebInspector.linkifyResourceAsNode(url, undefined, undefined, undefined, undefined, url));
        this._errorsList.removeChildren();
        this._errorsSection.classList.toggle("hidden", !errors.length);
        for (var error of errors)
            this._errorsList.appendChild(createLabel(error.message, error.critical ? "error-icon" : "warning-icon"));

        if (!data)
            data = "{}";

        var parsedManifest = JSON.parse(data);
        this._nameField.textContent = stringProperty("name");
        this._shortNameField.textContent = stringProperty("short_name");
        this._startURLField.removeChildren();
        var startURL = stringProperty("start_url");
        if (startURL)
            this._startURLField.appendChild(WebInspector.linkifyResourceAsNode(/** @type {string} */(WebInspector.ParsedURL.completeURL(url, startURL)), undefined, undefined, undefined, undefined, startURL));

        this._themeColorSwatch.classList.toggle("hidden", !stringProperty("theme_color"));
        this._themeColorSwatch.setColorText(stringProperty("theme_color") || "white");
        this._backgroundColorSwatch.classList.toggle("hidden", !stringProperty("background_color"));
        this._backgroundColorSwatch.setColorText(stringProperty("background_color") || "white");

        this._orientationField.textContent = stringProperty("orientation");
        this._displayField.textContent = stringProperty("display");

        var icons = parsedManifest["icons"] || [];
        this._iconsList.removeChildren();
        for (var icon of icons) {
            var title = (icon["sizes"] || "") + "\n" + (icon["type"] || "");
            var field = this._createField(this._iconsList, title);
            var imageElement = field.createChild("img");
            imageElement.src = WebInspector.ParsedURL.completeURL(url, icon["src"]);
        }

        /**
         * @param {string} name
         * @return {string}
         */
        function stringProperty(name)
        {
            var value = parsedManifest[name];
            if (typeof value !== "string")
                return "";
            return value;
        }
    },

    __proto__: WebInspector.VBox.prototype
}
