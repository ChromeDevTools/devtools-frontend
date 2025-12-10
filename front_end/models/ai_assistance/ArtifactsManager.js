// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export class ArtifactAddedEvent extends Event {
    artifact;
    static eventName = 'artifactadded';
    constructor(artifact) {
        super(ArtifactAddedEvent.eventName);
        this.artifact = artifact;
    }
}
let instance = null;
export class ArtifactsManager extends EventTarget {
    #artifacts = [];
    static instance() {
        if (!instance) {
            instance = new ArtifactsManager();
        }
        return instance;
    }
    static removeInstance() {
        instance = null;
    }
    constructor() {
        super();
    }
    get artifacts() {
        return this.#artifacts;
    }
    addArtifact(artifact) {
        this.#artifacts.push(artifact);
        this.dispatchEvent(new ArtifactAddedEvent(artifact));
    }
    clear() {
        this.#artifacts = [];
    }
}
//# sourceMappingURL=ArtifactsManager.js.map