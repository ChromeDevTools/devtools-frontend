// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as UI from '../ui/ui.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class ProfileHeader extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!ProfileType} profileType
   * @param {string} title
   */
  constructor(profileType, title) {
    super();
    this._profileType = profileType;
    this.title = title;
    this.uid = profileType.incrementProfileUid();
    this._fromFile = false;
  }

  /**
   * @param {string} title
   */
  setTitle(title) {
    this.title = title;
    this.dispatchEventToListeners(Events.ProfileTitleChanged, this);
  }

  /**
   * @return {!ProfileType}
   */
  profileType() {
    return this._profileType;
  }

  /**
   * @param {?string} subtitle
   * @param {boolean=} wait
   */
  updateStatus(subtitle, wait) {
    this.dispatchEventToListeners(Events.UpdateStatus, new StatusUpdate(subtitle, wait));
  }

  /**
   * Must be implemented by subclasses.
   * @param {!DataDisplayDelegate} dataDisplayDelegate
   * @return {!UI.TreeOutline.TreeElement}
   */
  createSidebarTreeElement(dataDisplayDelegate) {
    throw new Error('Not implemented.');
  }

  /**
   * @param {!DataDisplayDelegate} dataDisplayDelegate
   * @return {!UI.Widget.Widget}
   */
  createView(dataDisplayDelegate) {
    throw new Error('Not implemented.');
  }

  removeTempFile() {
    if (this._tempFile) {
      this._tempFile.remove();
    }
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
    throw new Error('Not implemented');
  }

  /**
   * @param {!File} file
   * @return {!Promise<?Error|?FileError>}
   */
  loadFromFile(file) {
    throw new Error('Not implemented');
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

  /**
   * @param {!Protocol.Profiler.Profile} profile
   */
  setProfile(profile) {
  }
}

/**
 * @unrestricted
 */
export class StatusUpdate {
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
}

/** @enum {symbol} */
export const Events = {
  UpdateStatus: Symbol('UpdateStatus'),
  ProfileReceived: Symbol('ProfileReceived'),
  ProfileTitleChanged: Symbol('ProfileTitleChanged')
};

/**
 * @unrestricted
 */
export class ProfileType extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {string} id
   * @param {string} name
   * @suppressGlobalPropertiesCheck
   */
  constructor(id, name) {
    super();
    this._id = id;
    this._name = name;
    /** @type {!Array.<!ProfileHeader>} */
    this._profiles = [];
    /** @type {?ProfileHeader} */
    this._profileBeingRecorded = null;
    this._nextProfileUid = 1;

    if (!window.opener) {
      window.addEventListener('unload', this._clearTempStorage.bind(this), false);
    }
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
   * @return {number}
   */
  incrementProfileUid() {
    return this._nextProfileUid++;
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
   * @return {!Array.<!ProfileHeader>}
   */
  getProfiles() {
    /**
     * @param {!ProfileHeader} profile
     * @return {boolean}
     * @this {ProfileType}
     */
    function isFinished(profile) {
      return this._profileBeingRecorded !== profile;
    }
    return this._profiles.filter(isFinished.bind(this));
  }

  /**
   * @return {?Element}
   */
  customContent() {
    return null;
  }

  /**
   * @param {boolean} enable
   */
  setCustomContentEnabled(enable) {
  }

  /**
   * @param {number} uid
   * @return {?ProfileHeader}
   */
  getProfile(uid) {
    for (let i = 0; i < this._profiles.length; ++i) {
      if (this._profiles[i].uid === uid) {
        return this._profiles[i];
      }
    }
    return null;
  }

  /**
   * @param {!File} file
   * @return {!Promise<?Error|?FileError>}
   */
  loadFromFile(file) {
    let name = file.name;
    const fileExtension = this.fileExtension();
    if (fileExtension && name.endsWith(fileExtension)) {
      name = name.substr(0, name.length - fileExtension.length);
    }
    const profile = this.createProfileLoadedFromFile(name);
    profile.setFromFile();
    this.setProfileBeingRecorded(profile);
    this.addProfile(profile);
    return profile.loadFromFile(file);
  }

  /**
   * @param {string} title
   * @return {!ProfileHeader}
   */
  createProfileLoadedFromFile(title) {
    throw new Error('Needs implemented.');
  }

  /**
   * @param {!ProfileHeader} profile
   */
  addProfile(profile) {
    this._profiles.push(profile);
    this.dispatchEventToListeners(ProfileEvents.AddProfileHeader, profile);
  }

  /**
   * @param {!ProfileHeader} profile
   */
  removeProfile(profile) {
    const index = this._profiles.indexOf(profile);
    if (index === -1) {
      return;
    }
    this._profiles.splice(index, 1);
    this._disposeProfile(profile);
  }

  _clearTempStorage() {
    for (let i = 0; i < this._profiles.length; ++i) {
      this._profiles[i].removeTempFile();
    }
  }

  /**
   * @return {?ProfileHeader}
   */
  profileBeingRecorded() {
    return this._profileBeingRecorded;
  }

  /**
   * @param {?ProfileHeader} profile
   */
  setProfileBeingRecorded(profile) {
    this._profileBeingRecorded = profile;
  }

  profileBeingRecordedRemoved() {
  }

  reset() {
    for (const profile of this._profiles.slice()) {
      this._disposeProfile(profile);
    }
    this._profiles = [];
    this._nextProfileUid = 1;
  }

  /**
   * @param {!ProfileHeader} profile
   */
  _disposeProfile(profile) {
    this.dispatchEventToListeners(ProfileEvents.RemoveProfileHeader, profile);
    profile.dispose();
    if (this._profileBeingRecorded === profile) {
      this.profileBeingRecordedRemoved();
      this.setProfileBeingRecorded(null);
    }
  }
}

/** @enum {symbol} */
export const ProfileEvents = {
  AddProfileHeader: Symbol('add-profile-header'),
  ProfileComplete: Symbol('profile-complete'),
  RemoveProfileHeader: Symbol('remove-profile-header'),
  ViewUpdated: Symbol('view-updated')
};

/**
 * @interface
 */
export class DataDisplayDelegate {
  /**
   * @param {?ProfileHeader} profile
   * @return {?UI.Widget.Widget}
   */
  showProfile(profile) {
  }

  /**
   * @param {!Protocol.HeapProfiler.HeapSnapshotObjectId} snapshotObjectId
   * @param {string} perspectiveName
   */
  showObject(snapshotObjectId, perspectiveName) {
  }

  /**
   * @param {number} nodeIndex
   * @return {!Promise<?Element>}
   */
  async linkifyObject(nodeIndex) {
  }
}
