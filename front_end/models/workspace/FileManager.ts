/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';

let fileManagerInstance: FileManager|null;

interface SaveCallbackParam {
  fileSystemPath?: Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString;
}

export class FileManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private readonly saveCallbacks:
      Map<Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString, (arg0: SaveCallbackParam|null) => void>;
  private constructor() {
    super();
    this.saveCallbacks = new Map();
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.SavedURL, this.savedURL, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.CanceledSaveURL, this.canceledSavedURL, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.AppendedToURL, this.appendedToURL, this);
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): FileManager {
    const {forceNew} = opts;
    if (!fileManagerInstance || forceNew) {
      fileManagerInstance = new FileManager();
    }

    return fileManagerInstance;
  }

  // close() *must* be called, for the InspectorFrontendHostStub case, to complete the saving.
  save(
      url: Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString, content: string, forceSaveAs: boolean,
      isBase64: boolean): Promise<SaveCallbackParam|null> {
    // Remove this url from the saved URLs while it is being saved.
    const result = new Promise<SaveCallbackParam|null>(resolve => this.saveCallbacks.set(url, resolve));
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.save(url, content, forceSaveAs, isBase64);
    return result;
  }

  private savedURL(event: Common.EventTarget.EventTargetEvent<Host.InspectorFrontendHostAPI.SavedURLEvent>): void {
    const {url, fileSystemPath} = event.data;
    const callback = this.saveCallbacks.get(url);
    this.saveCallbacks.delete(url);
    if (callback) {
      callback({fileSystemPath});
    }
  }

  private canceledSavedURL({data: url}: Common.EventTarget.EventTargetEvent<Platform.DevToolsPath.UrlString>): void {
    const callback = this.saveCallbacks.get(url);
    this.saveCallbacks.delete(url);
    if (callback) {
      callback(null);
    }
  }

  append(url: Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString, content: string): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.append(url, content);
  }

  close(url: Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.close(url);
  }

  private appendedToURL({data: url}: Common.EventTarget.EventTargetEvent<string>): void {
    this.dispatchEventToListeners(Events.APPENDED_TO_URL, url);
  }
}

export const enum Events {
  APPENDED_TO_URL = 'AppendedToURL',
}

export type EventTypes = {
  [Events.APPENDED_TO_URL]: string,
};
