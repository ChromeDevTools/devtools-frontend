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
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.ViewLocationResolver}
 */
WebInspector.SettingsScreen = function()
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("settings/settingsScreen.css");

    this.contentElement.tabIndex = 0;
    this.contentElement.classList.add("help-window-main");
    this.contentElement.classList.add("vbox");

    var settingsLabelElement = createElement("div");
    WebInspector.createShadowRootWithCoreStyles(settingsLabelElement, "settings/settingsScreen.css").createChild("div", "settings-window-title").textContent = WebInspector.UIString("Settings");

    this._tabbedLocation = WebInspector.viewManager.createTabbedLocation(() => WebInspector.SettingsScreen._showSettingsScreen(), "settings-view");
    var tabbedPane = this._tabbedLocation.tabbedPane();
    tabbedPane.leftToolbar().appendToolbarItem(new WebInspector.ToolbarItem(settingsLabelElement));
    tabbedPane.setShrinkableTabs(false);
    tabbedPane.setVerticalTabLayout(true);
    var shortcutsView = new WebInspector.SimpleView(WebInspector.UIString("Shortcuts"));
    WebInspector.shortcutsScreen.createShortcutsTabView().show(shortcutsView.element);
    this._tabbedLocation.appendView(shortcutsView);
    tabbedPane.show(this.contentElement);

    this.element.addEventListener("keydown", this._keyDown.bind(this), false);
    this._developerModeCounter = 0;
    this.setDefaultFocusedElement(this.contentElement);
}

/**
 * @param {string=} name
 */
WebInspector.SettingsScreen._showSettingsScreen = function(name)
{
    var settingsScreen = /** @type {!WebInspector.SettingsScreen} */ (self.runtime.sharedInstance(WebInspector.SettingsScreen));
    if (settingsScreen.isShowing())
        return;
    var dialog = new WebInspector.Dialog();
    dialog.addCloseButton();
    settingsScreen.show(dialog.element);
    dialog.show();
    settingsScreen._selectTab(name || "preferences");
}

WebInspector.SettingsScreen.prototype = {
    /**
     * @override
     * @param {string} locationName
     * @return {?WebInspector.ViewLocation}
     */
    resolveLocation: function(locationName)
    {
        return this._tabbedLocation;
    },

    /**
     * @param {string} name
     */
    _selectTab: function(name)
    {
        WebInspector.viewManager.showView(name);
    },

    /**
     * @param {!Event} event
     */
    _keyDown: function(event)
    {
        var shiftKeyCode = 16;
        if (event.keyCode === shiftKeyCode && ++this._developerModeCounter > 5)
            this.contentElement.classList.add("settings-developer-mode");
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {string} name
 * @param {string=} id
 */
WebInspector.SettingsTab = function(name, id)
{
    WebInspector.VBox.call(this);
    this.element.classList.add("settings-tab-container");
    if (id)
        this.element.id = id;
    var header = this.element.createChild("header");
    header.createChild("h3").createTextChild(name);
    this.containerElement = this.element.createChild("div", "help-container-wrapper").createChild("div", "settings-tab help-content help-container");
}

WebInspector.SettingsTab.prototype = {
    /**
     *  @param {string=} name
     *  @return {!Element}
     */
    _appendSection: function(name)
    {
        var block = this.containerElement.createChild("div", "help-block");
        if (name)
            block.createChild("div", "help-section-title").textContent = name;
        return block;
    },

    _createSelectSetting: function(name, options, setting)
    {
        var p = createElement("p");
        p.createChild("label").textContent = name;

        var select = p.createChild("select", "chrome-select");
        var settingValue = setting.get();

        for (var i = 0; i < options.length; ++i) {
            var option = options[i];
            select.add(new Option(option[0], option[1]));
            if (settingValue === option[1])
                select.selectedIndex = i;
        }

        function changeListener(e)
        {
            // Don't use e.target.value to avoid conversion of the value to string.
            setting.set(options[select.selectedIndex][1]);
        }

        select.addEventListener("change", changeListener, false);
        return p;
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SettingsTab}
 */
WebInspector.GenericSettingsTab = function()
{
    WebInspector.SettingsTab.call(this, WebInspector.UIString("Preferences"), "preferences-tab-content");

    /** @const */
    var explicitSectionOrder = ["", "Appearance", "Elements", "Sources", "Network", "Profiler", "Console", "Extensions"];
    /** @type {!Map<string, !Element>} */
    this._nameToSection = new Map();
    /** @type {!Map<string, !Element>} */
    this._nameToSettingElement = new Map();
    for (var sectionName of explicitSectionOrder)
        this._sectionElement(sectionName);
    self.runtime.extensions("setting").forEach(this._addSetting.bind(this));
    self.runtime.extensions(WebInspector.SettingUI).forEach(this._addSettingUI.bind(this));

    this._appendSection().appendChild(createTextButton(WebInspector.UIString("Restore defaults and reload"), restoreAndReload));

    function restoreAndReload()
    {
        WebInspector.settings.clearAll();
        WebInspector.reload();
    }
}

/**
 * @param {!Runtime.Extension} extension
 * @return {boolean}
 */
WebInspector.GenericSettingsTab.isSettingVisible = function(extension)
{
    var descriptor = extension.descriptor();
    if (!("title" in descriptor))
        return false;
    if (!("category" in descriptor))
        return false;
    return true;
}

WebInspector.GenericSettingsTab.prototype = {
    /**
     * @param {!Runtime.Extension} extension
     */
    _addSetting: function(extension)
    {
        if (!WebInspector.GenericSettingsTab.isSettingVisible(extension))
            return;
        var descriptor = extension.descriptor();
        var sectionName = descriptor["category"];
        var settingName = descriptor["settingName"];
        var setting = WebInspector.moduleSetting(settingName);
        var uiTitle = WebInspector.UIString(extension.title());

        var sectionElement = this._sectionElement(sectionName);
        var settingControl;

        switch (descriptor["settingType"]) {
        case "boolean":
            settingControl = WebInspector.SettingsUI.createSettingCheckbox(uiTitle, setting);
            break;
        case "enum":
            var descriptorOptions = descriptor["options"];
            var options = new Array(descriptorOptions.length);
            for (var i = 0; i < options.length; ++i) {
                // The "raw" flag indicates text is non-i18n-izable.
                var optionName = descriptorOptions[i]["raw"] ? descriptorOptions[i]["text"] : WebInspector.UIString(descriptorOptions[i]["text"]);
                options[i] = [optionName, descriptorOptions[i]["value"]];
            }
            settingControl = this._createSelectSetting(uiTitle, options, setting);
            break;
        default:
            console.error("Invalid setting type: " + descriptor["settingType"]);
            return;
        }
        this._nameToSettingElement.set(settingName, settingControl);
        sectionElement.appendChild(/** @type {!Element} */ (settingControl));
    },

    /**
     * @param {!Runtime.Extension} extension
     */
    _addSettingUI: function(extension)
    {
        var descriptor = extension.descriptor();
        var sectionName = descriptor["category"] || "";
        extension.instance().then(appendCustomSetting.bind(this));

        /**
         * @param {!Object} object
         * @this {WebInspector.GenericSettingsTab}
         */
        function appendCustomSetting(object)
        {
            var settingUI = /** @type {!WebInspector.SettingUI} */ (object);
            var element = settingUI.settingElement();
            if (element)
                this._sectionElement(sectionName).appendChild(element);
        }
    },

    /**
     * @param {string} sectionName
     * @return {!Element}
     */
    _sectionElement: function(sectionName)
    {
        var sectionElement = this._nameToSection.get(sectionName);
        if (!sectionElement) {
            var uiSectionName = sectionName && WebInspector.UIString(sectionName);
            sectionElement = this._appendSection(uiSectionName);
            this._nameToSection.set(sectionName, sectionElement);
        }
        return sectionElement;
    },

    __proto__: WebInspector.SettingsTab.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SettingsTab}
 */
WebInspector.WorkspaceSettingsTab = function()
{
    WebInspector.SettingsTab.call(this, WebInspector.UIString("Workspace"), "workspace-tab-content");
    WebInspector.isolatedFileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemAdded, this._fileSystemAdded, this);
    WebInspector.isolatedFileSystemManager.addEventListener(WebInspector.IsolatedFileSystemManager.Events.FileSystemRemoved, this._fileSystemRemoved, this);

    var folderExcludePatternInput = this._createFolderExcludePatternInput();
    folderExcludePatternInput.classList.add("folder-exclude-pattern");
    this.containerElement.appendChild(folderExcludePatternInput);

    this._fileSystemsListContainer = this.containerElement.createChild("div", "");

    this.containerElement.appendChild(createTextButton(WebInspector.UIString("Add folder\u2026"), this._addFileSystemClicked.bind(this)));

    /** @type {!Map<string, !Element>} */
    this._elementByPath = new Map();

    /** @type {!Map<string, !WebInspector.EditFileSystemView>} */
    this._mappingViewByPath = new Map();

    var fileSystems = WebInspector.isolatedFileSystemManager.fileSystems();
    for (var i = 0; i < fileSystems.length; ++i)
        this._addItem(fileSystems[i]);
}

WebInspector.WorkspaceSettingsTab.prototype = {
    /**
     * @return {!Element}
     */
    _createFolderExcludePatternInput: function()
    {
        var p = createElement("p");
        var labelElement = p.createChild("label");
        labelElement.textContent = WebInspector.UIString("Folder exclude pattern");
        var inputElement = p.createChild("input");
        inputElement.type = "text";
        inputElement.style.width = "270px";
        var folderExcludeSetting = WebInspector.isolatedFileSystemManager.workspaceFolderExcludePatternSetting();
        var setValue = WebInspector.bindInput(inputElement, folderExcludeSetting.set.bind(folderExcludeSetting), regexValidator, false);
        folderExcludeSetting.addChangeListener(() => setValue.call(null, folderExcludeSetting.get()));
        setValue(folderExcludeSetting.get());
        return p;

        /**
         * @param {string} value
         * @return {boolean}
         */
        function regexValidator(value)
        {
            var regex;
            try {
                regex = new RegExp(value);
            } catch (e) {
            }
            return !!regex;
        }
    },

    /**
     * @param {!WebInspector.IsolatedFileSystem} fileSystem
     */
    _addItem: function(fileSystem)
    {
        var element = this._renderFileSystem(fileSystem);
        this._elementByPath.set(fileSystem.path(), element);

        this._fileSystemsListContainer.appendChild(element);

        var mappingView = new WebInspector.EditFileSystemView(fileSystem.path());
        this._mappingViewByPath.set(fileSystem.path(), mappingView);
        mappingView.element.classList.add("file-system-mapping-view");
        mappingView.show(element);
    },

    /**
     * @param {!WebInspector.IsolatedFileSystem} fileSystem
     * @return {!Element}
     */
    _renderFileSystem: function(fileSystem)
    {
        var fileSystemPath = fileSystem.path();
        var lastIndexOfSlash = fileSystemPath.lastIndexOf(WebInspector.isWin() ? "\\" : "/");
        var folderName = fileSystemPath.substr(lastIndexOfSlash + 1);

        var element = createElementWithClass("div", "file-system-container");
        var header = element.createChild("div", "file-system-header");

        header.createChild("div", "file-system-name").textContent = folderName;
        var path = header.createChild("div", "file-system-path");
        path.textContent = fileSystemPath;
        path.title = fileSystemPath;

        var toolbar = new WebInspector.Toolbar("");
        var button = new WebInspector.ToolbarButton(WebInspector.UIString("Remove"), "delete-toolbar-item");
        button.addEventListener("click", this._removeFileSystemClicked.bind(this, fileSystem));
        toolbar.appendToolbarItem(button);
        header.appendChild(toolbar.element);

        return element;
    },

    /**
     * @param {!WebInspector.IsolatedFileSystem} fileSystem
     */
    _removeFileSystemClicked: function(fileSystem)
    {
        WebInspector.isolatedFileSystemManager.removeFileSystem(fileSystem);
    },

    _addFileSystemClicked: function()
    {
        WebInspector.isolatedFileSystemManager.addFileSystem();
    },

    _fileSystemAdded: function(event)
    {
        var fileSystem = /** @type {!WebInspector.IsolatedFileSystem} */ (event.data);
        this._addItem(fileSystem);
    },

    _fileSystemRemoved: function(event)
    {
        var fileSystem = /** @type {!WebInspector.IsolatedFileSystem} */ (event.data);

        var mappingView = this._mappingViewByPath.get(fileSystem.path());
        if (mappingView) {
            mappingView.dispose();
            this._mappingViewByPath.delete(fileSystem.path());
        }

        var element = this._elementByPath.get(fileSystem.path());
        if (element) {
            this._elementByPath.delete(fileSystem.path());
            element.remove();
        }
    },

    __proto__: WebInspector.SettingsTab.prototype
}


/**
 * @constructor
 * @extends {WebInspector.SettingsTab}
 */
WebInspector.ExperimentsSettingsTab = function()
{
    WebInspector.SettingsTab.call(this, WebInspector.UIString("Experiments"), "experiments-tab-content");

    var experiments = Runtime.experiments.allConfigurableExperiments();
    if (experiments.length) {
        var experimentsSection = this._appendSection();
        experimentsSection.appendChild(this._createExperimentsWarningSubsection());
        for (var i = 0; i < experiments.length; ++i)
            experimentsSection.appendChild(this._createExperimentCheckbox(experiments[i]));
    }
}

WebInspector.ExperimentsSettingsTab.prototype = {
    /**
     * @return {!Element} element
     */
    _createExperimentsWarningSubsection: function()
    {
        var subsection = createElement("div");
        var warning = subsection.createChild("span", "settings-experiments-warning-subsection-warning");
        warning.textContent = WebInspector.UIString("WARNING:");
        subsection.createTextChild(" ");
        var message = subsection.createChild("span", "settings-experiments-warning-subsection-message");
        message.textContent = WebInspector.UIString("These experiments could be dangerous and may require restart.");
        return subsection;
    },

    _createExperimentCheckbox: function(experiment)
    {
        var label = createCheckboxLabel(WebInspector.UIString(experiment.title), experiment.isEnabled());
        var input = label.checkboxElement;
        input.name = experiment.name;
        function listener()
        {
            experiment.setEnabled(input.checked);
        }
        input.addEventListener("click", listener, false);

        var p = createElement("p");
        p.className = experiment.hidden && !experiment.isEnabled() ? "settings-experiment-hidden" : "";
        p.appendChild(label);
        return p;
    },

    __proto__: WebInspector.SettingsTab.prototype
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.SettingsScreen.ActionDelegate = function() { }

WebInspector.SettingsScreen.ActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        switch (actionId) {
        case "settings.show":
            WebInspector.SettingsScreen._showSettingsScreen();
            return true;
        case "settings.help":
            InspectorFrontendHost.openInNewTab("https://developers.google.com/web/tools/chrome-devtools/");
            return true;
        case "settings.shortcuts":
            WebInspector.SettingsScreen._showSettingsScreen(WebInspector.UIString("Shortcuts"));
            return true;
        }
        return false;
    }
}

/**
 * @constructor
 * @implements {WebInspector.Revealer}
 */
WebInspector.SettingsScreen.Revealer = function() { }

WebInspector.SettingsScreen.Revealer.prototype = {
    /**
     * @override
     * @param {!Object} object
     * @return {!Promise}
     */
    reveal: function(object)
    {
        console.assert(object instanceof WebInspector.Setting);
        var setting = /** @type {!WebInspector.Setting} */ (object);
        var success = false;

        self.runtime.extensions("setting").forEach(revealModuleSetting);
        self.runtime.extensions(WebInspector.SettingUI).forEach(revealSettingUI);
        self.runtime.extensions("view").forEach(revealSettingsView);

        return success ? Promise.resolve() : Promise.reject();

        /**
         * @param {!Runtime.Extension} extension
         */
        function revealModuleSetting(extension)
        {
            if (!WebInspector.GenericSettingsTab.isSettingVisible(extension))
                return;
            if (extension.descriptor()["settingName"] === setting.name) {
                InspectorFrontendHost.bringToFront();
                WebInspector.SettingsScreen._showSettingsScreen();
                success = true;
            }
        }

        /**
         * @param {!Runtime.Extension} extension
         */
        function revealSettingUI(extension)
        {
            var settings = extension.descriptor()["settings"];
            if (settings && settings.indexOf(setting.name) !== -1) {
                InspectorFrontendHost.bringToFront();
                WebInspector.SettingsScreen._showSettingsScreen();
                success = true;
            }
        }

        /**
         * @param {!Runtime.Extension} extension
         */
        function revealSettingsView(extension)
        {
            var location = extension.descriptor()["location"];
            if (location !== "settings-view")
                return;
            var settings = extension.descriptor()["settings"];
            if (settings && settings.indexOf(setting.name) !== -1) {
                InspectorFrontendHost.bringToFront();
                WebInspector.SettingsScreen._showSettingsScreen(extension.descriptor()["id"]);
                success = true;
            }
        }
    }
}
