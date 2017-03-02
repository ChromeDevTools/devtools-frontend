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
 * @implements {UI.ViewLocationResolver}
 * @unrestricted
 */
Settings.SettingsScreen = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('settings/settingsScreen.css');

    this.contentElement.tabIndex = 0;
    this.contentElement.classList.add('help-window-main');
    this.contentElement.classList.add('vbox');

    var settingsLabelElement = createElement('div');
    UI.createShadowRootWithCoreStyles(settingsLabelElement, 'settings/settingsScreen.css')
        .createChild('div', 'settings-window-title')
        .textContent = Common.UIString('Settings');

    this._tabbedLocation =
        UI.viewManager.createTabbedLocation(() => Settings.SettingsScreen._showSettingsScreen(), 'settings-view');
    var tabbedPane = this._tabbedLocation.tabbedPane();
    tabbedPane.leftToolbar().appendToolbarItem(new UI.ToolbarItem(settingsLabelElement));
    tabbedPane.setShrinkableTabs(false);
    tabbedPane.setVerticalTabLayout(true);
    var shortcutsView = new UI.SimpleView(Common.UIString('Shortcuts'));
    UI.shortcutsScreen.createShortcutsTabView().show(shortcutsView.element);
    this._tabbedLocation.appendView(shortcutsView);
    tabbedPane.show(this.contentElement);

    this.element.addEventListener('keydown', this._keyDown.bind(this), false);
    this._developerModeCounter = 0;
    this.setDefaultFocusedElement(this.contentElement);
  }

  /**
   * @param {string=} name
   */
  static _showSettingsScreen(name) {
    var settingsScreen =
        /** @type {!Settings.SettingsScreen} */ (self.runtime.sharedInstance(Settings.SettingsScreen));
    if (settingsScreen.isShowing())
      return;
    var dialog = new UI.Dialog();
    dialog.addCloseButton();
    settingsScreen.show(dialog.contentElement);
    dialog.show();
    settingsScreen._selectTab(name || 'preferences');
  }

  /**
   * @override
   * @param {string} locationName
   * @return {?UI.ViewLocation}
   */
  resolveLocation(locationName) {
    return this._tabbedLocation;
  }

  /**
   * @param {string} name
   */
  _selectTab(name) {
    UI.viewManager.showView(name);
  }

  /**
   * @param {!Event} event
   */
  _keyDown(event) {
    var shiftKeyCode = 16;
    if (event.keyCode === shiftKeyCode && ++this._developerModeCounter > 5)
      this.contentElement.classList.add('settings-developer-mode');
  }
};


/**
 * @unrestricted
 */
Settings.SettingsTab = class extends UI.VBox {
  /**
   * @param {string} name
   * @param {string=} id
   */
  constructor(name, id) {
    super();
    this.element.classList.add('settings-tab-container');
    if (id)
      this.element.id = id;
    var header = this.element.createChild('header');
    header.createChild('h3').createTextChild(name);
    this.containerElement = this.element.createChild('div', 'help-container-wrapper')
                                .createChild('div', 'settings-tab help-content help-container');
  }

  /**
   *  @param {string=} name
   *  @return {!Element}
   */
  _appendSection(name) {
    var block = this.containerElement.createChild('div', 'help-block');
    if (name)
      block.createChild('div', 'help-section-title').textContent = name;
    return block;
  }

  _createSelectSetting(name, options, setting) {
    var p = createElement('p');
    p.createChild('label').textContent = name;

    var select = p.createChild('select', 'chrome-select');
    var settingValue = setting.get();

    for (var i = 0; i < options.length; ++i) {
      var option = options[i];
      select.add(new Option(option[0], option[1]));
      if (settingValue === option[1])
        select.selectedIndex = i;
    }

    function changeListener(e) {
      // Don't use e.target.value to avoid conversion of the value to string.
      setting.set(options[select.selectedIndex][1]);
    }

    select.addEventListener('change', changeListener, false);
    return p;
  }
};

/**
 * @unrestricted
 */
Settings.GenericSettingsTab = class extends Settings.SettingsTab {
  constructor() {
    super(Common.UIString('Preferences'), 'preferences-tab-content');

    /** @const */
    var explicitSectionOrder =
        ['', 'Appearance', 'Elements', 'Sources', 'Network', 'Profiler', 'Console', 'Extensions'];
    /** @type {!Map<string, !Element>} */
    this._nameToSection = new Map();
    /** @type {!Map<string, !Element>} */
    this._nameToSettingElement = new Map();
    for (var sectionName of explicitSectionOrder)
      this._sectionElement(sectionName);
    self.runtime.extensions('setting').forEach(this._addSetting.bind(this));
    self.runtime.extensions(UI.SettingUI).forEach(this._addSettingUI.bind(this));

    this._appendSection().appendChild(
        UI.createTextButton(Common.UIString('Restore defaults and reload'), restoreAndReload));

    function restoreAndReload() {
      Common.settings.clearAll();
      Components.reload();
    }
  }

  /**
   * @param {!Runtime.Extension} extension
   * @return {boolean}
   */
  static isSettingVisible(extension) {
    var descriptor = extension.descriptor();
    if (!('title' in descriptor))
      return false;
    if (!('category' in descriptor))
      return false;
    return true;
  }

  /**
   * @param {!Runtime.Extension} extension
   */
  _addSetting(extension) {
    if (!Settings.GenericSettingsTab.isSettingVisible(extension))
      return;
    var descriptor = extension.descriptor();
    var sectionName = descriptor['category'];
    var settingName = descriptor['settingName'];
    var setting = Common.moduleSetting(settingName);
    var uiTitle = Common.UIString(extension.title());

    var sectionElement = this._sectionElement(sectionName);
    var settingControl;

    switch (descriptor['settingType']) {
      case 'boolean':
        settingControl = UI.SettingsUI.createSettingCheckbox(uiTitle, setting);
        break;
      case 'enum':
        var descriptorOptions = descriptor['options'];
        var options = new Array(descriptorOptions.length);
        for (var i = 0; i < options.length; ++i) {
          // The "raw" flag indicates text is non-i18n-izable.
          var optionName = descriptorOptions[i]['raw'] ? descriptorOptions[i]['text'] :
                                                         Common.UIString(descriptorOptions[i]['text']);
          options[i] = [optionName, descriptorOptions[i]['value']];
        }
        settingControl = this._createSelectSetting(uiTitle, options, setting);
        break;
      default:
        console.error('Invalid setting type: ' + descriptor['settingType']);
        return;
    }
    this._nameToSettingElement.set(settingName, settingControl);
    sectionElement.appendChild(/** @type {!Element} */ (settingControl));
  }

  /**
   * @param {!Runtime.Extension} extension
   */
  _addSettingUI(extension) {
    var descriptor = extension.descriptor();
    var sectionName = descriptor['category'] || '';
    extension.instance().then(appendCustomSetting.bind(this));

    /**
     * @param {!Object} object
     * @this {Settings.GenericSettingsTab}
     */
    function appendCustomSetting(object) {
      var settingUI = /** @type {!UI.SettingUI} */ (object);
      var element = settingUI.settingElement();
      if (element)
        this._sectionElement(sectionName).appendChild(element);
    }
  }

  /**
   * @param {string} sectionName
   * @return {!Element}
   */
  _sectionElement(sectionName) {
    var sectionElement = this._nameToSection.get(sectionName);
    if (!sectionElement) {
      var uiSectionName = sectionName && Common.UIString(sectionName);
      sectionElement = this._appendSection(uiSectionName);
      this._nameToSection.set(sectionName, sectionElement);
    }
    return sectionElement;
  }
};


/**
 * @unrestricted
 */
Settings.WorkspaceSettingsTab = class extends Settings.SettingsTab {
  constructor() {
    super(Common.UIString('Workspace'), 'workspace-tab-content');
    Workspace.isolatedFileSystemManager.addEventListener(
        Workspace.IsolatedFileSystemManager.Events.FileSystemAdded, this._fileSystemAdded, this);
    Workspace.isolatedFileSystemManager.addEventListener(
        Workspace.IsolatedFileSystemManager.Events.FileSystemRemoved, this._fileSystemRemoved, this);

    var folderExcludePatternInput = this._createFolderExcludePatternInput();
    folderExcludePatternInput.classList.add('folder-exclude-pattern');
    this.containerElement.appendChild(folderExcludePatternInput);

    if (Runtime.experiments.isEnabled('persistence2')) {
      var div = this.containerElement.createChild('div', 'settings-info-message');
      div.createTextChild(
          Common.UIString('Mappings are inferred automatically via the \'Persistence 2.0\' experiment. Please '));
      div.appendChild(UI.createExternalLink(
          'https://bugs.chromium.org/p/chromium/issues/entry?template=Defect%20report%20from%20user&components=Platform%3EDevTools%3EAuthoring&comment=DevTools%20failed%20to%20link%20network%20resource%20to%20filesystem.%0A%0APlatform%3A%20%3CLinux%2FWin%2FMac%3E%0AChrome%20version%3A%20%3Cyour%20chrome%20version%3E%0A%0AWhat%20are%20the%20details%20of%20your%20project%3F%0A-%20Source%20code%20(if%20any)%3A%20http%3A%2F%2Fgithub.com%2Fexample%2Fexample%0A-%20Build%20System%3A%20gulp%2Fgrunt%2Fwebpack%2Frollup%2F...%0A-%20HTTP%20server%3A%20node%20HTTP%2Fnginx%2Fapache...%0A%0AAssets%20failed%20to%20link%20(or%20incorrectly%20linked)%3A%0A1.%0A2.%0A3.%0A%0AIf%20possible%2C%20please%20attach%20a%20screenshot%20of%20network%20sources%20navigator%20which%20should%0Ashow%20which%20resources%20failed%20to%20map',
          Common.UIString('report')));
      div.createTextChild(Common.UIString(' any bugs.'));
    }

    this._fileSystemsListContainer = this.containerElement.createChild('div', '');

    this.containerElement.appendChild(
        UI.createTextButton(Common.UIString('Add folder\u2026'), this._addFileSystemClicked.bind(this)));

    /** @type {!Map<string, !Element>} */
    this._elementByPath = new Map();

    /** @type {!Map<string, !Settings.EditFileSystemView>} */
    this._mappingViewByPath = new Map();

    var fileSystems = Workspace.isolatedFileSystemManager.fileSystems();
    for (var i = 0; i < fileSystems.length; ++i)
      this._addItem(fileSystems[i]);
  }

  /**
   * @return {!Element}
   */
  _createFolderExcludePatternInput() {
    var p = createElement('p');
    var labelElement = p.createChild('label');
    labelElement.textContent = Common.UIString('Folder exclude pattern');
    var inputElement = p.createChild('input');
    inputElement.type = 'text';
    inputElement.style.width = '270px';
    var folderExcludeSetting = Workspace.isolatedFileSystemManager.workspaceFolderExcludePatternSetting();
    var setValue =
        UI.bindInput(inputElement, folderExcludeSetting.set.bind(folderExcludeSetting), regexValidator, false);
    folderExcludeSetting.addChangeListener(() => setValue.call(null, folderExcludeSetting.get()));
    setValue(folderExcludeSetting.get());
    return p;

    /**
     * @param {string} value
     * @return {boolean}
     */
    function regexValidator(value) {
      var regex;
      try {
        regex = new RegExp(value);
      } catch (e) {
      }
      return !!regex;
    }
  }

  /**
   * @param {!Workspace.IsolatedFileSystem} fileSystem
   */
  _addItem(fileSystem) {
    var element = this._renderFileSystem(fileSystem);
    this._elementByPath.set(fileSystem.path(), element);

    this._fileSystemsListContainer.appendChild(element);

    var mappingView = new Settings.EditFileSystemView(fileSystem.path());
    this._mappingViewByPath.set(fileSystem.path(), mappingView);
    mappingView.element.classList.add('file-system-mapping-view');
    mappingView.show(element);
  }

  /**
   * @param {!Workspace.IsolatedFileSystem} fileSystem
   * @return {!Element}
   */
  _renderFileSystem(fileSystem) {
    var fileSystemPath = fileSystem.path();
    var lastIndexOfSlash = fileSystemPath.lastIndexOf(Host.isWin() ? '\\' : '/');
    var folderName = fileSystemPath.substr(lastIndexOfSlash + 1);

    var element = createElementWithClass('div', 'file-system-container');
    var header = element.createChild('div', 'file-system-header');

    header.createChild('div', 'file-system-name').textContent = folderName;
    var path = header.createChild('div', 'file-system-path');
    path.textContent = fileSystemPath;
    path.title = fileSystemPath;

    var toolbar = new UI.Toolbar('');
    var button = new UI.ToolbarButton(Common.UIString('Remove'), 'largeicon-delete');
    button.addEventListener(UI.ToolbarButton.Events.Click, this._removeFileSystemClicked.bind(this, fileSystem));
    toolbar.appendToolbarItem(button);
    header.appendChild(toolbar.element);

    return element;
  }

  /**
   * @param {!Workspace.IsolatedFileSystem} fileSystem
   */
  _removeFileSystemClicked(fileSystem) {
    Workspace.isolatedFileSystemManager.removeFileSystem(fileSystem);
  }

  _addFileSystemClicked() {
    Workspace.isolatedFileSystemManager.addFileSystem();
  }

  _fileSystemAdded(event) {
    var fileSystem = /** @type {!Workspace.IsolatedFileSystem} */ (event.data);
    this._addItem(fileSystem);
  }

  _fileSystemRemoved(event) {
    var fileSystem = /** @type {!Workspace.IsolatedFileSystem} */ (event.data);

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
  }
};

/**
 * @unrestricted
 */
Settings.ExperimentsSettingsTab = class extends Settings.SettingsTab {
  constructor() {
    super(Common.UIString('Experiments'), 'experiments-tab-content');

    var experiments = Runtime.experiments.allConfigurableExperiments();
    if (experiments.length) {
      var experimentsSection = this._appendSection();
      experimentsSection.appendChild(this._createExperimentsWarningSubsection());
      for (var i = 0; i < experiments.length; ++i)
        experimentsSection.appendChild(this._createExperimentCheckbox(experiments[i]));
    }
  }

  /**
   * @return {!Element} element
   */
  _createExperimentsWarningSubsection() {
    var subsection = createElement('div');
    var warning = subsection.createChild('span', 'settings-experiments-warning-subsection-warning');
    warning.textContent = Common.UIString('WARNING:');
    subsection.createTextChild(' ');
    var message = subsection.createChild('span', 'settings-experiments-warning-subsection-message');
    message.textContent = Common.UIString('These experiments could be dangerous and may require restart.');
    return subsection;
  }

  _createExperimentCheckbox(experiment) {
    var label = UI.createCheckboxLabel(Common.UIString(experiment.title), experiment.isEnabled());
    var input = label.checkboxElement;
    input.name = experiment.name;
    function listener() {
      experiment.setEnabled(input.checked);
    }
    input.addEventListener('click', listener, false);

    var p = createElement('p');
    p.className = experiment.hidden && !experiment.isEnabled() ? 'settings-experiment-hidden' : '';
    p.appendChild(label);
    return p;
  }
};

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
Settings.SettingsScreen.ActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    switch (actionId) {
      case 'settings.show':
        Settings.SettingsScreen._showSettingsScreen();
        return true;
      case 'settings.documentation':
        InspectorFrontendHost.openInNewTab('https://developers.google.com/web/tools/chrome-devtools/');
        return true;
      case 'settings.shortcuts':
        Settings.SettingsScreen._showSettingsScreen(Common.UIString('Shortcuts'));
        return true;
    }
    return false;
  }
};

/**
 * @implements {Common.Revealer}
 * @unrestricted
 */
Settings.SettingsScreen.Revealer = class {
  /**
   * @override
   * @param {!Object} object
   * @return {!Promise}
   */
  reveal(object) {
    console.assert(object instanceof Common.Setting);
    var setting = /** @type {!Common.Setting} */ (object);
    var success = false;

    self.runtime.extensions('setting').forEach(revealModuleSetting);
    self.runtime.extensions(UI.SettingUI).forEach(revealSettingUI);
    self.runtime.extensions('view').forEach(revealSettingsView);

    return success ? Promise.resolve() : Promise.reject();

    /**
     * @param {!Runtime.Extension} extension
     */
    function revealModuleSetting(extension) {
      if (!Settings.GenericSettingsTab.isSettingVisible(extension))
        return;
      if (extension.descriptor()['settingName'] === setting.name) {
        InspectorFrontendHost.bringToFront();
        Settings.SettingsScreen._showSettingsScreen();
        success = true;
      }
    }

    /**
     * @param {!Runtime.Extension} extension
     */
    function revealSettingUI(extension) {
      var settings = extension.descriptor()['settings'];
      if (settings && settings.indexOf(setting.name) !== -1) {
        InspectorFrontendHost.bringToFront();
        Settings.SettingsScreen._showSettingsScreen();
        success = true;
      }
    }

    /**
     * @param {!Runtime.Extension} extension
     */
    function revealSettingsView(extension) {
      var location = extension.descriptor()['location'];
      if (location !== 'settings-view')
        return;
      var settings = extension.descriptor()['settings'];
      if (settings && settings.indexOf(setting.name) !== -1) {
        InspectorFrontendHost.bringToFront();
        Settings.SettingsScreen._showSettingsScreen(extension.descriptor()['id']);
        success = true;
      }
    }
  }
};
