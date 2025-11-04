// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
export class ProfileHeader extends Common.ObjectWrapper.ObjectWrapper {
    #profileType;
    title;
    uid;
    #fromFile;
    tempFile;
    constructor(profileType, title) {
        super();
        this.#profileType = profileType;
        this.title = title;
        this.uid = profileType.incrementProfileUid();
        this.#fromFile = false;
        this.tempFile = null;
    }
    setTitle(title) {
        this.title = title;
        this.dispatchEventToListeners("ProfileTitleChanged" /* Events.PROFILE_TITLE_CHANGED */, this);
    }
    profileType() {
        return this.#profileType;
    }
    updateStatus(subtitle, wait) {
        this.dispatchEventToListeners("UpdateStatus" /* Events.UPDATE_STATUS */, new StatusUpdate(subtitle, wait));
    }
    /**
     * Must be implemented by subclasses.
     */
    createSidebarTreeElement(_dataDisplayDelegate) {
        throw new Error('Not implemented.');
    }
    createView(_dataDisplayDelegate) {
        throw new Error('Not implemented.');
    }
    removeTempFile() {
        if (this.tempFile) {
            this.tempFile.remove();
        }
    }
    dispose() {
    }
    canSaveToFile() {
        return false;
    }
    saveToFile() {
        throw new Error('Not implemented.');
    }
    loadFromFile(_file) {
        throw new Error('Not implemented.');
    }
    fromFile() {
        return this.#fromFile;
    }
    setFromFile() {
        this.#fromFile = true;
    }
    setProfile(_profile) {
    }
}
export class StatusUpdate {
    subtitle;
    wait;
    constructor(subtitle, wait) {
        this.subtitle = subtitle;
        this.wait = wait;
    }
}
export class ProfileType extends Common.ObjectWrapper.ObjectWrapper {
    #id;
    #name;
    profiles;
    #profileBeingRecorded;
    #nextProfileUid;
    constructor(id, name) {
        super();
        this.#id = id;
        this.#name = name;
        this.profiles = [];
        this.#profileBeingRecorded = null;
        this.#nextProfileUid = 1;
        if (!window.opener) {
            window.addEventListener('pagehide', this.clearTempStorage.bind(this), false);
        }
    }
    typeName() {
        return '';
    }
    nextProfileUid() {
        return this.#nextProfileUid;
    }
    incrementProfileUid() {
        return this.#nextProfileUid++;
    }
    hasTemporaryView() {
        return false;
    }
    fileExtension() {
        return null;
    }
    get buttonTooltip() {
        return '';
    }
    get id() {
        return this.#id;
    }
    get treeItemTitle() {
        return this.#name;
    }
    get name() {
        return this.#name;
    }
    buttonClicked() {
        return false;
    }
    get description() {
        return '';
    }
    isInstantProfile() {
        return false;
    }
    isEnabled() {
        return true;
    }
    getProfiles() {
        function isFinished(profile) {
            return this.#profileBeingRecorded !== profile;
        }
        return this.profiles.filter(isFinished.bind(this));
    }
    customContent() {
        return null;
    }
    setCustomContentEnabled(_enable) {
    }
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
    createProfileLoadedFromFile(_title) {
        throw new Error('Not implemented');
    }
    addProfile(profile) {
        this.profiles.push(profile);
        this.dispatchEventToListeners("add-profile-header" /* ProfileEvents.ADD_PROFILE_HEADER */, profile);
    }
    removeProfile(profile) {
        const index = this.profiles.indexOf(profile);
        if (index === -1) {
            return;
        }
        this.profiles.splice(index, 1);
        this.disposeProfile(profile);
    }
    clearTempStorage() {
        for (let i = 0; i < this.profiles.length; ++i) {
            this.profiles[i].removeTempFile();
        }
    }
    profileBeingRecorded() {
        return this.#profileBeingRecorded;
    }
    setProfileBeingRecorded(profile) {
        this.#profileBeingRecorded = profile;
    }
    profileBeingRecordedRemoved() {
    }
    reset() {
        for (const profile of this.profiles.slice()) {
            this.disposeProfile(profile);
        }
        this.profiles = [];
        this.#nextProfileUid = 1;
    }
    disposeProfile(profile) {
        this.dispatchEventToListeners("remove-profile-header" /* ProfileEvents.REMOVE_PROFILE_HEADER */, profile);
        profile.dispose();
        if (this.#profileBeingRecorded === profile) {
            this.profileBeingRecordedRemoved();
            this.setProfileBeingRecorded(null);
        }
    }
}
//# sourceMappingURL=ProfileHeader.js.map