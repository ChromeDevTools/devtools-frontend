// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Bindings from '../../models/bindings/bindings.js';
import * as Common from '../../core/common/common.js';
import type * as UI from '../../ui/legacy/legacy.js';
import type * as Protocol from '../../generated/protocol.js';

export class ProfileHeader extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly profileTypeInternal: ProfileType;
  title: string;
  uid: number;
  fromFileInternal: boolean;
  tempFile: Bindings.TempFile.TempFile|null;

  constructor(profileType: ProfileType, title: string) {
    super();
    this.profileTypeInternal = profileType;
    this.title = title;
    this.uid = profileType.incrementProfileUid();
    this.fromFileInternal = false;

    this.tempFile = null;
  }

  setTitle(title: string): void {
    this.title = title;
    this.dispatchEventToListeners(Events.ProfileTitleChanged, this);
  }

  profileType(): ProfileType {
    return this.profileTypeInternal;
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
    return this.fromFileInternal;
  }

  setFromFile(): void {
    this.fromFileInternal = true;
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

export type EventTypes = {
  [Events.UpdateStatus]: StatusUpdate,
  [Events.ProfileReceived]: void,
  [Events.ProfileTitleChanged]: ProfileHeader,
};

export class ProfileType extends Common.ObjectWrapper.ObjectWrapper<ProfileEventTypes> {
  readonly idInternal: string;
  readonly nameInternal: string;
  profiles: ProfileHeader[];
  profileBeingRecordedInternal: ProfileHeader|null;
  nextProfileUidInternal: number;

  constructor(id: string, name: string) {
    super();
    this.idInternal = id;
    this.nameInternal = name;
    this.profiles = [];
    this.profileBeingRecordedInternal = null;
    this.nextProfileUidInternal = 1;

    if (!window.opener) {
      window.addEventListener('unload', this.clearTempStorage.bind(this), false);
    }
  }

  typeName(): string {
    return '';
  }

  nextProfileUid(): number {
    return this.nextProfileUidInternal;
  }

  incrementProfileUid(): number {
    return this.nextProfileUidInternal++;
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
    return this.idInternal;
  }

  get treeItemTitle(): string {
    return this.nameInternal;
  }

  get name(): string {
    return this.nameInternal;
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
      return this.profileBeingRecordedInternal !== profile;
    }
    return this.profiles.filter(isFinished.bind(this));
  }

  customContent(): Element|null {
    return null;
  }

  setCustomContentEnabled(_enable: boolean): void {
  }

  getProfile(uid: number): ProfileHeader|null {
    for (let i = 0; i < this.profiles.length; ++i) {
      if (this.profiles[i].uid === uid) {
        return this.profiles[i];
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

  createProfileLoadedFromFile(_title: string): ProfileHeader {
    throw new Error('Not implemented');
  }

  addProfile(profile: ProfileHeader): void {
    this.profiles.push(profile);
    this.dispatchEventToListeners(ProfileEvents.AddProfileHeader, profile);
  }

  removeProfile(profile: ProfileHeader): void {
    const index = this.profiles.indexOf(profile);
    if (index === -1) {
      return;
    }
    this.profiles.splice(index, 1);
    this.disposeProfile(profile);
  }

  clearTempStorage(): void {
    for (let i = 0; i < this.profiles.length; ++i) {
      this.profiles[i].removeTempFile();
    }
  }

  profileBeingRecorded(): ProfileHeader|null {
    return this.profileBeingRecordedInternal;
  }

  setProfileBeingRecorded(profile: ProfileHeader|null): void {
    this.profileBeingRecordedInternal = profile;
  }

  profileBeingRecordedRemoved(): void {
  }

  reset(): void {
    for (const profile of this.profiles.slice()) {
      this.disposeProfile(profile);
    }
    this.profiles = [];
    this.nextProfileUidInternal = 1;
  }

  disposeProfile(profile: ProfileHeader): void {
    this.dispatchEventToListeners(ProfileEvents.RemoveProfileHeader, profile);
    profile.dispose();
    if (this.profileBeingRecordedInternal === profile) {
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

export type ProfileEventTypes = {
  [ProfileEvents.AddProfileHeader]: ProfileHeader,
  [ProfileEvents.ProfileComplete]: ProfileHeader,
  [ProfileEvents.RemoveProfileHeader]: ProfileHeader,
  [ProfileEvents.ViewUpdated]: void,
};

export interface DataDisplayDelegate {
  showProfile(profile: ProfileHeader|null): UI.Widget.Widget|null;
  showObject(snapshotObjectId: string, perspectiveName: string): void;
  linkifyObject(nodeIndex: number): Promise<Element|null>;
}
