// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import type * as UI from '../ui/ui.js';

export class ProfileHeader extends Common.ObjectWrapper.ObjectWrapper {
  _profileType: ProfileType;
  title: string;
  uid: number;
  _fromFile: boolean;
  tempFile: Bindings.TempFile.TempFile|null;

  constructor(profileType: ProfileType, title: string) {
    super();
    this._profileType = profileType;
    this.title = title;
    this.uid = profileType.incrementProfileUid();
    this._fromFile = false;

    this.tempFile = null;
  }

  setTitle(title: string): void {
    this.title = title;
    this.dispatchEventToListeners(Events.ProfileTitleChanged, this);
  }

  profileType(): ProfileType {
    return this._profileType;
  }

  updateStatus(subtitle: string|null, wait?: boolean): void {
    this.dispatchEventToListeners(Events.UpdateStatus, new StatusUpdate(subtitle, wait));
  }

  /**
   * Must be implemented by subclasses.
   */
  createSidebarTreeElement(_dataDisplayDelegate: DataDisplayDelegate): UI.TreeOutline.TreeElement {
    throw new Error('Not implemented.');
  }

  createView(_dataDisplayDelegate: DataDisplayDelegate): UI.Widget.Widget {
    throw new Error('Not implemented.');
  }

  removeTempFile(): void {
    if (this.tempFile) {
      this.tempFile.remove();
    }
  }

  dispose(): void {
  }

  canSaveToFile(): boolean {
    return false;
  }

  saveToFile(): void {
    throw new Error('Not implemented.');
  }

  loadFromFile(_file: File): Promise<Error|DOMError|null> {
    throw new Error('Not implemented.');
  }

  fromFile(): boolean {
    return this._fromFile;
  }

  setFromFile(): void {
    this._fromFile = true;
  }

  setProfile(_profile: Protocol.Profiler.Profile): void {
  }
}

export class StatusUpdate {
  subtitle: string|null;
  wait: boolean|undefined;
  constructor(subtitle: string|null, wait: boolean|undefined) {
    this.subtitle = subtitle;
    this.wait = wait;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  UpdateStatus = 'UpdateStatus',
  ProfileReceived = 'ProfileReceived',
  ProfileTitleChanged = 'ProfileTitleChanged',
}

export abstract class ProfileType extends Common.ObjectWrapper.ObjectWrapper {
  _id: string;
  _name: string;
  _profiles: ProfileHeader[];
  _profileBeingRecorded: ProfileHeader|null;
  _nextProfileUid: number;

  constructor(id: string, name: string) {
    super();
    this._id = id;
    this._name = name;
    this._profiles = [];
    this._profileBeingRecorded = null;
    this._nextProfileUid = 1;

    if (!window.opener) {
      window.addEventListener('unload', this._clearTempStorage.bind(this), false);
    }
  }

  typeName(): string {
    return '';
  }

  nextProfileUid(): number {
    return this._nextProfileUid;
  }

  incrementProfileUid(): number {
    return this._nextProfileUid++;
  }

  hasTemporaryView(): boolean {
    return false;
  }

  fileExtension(): string|null {
    return null;
  }

  get buttonTooltip(): string {
    return '';
  }

  get id(): string {
    return this._id;
  }

  get treeItemTitle(): string {
    return this._name;
  }

  get name(): string {
    return this._name;
  }

  buttonClicked(): boolean {
    return false;
  }

  get description(): string {
    return '';
  }

  isInstantProfile(): boolean {
    return false;
  }

  isEnabled(): boolean {
    return true;
  }

  getProfiles(): ProfileHeader[] {
    function isFinished(this: ProfileType, profile: ProfileHeader): boolean {
      return this._profileBeingRecorded !== profile;
    }
    return this._profiles.filter(isFinished.bind(this));
  }

  customContent(): Element|null {
    return null;
  }

  setCustomContentEnabled(_enable: boolean): void {
  }

  getProfile(uid: number): ProfileHeader|null {
    for (let i = 0; i < this._profiles.length; ++i) {
      if (this._profiles[i].uid === uid) {
        return this._profiles[i];
      }
    }
    return null;
  }

  loadFromFile(file: File): Promise<Error|DOMError|null> {
    let name: string = file.name;
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

  abstract createProfileLoadedFromFile(title: string): ProfileHeader;

  addProfile(profile: ProfileHeader): void {
    this._profiles.push(profile);
    this.dispatchEventToListeners(ProfileEvents.AddProfileHeader, profile);
  }

  removeProfile(profile: ProfileHeader): void {
    const index = this._profiles.indexOf(profile);
    if (index === -1) {
      return;
    }
    this._profiles.splice(index, 1);
    this._disposeProfile(profile);
  }

  _clearTempStorage(): void {
    for (let i = 0; i < this._profiles.length; ++i) {
      this._profiles[i].removeTempFile();
    }
  }

  profileBeingRecorded(): ProfileHeader|null {
    return this._profileBeingRecorded;
  }

  setProfileBeingRecorded(profile: ProfileHeader|null): void {
    this._profileBeingRecorded = profile;
  }

  profileBeingRecordedRemoved(): void {
  }

  reset(): void {
    for (const profile of this._profiles.slice()) {
      this._disposeProfile(profile);
    }
    this._profiles = [];
    this._nextProfileUid = 1;
  }

  _disposeProfile(profile: ProfileHeader): void {
    this.dispatchEventToListeners(ProfileEvents.RemoveProfileHeader, profile);
    profile.dispose();
    if (this._profileBeingRecorded === profile) {
      this.profileBeingRecordedRemoved();
      this.setProfileBeingRecorded(null);
    }
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum ProfileEvents {
  AddProfileHeader = 'add-profile-header',
  ProfileComplete = 'profile-complete',
  RemoveProfileHeader = 'remove-profile-header',
  ViewUpdated = 'view-updated',
}

export interface DataDisplayDelegate {
  showProfile(profile: ProfileHeader|null): UI.Widget.Widget|null;
  showObject(snapshotObjectId: string, perspectiveName: string): void;
  linkifyObject(nodeIndex: number): Promise<Element|null>;
}
