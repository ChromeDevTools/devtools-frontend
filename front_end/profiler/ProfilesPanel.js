/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
WebInspector.ProfileType = class extends WebInspector.Object {
  /**
   * @param {string} id
   * @param {string} name
   * @suppressGlobalPropertiesCheck
   */
  constructor(id, name) {
    super();
    this._id = id;
    this._name = name;
    /** @type {!Array.<!WebInspector.ProfileHeader>} */
    this._profiles = [];
    /** @type {?WebInspector.ProfileHeader} */
    this._profileBeingRecorded = null;
    this._nextProfileUid = 1;

    if (!window.opener)
      window.addEventListener('unload', this._clearTempStorage.bind(this), false);
  }

  /**
   * @return {string}
   */
  typeName() {
    return '';
  }

  /**
   * @return {number}
   */
  nextProfileUid() {
    return this._nextProfileUid;
  }

  /**
   * @return {boolean}
   */
  hasTemporaryView() {
    return false;
  }

  /**
   * @return {?string}
   */
  fileExtension() {
    return null;
  }

  /**
   * @return {!Array.<!WebInspector.ToolbarItem>}
   */
  toolbarItems() {
    return [];
  }

  get buttonTooltip() {
    return '';
  }

  get id() {
    return this._id;
  }

  get treeItemTitle() {
    return this._name;
  }

  get name() {
    return this._name;
  }

  /**
   * @return {boolean}
   */
  buttonClicked() {
    return false;
  }

  get description() {
    return '';
  }

  /**
   * @return {boolean}
   */
  isInstantProfile() {
    return false;
  }

  /**
   * @return {boolean}
   */
  isEnabled() {
    return true;
  }

  /**
   * @return {!Array.<!WebInspector.ProfileHeader>}
   */
  getProfiles() {
    /**
     * @param {!WebInspector.ProfileHeader} profile
     * @return {boolean}
     * @this {WebInspector.ProfileType}
     */
    function isFinished(profile) {
      return this._profileBeingRecorded !== profile;
    }
    return this._profiles.filter(isFinished.bind(this));
  }

  /**
   * @return {?Element}
   */
  decorationElement() {
    return null;
  }

  /**
   * @param {number} uid
   * @return {?WebInspector.ProfileHeader}
   */
  getProfile(uid) {
    for (var i = 0; i < this._profiles.length; ++i) {
      if (this._profiles[i].uid === uid)
        return this._profiles[i];
    }
    return null;
  }

  /**
   * @param {!File} file
   */
  loadFromFile(file) {
    var name = file.name;
    var fileExtension = this.fileExtension();
    if (fileExtension && name.endsWith(fileExtension))
      name = name.substr(0, name.length - fileExtension.length);
    var profile = this.createProfileLoadedFromFile(name);
    profile.setFromFile();
    this.setProfileBeingRecorded(profile);
    this.addProfile(profile);
    profile.loadFromFile(file);
  }

  /**
   * @param {string} title
   * @return {!WebInspector.ProfileHeader}
   */
  createProfileLoadedFromFile(title) {
    throw new Error('Needs implemented.');
  }

  /**
   * @param {!WebInspector.ProfileHeader} profile
   */
  addProfile(profile) {
    this._profiles.push(profile);
    this.dispatchEventToListeners(WebInspector.ProfileType.Events.AddProfileHeader, profile);
  }

  /**
   * @param {!WebInspector.ProfileHeader} profile
   */
  removeProfile(profile) {
    var index = this._profiles.indexOf(profile);
    if (index === -1)
      return;
    this._profiles.splice(index, 1);
    this._disposeProfile(profile);
  }

  _clearTempStorage() {
    for (var i = 0; i < this._profiles.length; ++i)
      this._profiles[i].removeTempFile();
  }

  /**
   * @return {?WebInspector.ProfileHeader}
   */
  profileBeingRecorded() {
    return this._profileBeingRecorded;
  }

  /**
   * @param {?WebInspector.ProfileHeader} profile
   */
  setProfileBeingRecorded(profile) {
    this._profileBeingRecorded = profile;
  }

  profileBeingRecordedRemoved() {
  }

  _reset() {
    var profiles = this._profiles.slice(0);
    for (var i = 0; i < profiles.length; ++i)
      this._disposeProfile(profiles[i]);
    this._profiles = [];

    this._nextProfileUid = 1;
  }

  /**
   * @param {!WebInspector.ProfileHeader} profile
   */
  _disposeProfile(profile) {
    this.dispatchEventToListeners(WebInspector.ProfileType.Events.RemoveProfileHeader, profile);
    profile.dispose();
    if (this._profileBeingRecorded === profile) {
      this.profileBeingRecordedRemoved();
      this.setProfileBeingRecorded(null);
    }
  }
};

/** @enum {symbol} */
WebInspector.ProfileType.Events = {
  AddProfileHeader: Symbol('add-profile-header'),
  ProfileComplete: Symbol('profile-complete'),
  RemoveProfileHeader: Symbol('remove-profile-header'),
  ViewUpdated: Symbol('view-updated')
};

/**
 * @interface
 */
WebInspector.ProfileType.DataDisplayDelegate = function() {};

WebInspector.ProfileType.DataDisplayDelegate.prototype = {
  /**
   * @param {?WebInspector.ProfileHeader} profile
   * @return {?WebInspector.Widget}
   */
  showProfile: function(profile) {},

  /**
   * @param {!Protocol.HeapProfiler.HeapSnapshotObjectId} snapshotObjectId
   * @param {string} perspectiveName
   */
  showObject: function(snapshotObjectId, perspectiveName) {}
};

/**
 * @unrestricted
 */
WebInspector.ProfileHeader = class extends WebInspector.Object {
  /**
   * @param {?WebInspector.Target} target
   * @param {!WebInspector.ProfileType} profileType
   * @param {string} title
   */
  constructor(target, profileType, title) {
    super();
    this._target = target;
    this._profileType = profileType;
    this.title = title;
    this.uid = profileType._nextProfileUid++;
    this._fromFile = false;
  }

  /**
   * @return {?WebInspector.Target}
   */
  target() {
    return this._target;
  }

  /**
   * @return {!WebInspector.ProfileType}
   */
  profileType() {
    return this._profileType;
  }

  /**
   * @param {?string} subtitle
   * @param {boolean=} wait
   */
  updateStatus(subtitle, wait) {
    this.dispatchEventToListeners(
        WebInspector.ProfileHeader.Events.UpdateStatus, new WebInspector.ProfileHeader.StatusUpdate(subtitle, wait));
  }

  /**
   * Must be implemented by subclasses.
   * @param {!WebInspector.ProfileType.DataDisplayDelegate} dataDisplayDelegate
   * @return {!WebInspector.ProfileSidebarTreeElement}
   */
  createSidebarTreeElement(dataDisplayDelegate) {
    throw new Error('Needs implemented.');
  }

  /**
   * @param {!WebInspector.ProfileType.DataDisplayDelegate} dataDisplayDelegate
   * @return {!WebInspector.Widget}
   */
  createView(dataDisplayDelegate) {
    throw new Error('Not implemented.');
  }

  removeTempFile() {
    if (this._tempFile)
      this._tempFile.remove();
  }

  dispose() {
  }

  /**
   * @return {boolean}
   */
  canSaveToFile() {
    return false;
  }

  saveToFile() {
    throw new Error('Needs implemented');
  }

  /**
   * @param {!File} file
   */
  loadFromFile(file) {
    throw new Error('Needs implemented');
  }

  /**
   * @return {boolean}
   */
  fromFile() {
    return this._fromFile;
  }

  setFromFile() {
    this._fromFile = true;
  }
};

/**
 * @unrestricted
 */
WebInspector.ProfileHeader.StatusUpdate = class {
  /**
   * @param {?string} subtitle
   * @param {boolean|undefined} wait
   */
  constructor(subtitle, wait) {
    /** @type {?string} */
    this.subtitle = subtitle;
    /** @type {boolean|undefined} */
    this.wait = wait;
  }
};

/** @enum {symbol} */
WebInspector.ProfileHeader.Events = {
  UpdateStatus: Symbol('UpdateStatus'),
  ProfileReceived: Symbol('ProfileReceived')
};

/**
 * @implements {WebInspector.ProfileType.DataDisplayDelegate}
 * @unrestricted
 */
WebInspector.ProfilesPanel = class extends WebInspector.PanelWithSidebar {
  constructor() {
    super('profiles');
    this.registerRequiredCSS('ui/panelEnablerView.css');
    this.registerRequiredCSS('profiler/heapProfiler.css');
    this.registerRequiredCSS('profiler/profilesPanel.css');
    this.registerRequiredCSS('components/objectValue.css');

    var mainContainer = new WebInspector.VBox();
    this.splitWidget().setMainWidget(mainContainer);

    this.profilesItemTreeElement = new WebInspector.ProfilesSidebarTreeElement(this);

    this._sidebarTree = new TreeOutlineInShadow();
    this._sidebarTree.registerRequiredCSS('profiler/profilesSidebarTree.css');
    this.panelSidebarElement().appendChild(this._sidebarTree.element);

    this._sidebarTree.appendChild(this.profilesItemTreeElement);

    this.profileViews = createElement('div');
    this.profileViews.id = 'profile-views';
    this.profileViews.classList.add('vbox');
    mainContainer.element.appendChild(this.profileViews);

    this._toolbarElement = createElementWithClass('div', 'profiles-toolbar');
    mainContainer.element.insertBefore(this._toolbarElement, mainContainer.element.firstChild);

    this.panelSidebarElement().classList.add('profiles-sidebar-tree-box');
    var toolbarContainerLeft = createElementWithClass('div', 'profiles-toolbar');
    this.panelSidebarElement().insertBefore(toolbarContainerLeft, this.panelSidebarElement().firstChild);
    var toolbar = new WebInspector.Toolbar('', toolbarContainerLeft);

    this._toggleRecordAction =
        /** @type {!WebInspector.Action }*/ (WebInspector.actionRegistry.action('profiler.toggle-recording'));
    this._toggleRecordButton = WebInspector.Toolbar.createActionButton(this._toggleRecordAction);
    toolbar.appendToolbarItem(this._toggleRecordButton);

    this.clearResultsButton =
        new WebInspector.ToolbarButton(WebInspector.UIString('Clear all profiles'), 'clear-toolbar-item');
    this.clearResultsButton.addEventListener('click', this._reset, this);
    toolbar.appendToolbarItem(this.clearResultsButton);

    this._profileTypeToolbar = new WebInspector.Toolbar('', this._toolbarElement);
    this._profileViewToolbar = new WebInspector.Toolbar('', this._toolbarElement);

    this._profileGroups = {};
    this._launcherView = new WebInspector.MultiProfileLauncherView(this);
    this._launcherView.addEventListener(
        WebInspector.MultiProfileLauncherView.Events.ProfileTypeSelected, this._onProfileTypeSelected, this);

    this._profileToView = [];
    this._typeIdToSidebarSection = {};
    var types = WebInspector.ProfileTypeRegistry.instance.profileTypes();
    for (var i = 0; i < types.length; i++)
      this._registerProfileType(types[i]);
    this._launcherView.restoreSelectedProfileType();
    this.profilesItemTreeElement.select();
    this._showLauncherView();

    this._createFileSelectorElement();
    this.element.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), false);

    this.contentElement.addEventListener('keydown', this._onKeyDown.bind(this), false);

    WebInspector.targetManager.addEventListener(
        WebInspector.TargetManager.Events.SuspendStateChanged, this._onSuspendStateChanged, this);
  }

  /**
   * @return {!WebInspector.ProfilesPanel}
   */
  static _instance() {
    return /** @type {!WebInspector.ProfilesPanel} */ (self.runtime.sharedInstance(WebInspector.ProfilesPanel));
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    var handled = false;
    if (event.key === 'ArrowDown' && !event.altKey)
      handled = this._sidebarTree.selectNext();
    else if (event.key === 'ArrowUp' && !event.altKey)
      handled = this._sidebarTree.selectPrevious();
    if (handled)
      event.consume(true);
  }

  /**
   * @override
   * @return {?WebInspector.SearchableView}
   */
  searchableView() {
    return this.visibleView && this.visibleView.searchableView ? this.visibleView.searchableView() : null;
  }

  _createFileSelectorElement() {
    if (this._fileSelectorElement)
      this.element.removeChild(this._fileSelectorElement);
    this._fileSelectorElement = WebInspector.createFileSelectorElement(this._loadFromFile.bind(this));
    WebInspector.ProfilesPanel._fileSelectorElement = this._fileSelectorElement;
    this.element.appendChild(this._fileSelectorElement);
  }

  _findProfileTypeByExtension(fileName) {
    var types = WebInspector.ProfileTypeRegistry.instance.profileTypes();
    for (var i = 0; i < types.length; i++) {
      var type = types[i];
      var extension = type.fileExtension();
      if (!extension)
        continue;
      if (fileName.endsWith(type.fileExtension()))
        return type;
    }
    return null;
  }

  /**
   * @param {!File} file
   */
  _loadFromFile(file) {
    this._createFileSelectorElement();

    var profileType = this._findProfileTypeByExtension(file.name);
    if (!profileType) {
      var extensions = [];
      var types = WebInspector.ProfileTypeRegistry.instance.profileTypes();
      for (var i = 0; i < types.length; i++) {
        var extension = types[i].fileExtension();
        if (!extension || extensions.indexOf(extension) !== -1)
          continue;
        extensions.push(extension);
      }
      WebInspector.console.error(WebInspector.UIString(
          'Can\'t load file. Only files with extensions \'%s\' can be loaded.', extensions.join('\', \'')));
      return;
    }

    if (!!profileType.profileBeingRecorded()) {
      WebInspector.console.error(WebInspector.UIString('Can\'t load profile while another profile is recording.'));
      return;
    }

    profileType.loadFromFile(file);
  }

  /**
   * @return {boolean}
   */
  toggleRecord() {
    if (!this._toggleRecordAction.enabled())
      return true;
    var type = this._selectedProfileType;
    var isProfiling = type.buttonClicked();
    this._updateToggleRecordAction(isProfiling);
    if (isProfiling) {
      this._launcherView.profileStarted();
      if (type.hasTemporaryView())
        this.showProfile(type.profileBeingRecorded());
    } else {
      this._launcherView.profileFinished();
    }
    return true;
  }

  _onSuspendStateChanged() {
    this._updateToggleRecordAction(this._toggleRecordAction.toggled());
  }

  /**
   * @param {boolean} toggled
   */
  _updateToggleRecordAction(toggled) {
    var enable = toggled || !WebInspector.targetManager.allTargetsSuspended();
    this._toggleRecordAction.setEnabled(enable);
    this._toggleRecordAction.setToggled(toggled);
    if (enable)
      this._toggleRecordButton.setTitle(this._selectedProfileType ? this._selectedProfileType.buttonTooltip : '');
    else
      this._toggleRecordButton.setTitle(WebInspector.anotherProfilerActiveLabel());
    if (this._selectedProfileType)
      this._launcherView.updateProfileType(this._selectedProfileType, enable);
  }

  _profileBeingRecordedRemoved() {
    this._updateToggleRecordAction(false);
    this._launcherView.profileFinished();
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onProfileTypeSelected(event) {
    this._selectedProfileType = /** @type {!WebInspector.ProfileType} */ (event.data);
    this._updateProfileTypeSpecificUI();
  }

  _updateProfileTypeSpecificUI() {
    this._updateToggleRecordAction(this._toggleRecordAction.toggled());
    this._profileTypeToolbar.removeToolbarItems();
    var toolbarItems = this._selectedProfileType.toolbarItems();
    for (var i = 0; i < toolbarItems.length; ++i)
      this._profileTypeToolbar.appendToolbarItem(toolbarItems[i]);
  }

  _reset() {
    var types = WebInspector.ProfileTypeRegistry.instance.profileTypes();
    for (var i = 0; i < types.length; i++)
      types[i]._reset();

    delete this.visibleView;

    this._profileGroups = {};
    this._updateToggleRecordAction(false);
    this._launcherView.profileFinished();

    this._sidebarTree.element.classList.remove('some-expandable');

    this._launcherView.detach();
    this.profileViews.removeChildren();
    this._profileViewToolbar.removeToolbarItems();

    this.removeAllListeners();

    this._profileViewToolbar.element.classList.remove('hidden');
    this.clearResultsButton.element.classList.remove('hidden');
    this.profilesItemTreeElement.select();
    this._showLauncherView();
  }

  _showLauncherView() {
    this.closeVisibleView();
    this._profileViewToolbar.removeToolbarItems();
    this._launcherView.show(this.profileViews);
    this.visibleView = this._launcherView;
  }

  /**
   * @param {!WebInspector.ProfileType} profileType
   */
  _registerProfileType(profileType) {
    this._launcherView.addProfileType(profileType);
    var profileTypeSection = new WebInspector.ProfileTypeSidebarSection(this, profileType);
    this._typeIdToSidebarSection[profileType.id] = profileTypeSection;
    this._sidebarTree.appendChild(profileTypeSection);
    profileTypeSection.childrenListElement.addEventListener(
        'contextmenu', this._handleContextMenuEvent.bind(this), false);

    /**
     * @param {!WebInspector.Event} event
     * @this {WebInspector.ProfilesPanel}
     */
    function onAddProfileHeader(event) {
      this._addProfileHeader(/** @type {!WebInspector.ProfileHeader} */ (event.data));
    }

    /**
     * @param {!WebInspector.Event} event
     * @this {WebInspector.ProfilesPanel}
     */
    function onRemoveProfileHeader(event) {
      this._removeProfileHeader(/** @type {!WebInspector.ProfileHeader} */ (event.data));
    }

    /**
     * @param {!WebInspector.Event} event
     * @this {WebInspector.ProfilesPanel}
     */
    function profileComplete(event) {
      this.showProfile(/** @type {!WebInspector.ProfileHeader} */ (event.data));
    }

    profileType.addEventListener(WebInspector.ProfileType.Events.ViewUpdated, this._updateProfileTypeSpecificUI, this);
    profileType.addEventListener(WebInspector.ProfileType.Events.AddProfileHeader, onAddProfileHeader, this);
    profileType.addEventListener(WebInspector.ProfileType.Events.RemoveProfileHeader, onRemoveProfileHeader, this);
    profileType.addEventListener(WebInspector.ProfileType.Events.ProfileComplete, profileComplete, this);

    var profiles = profileType.getProfiles();
    for (var i = 0; i < profiles.length; i++)
      this._addProfileHeader(profiles[i]);
  }

  /**
   * @param {!Event} event
   */
  _handleContextMenuEvent(event) {
    var contextMenu = new WebInspector.ContextMenu(event);
    if (this.visibleView instanceof WebInspector.HeapSnapshotView) {
      this.visibleView.populateContextMenu(contextMenu, event);
    }
    if (this.panelSidebarElement().isSelfOrAncestor(event.srcElement))
      contextMenu.appendItem(
          WebInspector.UIString('Load\u2026'), this._fileSelectorElement.click.bind(this._fileSelectorElement));
    contextMenu.show();
  }

  showLoadFromFileDialog() {
    this._fileSelectorElement.click();
  }

  /**
   * @param {!WebInspector.ProfileHeader} profile
   */
  _addProfileHeader(profile) {
    var profileType = profile.profileType();
    var typeId = profileType.id;
    this._typeIdToSidebarSection[typeId].addProfileHeader(profile);
    if (!this.visibleView || this.visibleView === this._launcherView)
      this.showProfile(profile);
  }

  /**
   * @param {!WebInspector.ProfileHeader} profile
   */
  _removeProfileHeader(profile) {
    if (profile.profileType()._profileBeingRecorded === profile)
      this._profileBeingRecordedRemoved();

    var i = this._indexOfViewForProfile(profile);
    if (i !== -1)
      this._profileToView.splice(i, 1);

    var profileType = profile.profileType();
    var typeId = profileType.id;
    var sectionIsEmpty = this._typeIdToSidebarSection[typeId].removeProfileHeader(profile);

    // No other item will be selected if there aren't any other profiles, so
    // make sure that view gets cleared when the last profile is removed.
    if (sectionIsEmpty) {
      this.profilesItemTreeElement.select();
      this._showLauncherView();
    }
  }

  /**
   * @override
   * @param {?WebInspector.ProfileHeader} profile
   * @return {?WebInspector.Widget}
   */
  showProfile(profile) {
    if (!profile ||
        (profile.profileType().profileBeingRecorded() === profile) && !profile.profileType().hasTemporaryView())
      return null;

    var view = this._viewForProfile(profile);
    if (view === this.visibleView)
      return view;

    this.closeVisibleView();

    view.show(this.profileViews);
    view.focus();

    this.visibleView = view;

    var profileTypeSection = this._typeIdToSidebarSection[profile.profileType().id];
    var sidebarElement = profileTypeSection.sidebarElementForProfile(profile);
    sidebarElement.revealAndSelect();

    this._profileViewToolbar.removeToolbarItems();

    var toolbarItems = view.syncToolbarItems();
    for (var i = 0; i < toolbarItems.length; ++i)
      this._profileViewToolbar.appendToolbarItem(toolbarItems[i]);

    return view;
  }

  /**
   * @override
   * @param {!Protocol.HeapProfiler.HeapSnapshotObjectId} snapshotObjectId
   * @param {string} perspectiveName
   */
  showObject(snapshotObjectId, perspectiveName) {
    var heapProfiles = WebInspector.ProfileTypeRegistry.instance.heapSnapshotProfileType.getProfiles();
    for (var i = 0; i < heapProfiles.length; i++) {
      var profile = heapProfiles[i];
      // FIXME: allow to choose snapshot if there are several options.
      if (profile.maxJSObjectId >= snapshotObjectId) {
        this.showProfile(profile);
        var view = this._viewForProfile(profile);
        view.selectLiveObject(perspectiveName, snapshotObjectId);
        break;
      }
    }
  }

  /**
   * @param {!WebInspector.ProfileHeader} profile
   * @return {!WebInspector.Widget}
   */
  _viewForProfile(profile) {
    var index = this._indexOfViewForProfile(profile);
    if (index !== -1)
      return this._profileToView[index].view;
    var view = profile.createView(this);
    view.element.classList.add('profile-view');
    this._profileToView.push({profile: profile, view: view});
    return view;
  }

  /**
   * @param {!WebInspector.ProfileHeader} profile
   * @return {number}
   */
  _indexOfViewForProfile(profile) {
    for (var i = 0; i < this._profileToView.length; i++) {
      if (this._profileToView[i].profile === profile)
        return i;
    }
    return -1;
  }

  closeVisibleView() {
    if (this.visibleView)
      this.visibleView.detach();
    delete this.visibleView;
  }

  /**
   * @param {!Event} event
   * @param {!WebInspector.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    if (!(target instanceof WebInspector.RemoteObject))
      return;

    if (!this.isShowing())
      return;

    var object = /** @type {!WebInspector.RemoteObject} */ (target);
    var objectId = object.objectId;
    if (!objectId)
      return;

    var heapProfiles = WebInspector.ProfileTypeRegistry.instance.heapSnapshotProfileType.getProfiles();
    if (!heapProfiles.length)
      return;

    /**
     * @this {WebInspector.ProfilesPanel}
     */
    function revealInView(viewName) {
      object.target().heapProfilerAgent().getHeapObjectId(objectId, didReceiveHeapObjectId.bind(this, viewName));
    }

    /**
     * @this {WebInspector.ProfilesPanel}
     */
    function didReceiveHeapObjectId(viewName, error, result) {
      if (!this.isShowing())
        return;
      if (!error)
        this.showObject(result, viewName);
    }

    contextMenu.appendItem(
        WebInspector.UIString.capitalize('Reveal in Summary ^view'), revealInView.bind(this, 'Summary'));
  }

  /**
   * @override
   */
  wasShown() {
    WebInspector.context.setFlavor(WebInspector.ProfilesPanel, this);
  }

  /**
   * @override
   */
  focus() {
    this._sidebarTree.focus();
  }

  /**
   * @override
   */
  willHide() {
    WebInspector.context.setFlavor(WebInspector.ProfilesPanel, null);
  }
};

/**
 * @unrestricted
 */
WebInspector.ProfileTypeSidebarSection = class extends TreeElement {
  /**
   * @param {!WebInspector.ProfileType.DataDisplayDelegate} dataDisplayDelegate
   * @param {!WebInspector.ProfileType} profileType
   */
  constructor(dataDisplayDelegate, profileType) {
    super(profileType.treeItemTitle.escapeHTML(), true);
    this.selectable = false;
    this._dataDisplayDelegate = dataDisplayDelegate;
    /** @type {!Array<!WebInspector.ProfileSidebarTreeElement>} */
    this._profileTreeElements = [];
    /** @type {!Object<string, !WebInspector.ProfileTypeSidebarSection.ProfileGroup>} */
    this._profileGroups = {};
    this.expand();
    this.hidden = true;
  }

  /**
   * @param {!WebInspector.ProfileHeader} profile
   */
  addProfileHeader(profile) {
    this.hidden = false;
    var profileType = profile.profileType();
    var sidebarParent = this;
    var profileTreeElement = profile.createSidebarTreeElement(this._dataDisplayDelegate);
    this._profileTreeElements.push(profileTreeElement);

    if (!profile.fromFile() && profileType.profileBeingRecorded() !== profile) {
      var profileTitle = profile.title;
      var group = this._profileGroups[profileTitle];
      if (!group) {
        group = new WebInspector.ProfileTypeSidebarSection.ProfileGroup();
        this._profileGroups[profileTitle] = group;
      }
      group.profileSidebarTreeElements.push(profileTreeElement);

      var groupSize = group.profileSidebarTreeElements.length;
      if (groupSize === 2) {
        // Make a group TreeElement now that there are 2 profiles.
        group.sidebarTreeElement =
            new WebInspector.ProfileGroupSidebarTreeElement(this._dataDisplayDelegate, profile.title);

        var firstProfileTreeElement = group.profileSidebarTreeElements[0];
        // Insert at the same index for the first profile of the group.
        var index = this.children().indexOf(firstProfileTreeElement);
        this.insertChild(group.sidebarTreeElement, index);

        // Move the first profile to the group.
        var selected = firstProfileTreeElement.selected;
        this.removeChild(firstProfileTreeElement);
        group.sidebarTreeElement.appendChild(firstProfileTreeElement);
        if (selected)
          firstProfileTreeElement.revealAndSelect();

        firstProfileTreeElement.setSmall(true);
        firstProfileTreeElement.setMainTitle(WebInspector.UIString('Run %d', 1));

        this.treeOutline.element.classList.add('some-expandable');
      }

      if (groupSize >= 2) {
        sidebarParent = group.sidebarTreeElement;
        profileTreeElement.setSmall(true);
        profileTreeElement.setMainTitle(WebInspector.UIString('Run %d', groupSize));
      }
    }

    sidebarParent.appendChild(profileTreeElement);
  }

  /**
   * @param {!WebInspector.ProfileHeader} profile
   * @return {boolean}
   */
  removeProfileHeader(profile) {
    var index = this._sidebarElementIndex(profile);
    if (index === -1)
      return false;
    var profileTreeElement = this._profileTreeElements[index];
    this._profileTreeElements.splice(index, 1);

    var sidebarParent = this;
    var group = this._profileGroups[profile.title];
    if (group) {
      var groupElements = group.profileSidebarTreeElements;
      groupElements.splice(groupElements.indexOf(profileTreeElement), 1);
      if (groupElements.length === 1) {
        // Move the last profile out of its group and remove the group.
        var pos = sidebarParent.children().indexOf(
            /** @type {!WebInspector.ProfileGroupSidebarTreeElement} */ (group.sidebarTreeElement));
        group.sidebarTreeElement.removeChild(groupElements[0]);
        this.insertChild(groupElements[0], pos);
        groupElements[0].setSmall(false);
        groupElements[0].setMainTitle(profile.title);
        this.removeChild(group.sidebarTreeElement);
      }
      if (groupElements.length !== 0)
        sidebarParent = group.sidebarTreeElement;
    }
    sidebarParent.removeChild(profileTreeElement);
    profileTreeElement.dispose();

    if (this.childCount())
      return false;
    this.hidden = true;
    return true;
  }

  /**
   * @param {!WebInspector.ProfileHeader} profile
   * @return {?WebInspector.ProfileSidebarTreeElement}
   */
  sidebarElementForProfile(profile) {
    var index = this._sidebarElementIndex(profile);
    return index === -1 ? null : this._profileTreeElements[index];
  }

  /**
   * @param {!WebInspector.ProfileHeader} profile
   * @return {number}
   */
  _sidebarElementIndex(profile) {
    var elements = this._profileTreeElements;
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].profile === profile)
        return i;
    }
    return -1;
  }

  /**
   * @override
   */
  onattach() {
    this.listItemElement.classList.add('profiles-tree-section');
  }
};

/**
 * @unrestricted
 */
WebInspector.ProfileTypeSidebarSection.ProfileGroup = class {
  constructor() {
    /** @type {!Array<!WebInspector.ProfileSidebarTreeElement>} */
    this.profileSidebarTreeElements = [];
    /** @type {?WebInspector.ProfileGroupSidebarTreeElement} */
    this.sidebarTreeElement = null;
  }
};

/**
 * @implements {WebInspector.ContextMenu.Provider}
 * @unrestricted
 */
WebInspector.ProfilesPanel.ContextMenuProvider = class {
  /**
   * @override
   * @param {!Event} event
   * @param {!WebInspector.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    WebInspector.ProfilesPanel._instance().appendApplicableItems(event, contextMenu, target);
  }
};

/**
 * @unrestricted
 */
WebInspector.ProfileSidebarTreeElement = class extends TreeElement {
  /**
   * @param {!WebInspector.ProfileType.DataDisplayDelegate} dataDisplayDelegate
   * @param {!WebInspector.ProfileHeader} profile
   * @param {string} className
   */
  constructor(dataDisplayDelegate, profile, className) {
    super('', false);
    this._iconElement = createElementWithClass('div', 'icon');
    this._titlesElement = createElementWithClass('div', 'titles no-subtitle');
    this._titleContainer = this._titlesElement.createChild('span', 'title-container');
    this._titleElement = this._titleContainer.createChild('span', 'title');
    this._subtitleElement = this._titlesElement.createChild('span', 'subtitle');

    this._titleElement.textContent = profile.title;
    this._className = className;
    this._small = false;
    this._dataDisplayDelegate = dataDisplayDelegate;
    this.profile = profile;
    profile.addEventListener(WebInspector.ProfileHeader.Events.UpdateStatus, this._updateStatus, this);
    if (profile.canSaveToFile())
      this._createSaveLink();
    else
      profile.addEventListener(WebInspector.ProfileHeader.Events.ProfileReceived, this._onProfileReceived, this);
  }

  _createSaveLink() {
    this._saveLinkElement = this._titleContainer.createChild('span', 'save-link');
    this._saveLinkElement.textContent = WebInspector.UIString('Save');
    this._saveLinkElement.addEventListener('click', this._saveProfile.bind(this), false);
  }

  _onProfileReceived(event) {
    this._createSaveLink();
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _updateStatus(event) {
    var statusUpdate = event.data;
    if (statusUpdate.subtitle !== null) {
      this._subtitleElement.textContent = statusUpdate.subtitle || '';
      this._titlesElement.classList.toggle('no-subtitle', !statusUpdate.subtitle);
    }
    if (typeof statusUpdate.wait === 'boolean' && this.listItemElement)
      this.listItemElement.classList.toggle('wait', statusUpdate.wait);
  }

  dispose() {
    this.profile.removeEventListener(WebInspector.ProfileHeader.Events.UpdateStatus, this._updateStatus, this);
    this.profile.removeEventListener(WebInspector.ProfileHeader.Events.ProfileReceived, this._onProfileReceived, this);
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect() {
    this._dataDisplayDelegate.showProfile(this.profile);
    return true;
  }

  /**
   * @override
   * @return {boolean}
   */
  ondelete() {
    this.profile.profileType().removeProfile(this.profile);
    return true;
  }

  /**
   * @override
   */
  onattach() {
    if (this._className)
      this.listItemElement.classList.add(this._className);
    if (this._small)
      this.listItemElement.classList.add('small');
    this.listItemElement.appendChildren(this._iconElement, this._titlesElement);
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  /**
   * @param {!Event} event
   */
  _handleContextMenuEvent(event) {
    var profile = this.profile;
    var contextMenu = new WebInspector.ContextMenu(event);
    // FIXME: use context menu provider
    contextMenu.appendItem(
        WebInspector.UIString('Load\u2026'),
        WebInspector.ProfilesPanel._fileSelectorElement.click.bind(WebInspector.ProfilesPanel._fileSelectorElement));
    if (profile.canSaveToFile())
      contextMenu.appendItem(WebInspector.UIString('Save\u2026'), profile.saveToFile.bind(profile));
    contextMenu.appendItem(WebInspector.UIString('Delete'), this.ondelete.bind(this));
    contextMenu.show();
  }

  _saveProfile(event) {
    this.profile.saveToFile();
  }

  /**
   * @param {boolean} small
   */
  setSmall(small) {
    this._small = small;
    if (this.listItemElement)
      this.listItemElement.classList.toggle('small', this._small);
  }

  /**
   * @param {string} title
   */
  setMainTitle(title) {
    this._titleElement.textContent = title;
  }
};

/**
 * @unrestricted
 */
WebInspector.ProfileGroupSidebarTreeElement = class extends TreeElement {
  /**
   * @param {!WebInspector.ProfileType.DataDisplayDelegate} dataDisplayDelegate
   * @param {string} title
   */
  constructor(dataDisplayDelegate, title) {
    super('', true);
    this.selectable = false;
    this._dataDisplayDelegate = dataDisplayDelegate;
    this._title = title;
    this.expand();
    this.toggleOnClick = true;
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect() {
    var hasChildren = this.childCount() > 0;
    if (hasChildren)
      this._dataDisplayDelegate.showProfile(this.lastChild().profile);
    return hasChildren;
  }

  /**
   * @override
   */
  onattach() {
    this.listItemElement.classList.add('profile-group-sidebar-tree-item');
    this.listItemElement.createChild('div', 'icon');
    this.listItemElement.createChild('div', 'titles no-subtitle')
        .createChild('span', 'title-container')
        .createChild('span', 'title')
        .textContent = this._title;
  }
};

/**
 * @unrestricted
 */
WebInspector.ProfilesSidebarTreeElement = class extends TreeElement {
  /**
   * @param {!WebInspector.ProfilesPanel} panel
   */
  constructor(panel) {
    super('', false);
    this.selectable = true;
    this._panel = panel;
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect() {
    this._panel._showLauncherView();
    return true;
  }

  /**
   * @override
   */
  onattach() {
    this.listItemElement.classList.add('profile-launcher-view-tree-item');
    this.listItemElement.createChild('div', 'icon');
    this.listItemElement.createChild('div', 'titles no-subtitle')
        .createChild('span', 'title-container')
        .createChild('span', 'title')
        .textContent = WebInspector.UIString('Profiles');
  }
};


/**
 * @implements {WebInspector.ActionDelegate}
 * @unrestricted
 */
WebInspector.ProfilesPanel.RecordActionDelegate = class {
  /**
   * @override
   * @param {!WebInspector.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    var panel = WebInspector.context.flavor(WebInspector.ProfilesPanel);
    console.assert(panel && panel instanceof WebInspector.ProfilesPanel);
    panel.toggleRecord();
    return true;
  }
};
