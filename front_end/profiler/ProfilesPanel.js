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

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {DataDisplayDelegate,            // eslint-disable-line no-unused-vars
        Events as ProfileHeaderEvents,  // eslint-disable-line no-unused-vars
        ProfileEvents as ProfileTypeEvents, ProfileHeader, ProfileType,} from './ProfileHeader.js';  // eslint-disable-line no-unused-vars
import {Events as ProfileLauncherEvents, ProfileLauncherView} from './ProfileLauncherView.js';
import {ProfileSidebarTreeElement} from './ProfileSidebarTreeElement.js';  // eslint-disable-line no-unused-vars
import {instance} from './ProfileTypeRegistry.js';

/**
 * @implements {DataDisplayDelegate}
 * @unrestricted
 */
export class ProfilesPanel extends UI.Panel.PanelWithSidebar {
  /**
   * @param {string} name
   * @param {!Array.<!ProfileType>} profileTypes
   * @param {string} recordingActionId
   */
  constructor(name, profileTypes, recordingActionId) {
    super(name);
    this._profileTypes = profileTypes;
    this.registerRequiredCSS('profiler/heapProfiler.css');
    this.registerRequiredCSS('profiler/profilesPanel.css');
    this.registerRequiredCSS('object_ui/objectValue.css');

    const mainContainer = new UI.Widget.VBox();
    this.splitWidget().setMainWidget(mainContainer);

    this.profilesItemTreeElement = new ProfilesSidebarTreeElement(this);

    this._sidebarTree = new UI.TreeOutline.TreeOutlineInShadow();
    this._sidebarTree.registerRequiredCSS('profiler/profilesSidebarTree.css');
    this._sidebarTree.element.classList.add('profiles-sidebar-tree-box');
    this.panelSidebarElement().appendChild(this._sidebarTree.element);

    this._sidebarTree.appendChild(this.profilesItemTreeElement);

    this._sidebarTree.element.addEventListener('keydown', this._onKeyDown.bind(this), false);

    this.profileViews = createElement('div');
    this.profileViews.id = 'profile-views';
    this.profileViews.classList.add('vbox');
    mainContainer.element.appendChild(this.profileViews);

    this._toolbarElement = createElementWithClass('div', 'profiles-toolbar');
    mainContainer.element.insertBefore(this._toolbarElement, mainContainer.element.firstChild);

    this.panelSidebarElement().classList.add('profiles-tree-sidebar');
    const toolbarContainerLeft = createElementWithClass('div', 'profiles-toolbar');
    this.panelSidebarElement().insertBefore(toolbarContainerLeft, this.panelSidebarElement().firstChild);
    const toolbar = new UI.Toolbar.Toolbar('', toolbarContainerLeft);

    this._toggleRecordAction =
        /** @type {!UI.Action.Action }*/ (self.UI.actionRegistry.action(recordingActionId));
    this._toggleRecordButton = UI.Toolbar.Toolbar.createActionButton(this._toggleRecordAction);
    toolbar.appendToolbarItem(this._toggleRecordButton);

    this.clearResultsButton =
        new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Clear all profiles'), 'largeicon-clear');
    this.clearResultsButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._reset, this);
    toolbar.appendToolbarItem(this.clearResultsButton);
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButtonForId('components.collect-garbage'));

    this._profileViewToolbar = new UI.Toolbar.Toolbar('', this._toolbarElement);

    this._profileGroups = {};
    this._launcherView = new ProfileLauncherView(this);
    this._launcherView.addEventListener(ProfileLauncherEvents.ProfileTypeSelected, this._onProfileTypeSelected, this);

    this._profileToView = [];
    this._typeIdToSidebarSection = {};
    const types = this._profileTypes;
    for (let i = 0; i < types.length; i++) {
      this._registerProfileType(types[i]);
    }
    this._launcherView.restoreSelectedProfileType();
    this.profilesItemTreeElement.select();
    this._showLauncherView();

    this._createFileSelectorElement();
    this.element.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), false);

    SDK.SDKModel.TargetManager.instance().addEventListener(
        SDK.SDKModel.Events.SuspendStateChanged, this._onSuspendStateChanged, this);
    self.UI.context.addFlavorChangeListener(
        SDK.CPUProfilerModel.CPUProfilerModel, this._updateProfileTypeSpecificUI, this);
    self.UI.context.addFlavorChangeListener(
        SDK.HeapProfilerModel.HeapProfilerModel, this._updateProfileTypeSpecificUI, this);
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    let handled = false;
    if (event.key === 'ArrowDown' && !event.altKey) {
      handled = this._sidebarTree.selectNext();
    } else if (event.key === 'ArrowUp' && !event.altKey) {
      handled = this._sidebarTree.selectPrevious();
    }
    if (handled) {
      event.consume(true);
    }
  }

  /**
   * @override
   * @return {?UI.SearchableView.SearchableView}
   */
  searchableView() {
    return this.visibleView && this.visibleView.searchableView ? this.visibleView.searchableView() : null;
  }

  _createFileSelectorElement() {
    if (this._fileSelectorElement) {
      this.element.removeChild(this._fileSelectorElement);
    }
    this._fileSelectorElement = UI.UIUtils.createFileSelectorElement(this._loadFromFile.bind(this));
    ProfilesPanel._fileSelectorElement = this._fileSelectorElement;
    this.element.appendChild(this._fileSelectorElement);
  }

  /**
   * @param {string} fileName
   * @return {?ProfileType}
   */
  _findProfileTypeByExtension(fileName) {
    return this._profileTypes.find(type => !!type.fileExtension() && fileName.endsWith(type.fileExtension() || '')) ||
        null;
  }

  /**
   * @param {!File} file
   */
  async _loadFromFile(file) {
    this._createFileSelectorElement();

    const profileType = this._findProfileTypeByExtension(file.name);
    if (!profileType) {
      const extensions = new Set(this._profileTypes.map(type => type.fileExtension()).filter(ext => ext));
      Common.Console.Console.instance().error(Common.UIString.UIString(
          'Can’t load file. Supported file extensions: `%s`.', Array.from(extensions).join("', '")));
      return;
    }

    if (!!profileType.profileBeingRecorded()) {
      Common.Console.Console.instance().error(
          Common.UIString.UIString('Can’t load profile while another profile is being recorded.'));
      return;
    }

    const error = await profileType.loadFromFile(file);
    if (error) {
      UI.UIUtils.MessageDialog.show(Common.UIString.UIString('Profile loading failed: %s.', error.message));
    }
  }

  /**
   * @return {boolean}
   */
  toggleRecord() {
    if (!this._toggleRecordAction.enabled()) {
      return true;
    }
    const toggleButton = this.element.ownerDocument.deepActiveElement();
    const type = this._selectedProfileType;
    const isProfiling = type.buttonClicked();
    this._updateToggleRecordAction(isProfiling);
    if (isProfiling) {
      this._launcherView.profileStarted();
      if (type.hasTemporaryView()) {
        this.showProfile(type.profileBeingRecorded());
      }
    } else {
      this._launcherView.profileFinished();
    }
    if (toggleButton) {
      toggleButton.focus();
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
    const hasSelectedTarget =
        !!(self.UI.context.flavor(SDK.CPUProfilerModel.CPUProfilerModel) ||
           self.UI.context.flavor(SDK.HeapProfilerModel.HeapProfilerModel));
    const enable = toggled || (!SDK.SDKModel.TargetManager.instance().allTargetsSuspended() && hasSelectedTarget);
    this._toggleRecordAction.setEnabled(enable);
    this._toggleRecordAction.setToggled(toggled);
    if (enable) {
      this._toggleRecordButton.setTitle(this._selectedProfileType ? this._selectedProfileType.buttonTooltip : '');
    } else {
      this._toggleRecordButton.setTitle(UI.UIUtils.anotherProfilerActiveLabel());
    }
    if (this._selectedProfileType) {
      this._launcherView.updateProfileType(this._selectedProfileType, enable);
    }
  }

  _profileBeingRecordedRemoved() {
    this._updateToggleRecordAction(false);
    this._launcherView.profileFinished();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onProfileTypeSelected(event) {
    this._selectedProfileType = /** @type {!ProfileType} */ (event.data);
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
   * @param {!ProfileType} profileType
   */
  _registerProfileType(profileType) {
    this._launcherView.addProfileType(profileType);
    const profileTypeSection = new ProfileTypeSidebarSection(this, profileType);
    this._typeIdToSidebarSection[profileType.id] = profileTypeSection;
    this._sidebarTree.appendChild(profileTypeSection);
    profileTypeSection.childrenListElement.addEventListener(
        'contextmenu', this._handleContextMenuEvent.bind(this), false);

    /**
     * @param {!Common.EventTarget.EventTargetEvent} event
     * @this {ProfilesPanel}
     */
    function onAddProfileHeader(event) {
      this._addProfileHeader(/** @type {!ProfileHeader} */ (event.data));
    }

    /**
     * @param {!Common.EventTarget.EventTargetEvent} event
     * @this {ProfilesPanel}
     */
    function onRemoveProfileHeader(event) {
      this._removeProfileHeader(/** @type {!ProfileHeader} */ (event.data));
    }

    /**
     * @param {!Common.EventTarget.EventTargetEvent} event
     * @this {ProfilesPanel}
     */
    function profileComplete(event) {
      this.showProfile(/** @type {!ProfileHeader} */ (event.data));
    }

    profileType.addEventListener(ProfileTypeEvents.ViewUpdated, this._updateProfileTypeSpecificUI, this);
    profileType.addEventListener(ProfileTypeEvents.AddProfileHeader, onAddProfileHeader, this);
    profileType.addEventListener(ProfileTypeEvents.RemoveProfileHeader, onRemoveProfileHeader, this);
    profileType.addEventListener(ProfileTypeEvents.ProfileComplete, profileComplete, this);

    const profiles = profileType.getProfiles();
    for (let i = 0; i < profiles.length; i++) {
      this._addProfileHeader(profiles[i]);
    }
  }

  /**
   * @param {!Event} event
   */
  _handleContextMenuEvent(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    if (this.panelSidebarElement().isSelfOrAncestor(event.srcElement)) {
      contextMenu.defaultSection().appendItem(
          Common.UIString.UIString('Load…'), this._fileSelectorElement.click.bind(this._fileSelectorElement));
    }
    contextMenu.show();
  }

  showLoadFromFileDialog() {
    this._fileSelectorElement.click();
  }

  /**
   * @param {!ProfileHeader} profile
   */
  _addProfileHeader(profile) {
    const profileType = profile.profileType();
    const typeId = profileType.id;
    this._typeIdToSidebarSection[typeId].addProfileHeader(profile);
    if (!this.visibleView || this.visibleView === this._launcherView) {
      this.showProfile(profile);
    }
  }

  /**
   * @param {!ProfileHeader} profile
   */
  _removeProfileHeader(profile) {
    if (profile.profileType().profileBeingRecorded() === profile) {
      this._profileBeingRecordedRemoved();
    }

    const i = this._indexOfViewForProfile(profile);
    if (i !== -1) {
      this._profileToView.splice(i, 1);
    }

    const typeId = profile.profileType().id;
    const sectionIsEmpty = this._typeIdToSidebarSection[typeId].removeProfileHeader(profile);

    // No other item will be selected if there aren't any other profiles, so
    // make sure that view gets cleared when the last profile is removed.
    if (sectionIsEmpty) {
      this.profilesItemTreeElement.select();
      this._showLauncherView();
    }
  }

  /**
   * @override
   * @param {?ProfileHeader} profile
   * @return {?UI.Widget.Widget}
   */
  showProfile(profile) {
    if (!profile ||
        (profile.profileType().profileBeingRecorded() === profile) && !profile.profileType().hasTemporaryView()) {
      return null;
    }

    const view = this.viewForProfile(profile);
    if (view === this.visibleView) {
      return view;
    }

    this.closeVisibleView();

    view.show(this.profileViews);
    this._toolbarElement.classList.remove('hidden');
    this.visibleView = view;

    const profileTypeSection = this._typeIdToSidebarSection[profile.profileType().id];
    const sidebarElement = profileTypeSection.sidebarElementForProfile(profile);
    sidebarElement.revealAndSelect();

    this._profileViewToolbar.removeToolbarItems();

    view.toolbarItems().then(items => {
      items.map(item => this._profileViewToolbar.appendToolbarItem(item));
    });

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
   * @override
   * @param {number} nodeIndex
   * @return {!Promise<?Element>}
   */
  async linkifyObject(nodeIndex) {
    return null;
  }

  /**
   * @param {!ProfileHeader} profile
   * @return {!UI.Widget.Widget}
   */
  viewForProfile(profile) {
    const index = this._indexOfViewForProfile(profile);
    if (index !== -1) {
      return this._profileToView[index].view;
    }
    const view = profile.createView(this);
    view.element.classList.add('profile-view');
    this._profileToView.push({profile: profile, view: view});
    return view;
  }

  /**
   * @param {!ProfileHeader} profile
   * @return {number}
   */
  _indexOfViewForProfile(profile) {
    return this._profileToView.findIndex(item => item.profile === profile);
  }

  closeVisibleView() {
    if (this.visibleView) {
      this.visibleView.detach();
    }
    delete this.visibleView;
  }

  /**
   * @override
   */
  focus() {
    this._sidebarTree.focus();
  }
}

/**
 * @unrestricted
 */
export class ProfileTypeSidebarSection extends UI.TreeOutline.TreeElement {
  /**
   * @param {!DataDisplayDelegate} dataDisplayDelegate
   * @param {!ProfileType} profileType
   */
  constructor(dataDisplayDelegate, profileType) {
    super(profileType.treeItemTitle, true);
    this.selectable = false;
    this._dataDisplayDelegate = dataDisplayDelegate;
    /** @type {!Array<!ProfileSidebarTreeElement>} */
    this._profileTreeElements = [];
    /** @type {!Object<string, !ProfileGroup>} */
    this._profileGroups = {};
    this.expand();
    this.hidden = true;
    this.setCollapsible(false);
  }

  /**
   * @param {!ProfileHeader} profile
   */
  addProfileHeader(profile) {
    this.hidden = false;
    const profileType = profile.profileType();
    let sidebarParent = this;
    const profileTreeElement =
        /** @type {!ProfileSidebarTreeElement} */ (profile.createSidebarTreeElement(this._dataDisplayDelegate));
    this._profileTreeElements.push(profileTreeElement);

    if (!profile.fromFile() && profileType.profileBeingRecorded() !== profile) {
      const profileTitle = profile.title;
      let group = this._profileGroups[profileTitle];
      if (!group) {
        group = new ProfileGroup();
        this._profileGroups[profileTitle] = group;
      }
      group.profileSidebarTreeElements.push(profileTreeElement);

      const groupSize = group.profileSidebarTreeElements.length;
      if (groupSize === 2) {
        // Make a group UI.TreeOutline.TreeElement now that there are 2 profiles.
        group.sidebarTreeElement = new ProfileGroupSidebarTreeElement(this._dataDisplayDelegate, profile.title);

        const firstProfileTreeElement = group.profileSidebarTreeElements[0];
        // Insert at the same index for the first profile of the group.
        const index = this.children().indexOf(firstProfileTreeElement);
        this.insertChild(group.sidebarTreeElement, index);

        // Move the first profile to the group.
        const selected = firstProfileTreeElement.selected;
        this.removeChild(firstProfileTreeElement);
        group.sidebarTreeElement.appendChild(firstProfileTreeElement);
        if (selected) {
          firstProfileTreeElement.revealAndSelect();
        }

        firstProfileTreeElement.setSmall(true);
        firstProfileTreeElement.setMainTitle(Common.UIString.UIString('Run %d', 1));

        this.treeOutline.element.classList.add('some-expandable');
      }

      if (groupSize >= 2) {
        sidebarParent = group.sidebarTreeElement;
        profileTreeElement.setSmall(true);
        profileTreeElement.setMainTitle(Common.UIString.UIString('Run %d', groupSize));
      }
    }

    sidebarParent.appendChild(profileTreeElement);
  }

  /**
   * @param {!ProfileHeader} profile
   * @return {boolean}
   */
  removeProfileHeader(profile) {
    const index = this._sidebarElementIndex(profile);
    if (index === -1) {
      return false;
    }
    const profileTreeElement = this._profileTreeElements[index];
    this._profileTreeElements.splice(index, 1);

    let sidebarParent = this;
    const group = this._profileGroups[profile.title];
    if (group) {
      const groupElements = group.profileSidebarTreeElements;
      groupElements.splice(groupElements.indexOf(profileTreeElement), 1);
      if (groupElements.length === 1) {
        // Move the last profile out of its group and remove the group.
        const pos = sidebarParent.children().indexOf(
            /** @type {!ProfileGroupSidebarTreeElement} */ (group.sidebarTreeElement));
        group.sidebarTreeElement.removeChild(groupElements[0]);
        this.insertChild(groupElements[0], pos);
        groupElements[0].setSmall(false);
        groupElements[0].setMainTitle(profile.title);
        this.removeChild(group.sidebarTreeElement);
      }
      if (groupElements.length !== 0) {
        sidebarParent = group.sidebarTreeElement;
      }
    }
    sidebarParent.removeChild(profileTreeElement);
    profileTreeElement.dispose();

    if (this.childCount()) {
      return false;
    }
    this.hidden = true;
    return true;
  }

  /**
   * @param {!ProfileHeader} profile
   * @return {?ProfileSidebarTreeElement}
   */
  sidebarElementForProfile(profile) {
    const index = this._sidebarElementIndex(profile);
    return index === -1 ? null : this._profileTreeElements[index];
  }

  /**
   * @param {!ProfileHeader} profile
   * @return {number}
   */
  _sidebarElementIndex(profile) {
    const elements = this._profileTreeElements;
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].profile === profile) {
        return i;
      }
    }
    return -1;
  }

  /**
   * @override
   */
  onattach() {
    this.listItemElement.classList.add('profiles-tree-section');
  }
}

/**
 * @unrestricted
 */
export class ProfileGroup {
  constructor() {
    /** @type {!Array<!ProfileSidebarTreeElement>} */
    this.profileSidebarTreeElements = [];
    /** @type {?ProfileGroupSidebarTreeElement} */
    this.sidebarTreeElement = null;
  }
}

/**
 * @unrestricted
 */
export class ProfileGroupSidebarTreeElement extends UI.TreeOutline.TreeElement {
  /**
   * @param {!DataDisplayDelegate} dataDisplayDelegate
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
    const hasChildren = this.childCount() > 0;
    if (hasChildren) {
      this._dataDisplayDelegate.showProfile(this.lastChild().profile);
    }
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
}

export class ProfilesSidebarTreeElement extends UI.TreeOutline.TreeElement {
  /**
   * @param {!ProfilesPanel} panel
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
        .textContent = Common.UIString.UIString('Profiles');
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 */
export class JSProfilerPanel extends ProfilesPanel {
  constructor() {
    const registry = instance;
    super('js_profiler', [registry.cpuProfileType], 'profiler.js-toggle-recording');
  }

  /**
   * @override
   */
  wasShown() {
    self.UI.context.setFlavor(JSProfilerPanel, this);
  }

  /**
   * @override
   */
  willHide() {
    self.UI.context.setFlavor(JSProfilerPanel, null);
  }

  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const panel = self.UI.context.flavor(JSProfilerPanel);
    console.assert(panel && panel instanceof JSProfilerPanel);
    panel.toggleRecord();
    return true;
  }
}
