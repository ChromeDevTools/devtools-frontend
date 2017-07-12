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
 * @implements {Profiler.ProfileType.DataDisplayDelegate}
 * @unrestricted
 */
Profiler.ProfilesPanel = class extends UI.PanelWithSidebar {
  /**
   * @param {string} name
   * @param {!Array.<!Profiler.ProfileType>} profileTypes
   * @param {string} recordingActionId
   */
  constructor(name, profileTypes, recordingActionId) {
    super(name);
    this._profileTypes = profileTypes;
    this.registerRequiredCSS('ui/panelEnablerView.css');
    this.registerRequiredCSS('profiler/heapProfiler.css');
    this.registerRequiredCSS('profiler/profilesPanel.css');
    this.registerRequiredCSS('object_ui/objectValue.css');

    var mainContainer = new UI.VBox();
    this.splitWidget().setMainWidget(mainContainer);

    this.profilesItemTreeElement = new Profiler.ProfilesSidebarTreeElement(this);

    this._sidebarTree = new UI.TreeOutlineInShadow();
    this._sidebarTree.registerRequiredCSS('profiler/profilesSidebarTree.css');
    this._sidebarTree.element.classList.add('profiles-sidebar-tree-box');
    this.panelSidebarElement().appendChild(this._sidebarTree.element);

    this._sidebarTree.appendChild(this.profilesItemTreeElement);

    this.profileViews = createElement('div');
    this.profileViews.id = 'profile-views';
    this.profileViews.classList.add('vbox');
    mainContainer.element.appendChild(this.profileViews);

    this._toolbarElement = createElementWithClass('div', 'profiles-toolbar');
    mainContainer.element.insertBefore(this._toolbarElement, mainContainer.element.firstChild);

    this.panelSidebarElement().classList.add('profiles-tree-sidebar');
    var toolbarContainerLeft = createElementWithClass('div', 'profiles-toolbar');
    this.panelSidebarElement().insertBefore(toolbarContainerLeft, this.panelSidebarElement().firstChild);
    var toolbar = new UI.Toolbar('', toolbarContainerLeft);

    this._toggleRecordAction =
        /** @type {!UI.Action }*/ (UI.actionRegistry.action(recordingActionId));
    this._toggleRecordButton = UI.Toolbar.createActionButton(this._toggleRecordAction);
    toolbar.appendToolbarItem(this._toggleRecordButton);

    this.clearResultsButton = new UI.ToolbarButton(Common.UIString('Clear all profiles'), 'largeicon-clear');
    this.clearResultsButton.addEventListener(UI.ToolbarButton.Events.Click, this._reset, this);
    toolbar.appendToolbarItem(this.clearResultsButton);
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(UI.Toolbar.createActionButtonForId('components.collect-garbage'));

    this._profileViewToolbar = new UI.Toolbar('', this._toolbarElement);

    this._profileGroups = {};
    this._launcherView = new Profiler.ProfileLauncherView(this);
    this._launcherView.addEventListener(
        Profiler.ProfileLauncherView.Events.ProfileTypeSelected, this._onProfileTypeSelected, this);

    this._profileToView = [];
    this._typeIdToSidebarSection = {};
    var types = this._profileTypes;
    for (var i = 0; i < types.length; i++)
      this._registerProfileType(types[i]);
    this._launcherView.restoreSelectedProfileType();
    this.profilesItemTreeElement.select();
    this._showLauncherView();

    this._createFileSelectorElement();
    this.element.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), false);

    this.contentElement.addEventListener('keydown', this._onKeyDown.bind(this), false);

    SDK.targetManager.addEventListener(SDK.TargetManager.Events.SuspendStateChanged, this._onSuspendStateChanged, this);
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
   * @return {?UI.SearchableView}
   */
  searchableView() {
    return this.visibleView && this.visibleView.searchableView ? this.visibleView.searchableView() : null;
  }

  _createFileSelectorElement() {
    if (this._fileSelectorElement)
      this.element.removeChild(this._fileSelectorElement);
    this._fileSelectorElement = UI.createFileSelectorElement(this._loadFromFile.bind(this));
    Profiler.ProfilesPanel._fileSelectorElement = this._fileSelectorElement;
    this.element.appendChild(this._fileSelectorElement);
  }

  _findProfileTypeByExtension(fileName) {
    var types = this._profileTypes;
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
      var types = this._profileTypes;
      for (var i = 0; i < types.length; i++) {
        var extension = types[i].fileExtension();
        if (!extension || extensions.indexOf(extension) !== -1)
          continue;
        extensions.push(extension);
      }
      Common.console.error(
          Common.UIString(`Can't load file. Only files with extensions '%s' can be loaded.`, extensions.join(`', '`)));
      return;
    }

    if (!!profileType.profileBeingRecorded()) {
      Common.console.error(Common.UIString(`Can't load profile while another profile is being recorded.`));
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
    var enable = toggled || !SDK.targetManager.allTargetsSuspended();
    this._toggleRecordAction.setEnabled(enable);
    this._toggleRecordAction.setToggled(toggled);
    if (enable)
      this._toggleRecordButton.setTitle(this._selectedProfileType ? this._selectedProfileType.buttonTooltip : '');
    else
      this._toggleRecordButton.setTitle(UI.anotherProfilerActiveLabel());
    if (this._selectedProfileType)
      this._launcherView.updateProfileType(this._selectedProfileType, enable);
  }

  _profileBeingRecordedRemoved() {
    this._updateToggleRecordAction(false);
    this._launcherView.profileFinished();
  }

  /**
   * @param {!Common.Event} event
   */
  _onProfileTypeSelected(event) {
    this._selectedProfileType = /** @type {!Profiler.ProfileType} */ (event.data);
    this._updateProfileTypeSpecificUI();
  }

  _updateProfileTypeSpecificUI() {
    this._updateToggleRecordAction(this._toggleRecordAction.toggled());
  }

  _reset() {
    this._profileTypes.forEach(type => type.reset());

    delete this.visibleView;

    this._profileGroups = {};
    this._updateToggleRecordAction(false);
    this._launcherView.profileFinished();

    this._sidebarTree.element.classList.remove('some-expandable');

    this._launcherView.detach();
    this.profileViews.removeChildren();
    this._profileViewToolbar.removeToolbarItems();

    this.clearResultsButton.element.classList.remove('hidden');
    this.profilesItemTreeElement.select();
    this._showLauncherView();
  }

  _showLauncherView() {
    this.closeVisibleView();
    this._profileViewToolbar.removeToolbarItems();
    this._launcherView.show(this.profileViews);
    this.visibleView = this._launcherView;
    this._toolbarElement.classList.add('hidden');
  }

  /**
   * @param {!Profiler.ProfileType} profileType
   */
  _registerProfileType(profileType) {
    this._launcherView.addProfileType(profileType);
    var profileTypeSection = new Profiler.ProfileTypeSidebarSection(this, profileType);
    this._typeIdToSidebarSection[profileType.id] = profileTypeSection;
    this._sidebarTree.appendChild(profileTypeSection);
    profileTypeSection.childrenListElement.addEventListener(
        'contextmenu', this._handleContextMenuEvent.bind(this), false);

    /**
     * @param {!Common.Event} event
     * @this {Profiler.ProfilesPanel}
     */
    function onAddProfileHeader(event) {
      this._addProfileHeader(/** @type {!Profiler.ProfileHeader} */ (event.data));
    }

    /**
     * @param {!Common.Event} event
     * @this {Profiler.ProfilesPanel}
     */
    function onRemoveProfileHeader(event) {
      this._removeProfileHeader(/** @type {!Profiler.ProfileHeader} */ (event.data));
    }

    /**
     * @param {!Common.Event} event
     * @this {Profiler.ProfilesPanel}
     */
    function profileComplete(event) {
      this.showProfile(/** @type {!Profiler.ProfileHeader} */ (event.data));
    }

    profileType.addEventListener(Profiler.ProfileType.Events.ViewUpdated, this._updateProfileTypeSpecificUI, this);
    profileType.addEventListener(Profiler.ProfileType.Events.AddProfileHeader, onAddProfileHeader, this);
    profileType.addEventListener(Profiler.ProfileType.Events.RemoveProfileHeader, onRemoveProfileHeader, this);
    profileType.addEventListener(Profiler.ProfileType.Events.ProfileComplete, profileComplete, this);

    var profiles = profileType.getProfiles();
    for (var i = 0; i < profiles.length; i++)
      this._addProfileHeader(profiles[i]);
  }

  /**
   * @param {!Event} event
   */
  _handleContextMenuEvent(event) {
    var contextMenu = new UI.ContextMenu(event);
    if (this.visibleView instanceof Profiler.HeapSnapshotView)
      this.visibleView.populateContextMenu(contextMenu, event);

    if (this.panelSidebarElement().isSelfOrAncestor(event.srcElement)) {
      contextMenu.appendItem(
          Common.UIString('Load\u2026'), this._fileSelectorElement.click.bind(this._fileSelectorElement));
    }
    contextMenu.show();
  }

  showLoadFromFileDialog() {
    this._fileSelectorElement.click();
  }

  /**
   * @param {!Profiler.ProfileHeader} profile
   */
  _addProfileHeader(profile) {
    var profileType = profile.profileType();
    var typeId = profileType.id;
    this._typeIdToSidebarSection[typeId].addProfileHeader(profile);
    if (!this.visibleView || this.visibleView === this._launcherView)
      this.showProfile(profile);
  }

  /**
   * @param {!Profiler.ProfileHeader} profile
   */
  _removeProfileHeader(profile) {
    if (profile.profileType().profileBeingRecorded() === profile)
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
   * @param {?Profiler.ProfileHeader} profile
   * @return {?UI.Widget}
   */
  showProfile(profile) {
    if (!profile ||
        (profile.profileType().profileBeingRecorded() === profile) && !profile.profileType().hasTemporaryView())
      return null;

    var view = this.viewForProfile(profile);
    if (view === this.visibleView)
      return view;

    this.closeVisibleView();

    view.show(this.profileViews);
    view.focus();
    this._toolbarElement.classList.remove('hidden');
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
  }

  /**
   * @param {!Profiler.ProfileHeader} profile
   * @return {!UI.Widget}
   */
  viewForProfile(profile) {
    var index = this._indexOfViewForProfile(profile);
    if (index !== -1)
      return this._profileToView[index].view;
    var view = profile.createView(this);
    view.element.classList.add('profile-view');
    this._profileToView.push({profile: profile, view: view});
    return view;
  }

  /**
   * @param {!Profiler.ProfileHeader} profile
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
   * @override
   */
  focus() {
    this._sidebarTree.focus();
  }
};

/**
 * @unrestricted
 */
Profiler.ProfileTypeSidebarSection = class extends UI.TreeElement {
  /**
   * @param {!Profiler.ProfileType.DataDisplayDelegate} dataDisplayDelegate
   * @param {!Profiler.ProfileType} profileType
   */
  constructor(dataDisplayDelegate, profileType) {
    super(profileType.treeItemTitle.escapeHTML(), true);
    this.selectable = false;
    this._dataDisplayDelegate = dataDisplayDelegate;
    /** @type {!Array<!Profiler.ProfileSidebarTreeElement>} */
    this._profileTreeElements = [];
    /** @type {!Object<string, !Profiler.ProfileTypeSidebarSection.ProfileGroup>} */
    this._profileGroups = {};
    this.expand();
    this.hidden = true;
    this.setCollapsible(false);
  }

  /**
   * @param {!Profiler.ProfileHeader} profile
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
        group = new Profiler.ProfileTypeSidebarSection.ProfileGroup();
        this._profileGroups[profileTitle] = group;
      }
      group.profileSidebarTreeElements.push(profileTreeElement);

      var groupSize = group.profileSidebarTreeElements.length;
      if (groupSize === 2) {
        // Make a group UI.TreeElement now that there are 2 profiles.
        group.sidebarTreeElement =
            new Profiler.ProfileGroupSidebarTreeElement(this._dataDisplayDelegate, profile.title);

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
        firstProfileTreeElement.setMainTitle(Common.UIString('Run %d', 1));

        this.treeOutline.element.classList.add('some-expandable');
      }

      if (groupSize >= 2) {
        sidebarParent = group.sidebarTreeElement;
        profileTreeElement.setSmall(true);
        profileTreeElement.setMainTitle(Common.UIString('Run %d', groupSize));
      }
    }

    sidebarParent.appendChild(profileTreeElement);
  }

  /**
   * @param {!Profiler.ProfileHeader} profile
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
            /** @type {!Profiler.ProfileGroupSidebarTreeElement} */ (group.sidebarTreeElement));
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
   * @param {!Profiler.ProfileHeader} profile
   * @return {?Profiler.ProfileSidebarTreeElement}
   */
  sidebarElementForProfile(profile) {
    var index = this._sidebarElementIndex(profile);
    return index === -1 ? null : this._profileTreeElements[index];
  }

  /**
   * @param {!Profiler.ProfileHeader} profile
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
Profiler.ProfileTypeSidebarSection.ProfileGroup = class {
  constructor() {
    /** @type {!Array<!Profiler.ProfileSidebarTreeElement>} */
    this.profileSidebarTreeElements = [];
    /** @type {?Profiler.ProfileGroupSidebarTreeElement} */
    this.sidebarTreeElement = null;
  }
};

/**
 * @unrestricted
 */
Profiler.ProfileSidebarTreeElement = class extends UI.TreeElement {
  /**
   * @param {!Profiler.ProfileType.DataDisplayDelegate} dataDisplayDelegate
   * @param {!Profiler.ProfileHeader} profile
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
    profile.addEventListener(Profiler.ProfileHeader.Events.UpdateStatus, this._updateStatus, this);
    if (profile.canSaveToFile())
      this._createSaveLink();
    else
      profile.addEventListener(Profiler.ProfileHeader.Events.ProfileReceived, this._onProfileReceived, this);
  }

  _createSaveLink() {
    this._saveLinkElement = this._titleContainer.createChild('span', 'save-link');
    this._saveLinkElement.textContent = Common.UIString('Save');
    this._saveLinkElement.addEventListener('click', this._saveProfile.bind(this), false);
  }

  _onProfileReceived(event) {
    this._createSaveLink();
  }

  /**
   * @param {!Common.Event} event
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

  /**
   * @override
   * @param {!Event} event
   * @return {boolean}
   */
  ondblclick(event) {
    if (!this._editing)
      this._startEditing(/** @type {!Element} */ (event.target));
    return false;
  }

  /**
   * @param {!Element} eventTarget
   */
  _startEditing(eventTarget) {
    var container = eventTarget.enclosingNodeOrSelfWithClass('title');
    if (!container)
      return;
    var config = new UI.InplaceEditor.Config(this._editingCommitted.bind(this), this._editingCancelled.bind(this));
    this._editing = UI.InplaceEditor.startEditing(container, config);
  }

  /**
   * @param {!Element} container
   * @param {string} newTitle
   */
  _editingCommitted(container, newTitle) {
    delete this._editing;
    this.profile.setTitle(newTitle);
  }

  _editingCancelled() {
    delete this._editing;
  }

  dispose() {
    this.profile.removeEventListener(Profiler.ProfileHeader.Events.UpdateStatus, this._updateStatus, this);
    this.profile.removeEventListener(Profiler.ProfileHeader.Events.ProfileReceived, this._onProfileReceived, this);
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
    var contextMenu = new UI.ContextMenu(event);
    // FIXME: use context menu provider
    contextMenu.appendItem(
        Common.UIString('Load\u2026'),
        Profiler.ProfilesPanel._fileSelectorElement.click.bind(Profiler.ProfilesPanel._fileSelectorElement));
    if (profile.canSaveToFile())
      contextMenu.appendItem(Common.UIString('Save\u2026'), profile.saveToFile.bind(profile));
    contextMenu.appendItem(Common.UIString('Delete'), this.ondelete.bind(this));
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
Profiler.ProfileGroupSidebarTreeElement = class extends UI.TreeElement {
  /**
   * @param {!Profiler.ProfileType.DataDisplayDelegate} dataDisplayDelegate
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

Profiler.ProfilesSidebarTreeElement = class extends UI.TreeElement {
  /**
   * @param {!Profiler.ProfilesPanel} panel
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
        .textContent = Common.UIString('Profiles');
  }
};

/**
 * @implements {UI.ActionDelegate}
 */
Profiler.JSProfilerPanel = class extends Profiler.ProfilesPanel {
  constructor() {
    var registry = Profiler.ProfileTypeRegistry.instance;
    super('js_profiler', [registry.cpuProfileType], 'profiler.js-toggle-recording');
  }

  /**
   * @override
   */
  wasShown() {
    UI.context.setFlavor(Profiler.JSProfilerPanel, this);
  }

  /**
   * @override
   */
  willHide() {
    UI.context.setFlavor(Profiler.JSProfilerPanel, null);
  }

  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    var panel = UI.context.flavor(Profiler.JSProfilerPanel);
    console.assert(panel && panel instanceof Profiler.JSProfilerPanel);
    panel.toggleRecord();
    return true;
  }
};
