// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Persistence.WorkspaceSettingsTab = class extends UI.VBox {
  constructor() {
    super();
    this.registerRequiredCSS('persistence/workspaceSettingsTab.css');

    var header = this.element.createChild('header');
    header.createChild('h3').createTextChild(Common.UIString('Workspace'));

    this.containerElement = this.element.createChild('div', 'help-container-wrapper')
                                .createChild('div', 'settings-tab help-content help-container');

    Persistence.isolatedFileSystemManager.addEventListener(
        Persistence.IsolatedFileSystemManager.Events.FileSystemAdded,
        event => this._fileSystemAdded(/** @type {!Persistence.IsolatedFileSystem} */ (event.data)), this);
    Persistence.isolatedFileSystemManager.addEventListener(
        Persistence.IsolatedFileSystemManager.Events.FileSystemRemoved,
        event => this._fileSystemRemoved(/** @type {!Persistence.IsolatedFileSystem} */ (event.data)), this);
    Persistence.networkPersistenceManager.addEventListener(
        Persistence.NetworkPersistenceManager.Events.ProjectDomainChanged,
        event => this._overridesProjectChanged(
            /** @type {!Persistence.FileSystemWorkspaceBinding.FileSystem} */ (event.data)),
        this);

    var folderExcludePatternInput = this._createFolderExcludePatternInput();
    folderExcludePatternInput.classList.add('folder-exclude-pattern');
    this.containerElement.appendChild(folderExcludePatternInput);

    if (Runtime.experiments.isEnabled('persistence2')) {
      var div = this.containerElement.createChild('div', 'settings-info-message');
      div.createTextChild(Common.UIString('Mappings are inferred automatically. Please '));
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

    /** @type {!Map<string, !Persistence.EditFileSystemView>} */
    this._mappingViewByPath = new Map();

    var fileSystems = Persistence.isolatedFileSystemManager.fileSystems();
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
    var inputElement = UI.createInput('', 'text');
    p.appendChild(inputElement);
    inputElement.style.width = '270px';
    var folderExcludeSetting = Persistence.isolatedFileSystemManager.workspaceFolderExcludePatternSetting();
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
   * @param {!Persistence.IsolatedFileSystem} fileSystem
   */
  _addItem(fileSystem) {
    if (Persistence.networkPersistenceManager.projectForFileSystem(fileSystem))
      return;
    var element = this._renderFileSystem(fileSystem);
    this._elementByPath.set(fileSystem.path(), element);

    this._fileSystemsListContainer.appendChild(element);

    var mappingView = new Persistence.EditFileSystemView(fileSystem.path());
    this._mappingViewByPath.set(fileSystem.path(), mappingView);
    mappingView.element.classList.add('file-system-mapping-view');
    mappingView.show(element);
  }

  /**
   * @param {!Persistence.IsolatedFileSystem} fileSystem
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
   * @param {!Persistence.IsolatedFileSystem} fileSystem
   */
  _removeFileSystemClicked(fileSystem) {
    Persistence.isolatedFileSystemManager.removeFileSystem(fileSystem);
  }

  _addFileSystemClicked() {
    Persistence.isolatedFileSystemManager.addFileSystem();
  }

  /**
   * @param {!Persistence.IsolatedFileSystem} fileSystem
   */
  _fileSystemAdded(fileSystem) {
    this._addItem(fileSystem);
  }

  /**
   * @param {!Persistence.IsolatedFileSystem} fileSystem
   */
  _fileSystemRemoved(fileSystem) {
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

  /**
   * @param {!Persistence.FileSystemWorkspaceBinding.FileSystem} project
   */
  _overridesProjectChanged(project) {
    var fileSystem = Persistence.isolatedFileSystemManager.fileSystem(project.fileSystemPath());
    if (!fileSystem)
      return;
    this._fileSystemRemoved(fileSystem);
    this._fileSystemAdded(fileSystem);
  }
};
