// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import type * as TextUtils from '../../core/text_utils/text_utils.js';

export interface SaveCallbackParam {
  fileSystemPath?: Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString;
}

export class FileManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #saveCallbacks = new Map<
      Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString, (arg0: SaveCallbackParam|null) => void>();
  readonly #eventDescriptors: Common.EventTarget.EventDescriptor[];
  constructor() {
    super();
    this.#eventDescriptors = [
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
          Host.InspectorFrontendHostAPI.Events.SavedURL, this.savedURL, this),
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
          Host.InspectorFrontendHostAPI.Events.CanceledSaveURL, this.#canceledSavedURL, this),
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
          Host.InspectorFrontendHostAPI.Events.AppendedToURL, this.appendedToURL, this),
    ];
  }

  dispose(): void {
    Common.EventTarget.removeEventListeners(this.#eventDescriptors);
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): FileManager {
    const {forceNew} = opts;
    if (!Root.DevToolsContext.globalInstance().has(FileManager) || forceNew) {
      Root.DevToolsContext.globalInstance().set(FileManager, new FileManager());
    }

    return Root.DevToolsContext.globalInstance().get(FileManager);
  }

  static removeInstance(): void {
    Root.DevToolsContext.globalInstance().delete(FileManager);
  }

  /**
   * {@link FileManager.close | close} *must* be called, for the InspectorFrontendHostStub case, to complete the saving.
   * @param url The url of the file to save. **NOTE:** The backend truncates this filename to 64 characters.
   */
  save(
      url: Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString,
      contentData: TextUtils.ContentData.ContentData,
      forceSaveAs: boolean,
      ): Promise<SaveCallbackParam|null> {
    // Remove this url from the saved URLs while it is being saved.
    const result = new Promise<SaveCallbackParam|null>(resolve => this.#saveCallbacks.set(url, resolve));
    const {isTextContent} = contentData;
    const content = isTextContent ? contentData.text : contentData.base64;
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.save(url, content, forceSaveAs, !isTextContent);
    return result;
  }

  /**
   * Used in web tests
   */
  private savedURL(event: Common.EventTarget.EventTargetEvent<Host.InspectorFrontendHostAPI.SavedURLEvent>): void {
    const {url, fileSystemPath} = event.data;
    const callback = this.#saveCallbacks.get(url);
    this.#saveCallbacks.delete(url);
    if (callback) {
      callback({fileSystemPath});
    }
  }

  #canceledSavedURL({data: url}: Common.EventTarget.EventTargetEvent<Platform.DevToolsPath.UrlString>): void {
    const callback = this.#saveCallbacks.get(url);
    this.#saveCallbacks.delete(url);
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

  /**
   * Used in web tests
   */
  private appendedToURL({data: url}: Common.EventTarget.EventTargetEvent<string>): void {
    this.dispatchEventToListeners(Events.APPENDED_TO_URL, url);
  }
}

export const enum Events {
  APPENDED_TO_URL = 'AppendedToURL',
}

export interface EventTypes {
  [Events.APPENDED_TO_URL]: string;
}
