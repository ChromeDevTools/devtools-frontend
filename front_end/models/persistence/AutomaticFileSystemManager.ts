// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as Root from '../../core/root/root.js';
import * as ProjectSettings from '../project_settings/project_settings.js';

/**
 * Description and state of the automatic file system.
 */
export interface AutomaticFileSystem {
  root: Platform.DevToolsPath.RawPathString;
  uuid: string;
  state: 'disconnected'|'connecting'|'connected';
}

let automaticFileSystemManagerInstance: AutomaticFileSystemManager|undefined;

/**
 * Automatically connects and disconnects workspace folders.
 *
 * @see http://go/chrome-devtools:automatic-workspace-folders-design
 */
export class AutomaticFileSystemManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #automaticFileSystem: AutomaticFileSystem|null;
  #inspectorFrontendHost: Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI;
  #projectSettingsModel: ProjectSettings.ProjectSettingsModel.ProjectSettingsModel;

  /**
   * Yields the current `AutomaticFileSystem` (if any).
   *
   * @return the current automatic file system or `null`.
   */
  get automaticFileSystem(): Readonly<AutomaticFileSystem>|null {
    return this.#automaticFileSystem;
  }

  /**
   * @internal
   */
  private constructor(
      hostConfig: Root.Runtime.HostConfig,
      inspectorFrontendHost: Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI,
      projectSettingsModel: ProjectSettings.ProjectSettingsModel.ProjectSettingsModel) {
    super();
    this.#automaticFileSystem = null;
    this.#inspectorFrontendHost = inspectorFrontendHost;
    this.#projectSettingsModel = projectSettingsModel;
    if (hostConfig.devToolsAutomaticFileSystems?.enabled) {
      this.#projectSettingsModel.addEventListener(
          ProjectSettings.ProjectSettingsModel.Events.PROJECT_SETTINGS_CHANGED, this.#projectSettingsChanged, this);
      this.#projectSettingsChanged({data: this.#projectSettingsModel.projectSettings});
    }
  }

  /**
   * Yields the `AutomaticFileSystemManager` singleton.
   *
   * @returns the singleton.
   */
  static instance({forceNew, hostConfig, inspectorFrontendHost, projectSettingsModel}: {
    forceNew: boolean|null,
    hostConfig: Root.Runtime.HostConfig|null,
    inspectorFrontendHost: Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI|null,
    projectSettingsModel: ProjectSettings.ProjectSettingsModel.ProjectSettingsModel|null,
  } = {forceNew: false, hostConfig: null, inspectorFrontendHost: null, projectSettingsModel: null}):
      AutomaticFileSystemManager {
    if (!automaticFileSystemManagerInstance || forceNew) {
      if (!hostConfig || !inspectorFrontendHost || !projectSettingsModel) {
        throw new Error(
            'Unable to create AutomaticFileSysteManager: ' +
            'hostConfig, inspectorFrontendHost, and projectSettingsModel must be provided');
      }
      automaticFileSystemManagerInstance = new AutomaticFileSystemManager(
          hostConfig,
          inspectorFrontendHost,
          projectSettingsModel,
      );
    }
    return automaticFileSystemManagerInstance;
  }

  /**
   * Clears the `AutomaticFileSystemManager` singleton (if any);
   */
  static removeInstance(): void {
    if (automaticFileSystemManagerInstance) {
      automaticFileSystemManagerInstance.#dispose();
      automaticFileSystemManagerInstance = undefined;
    }
  }

  #dispose(): void {
    this.#projectSettingsModel.removeEventListener(
        ProjectSettings.ProjectSettingsModel.Events.PROJECT_SETTINGS_CHANGED, this.#projectSettingsChanged, this);
  }

  #projectSettingsChanged(
      event: Common.EventTarget.EventTargetEvent<ProjectSettings.ProjectSettingsModel.ProjectSettings>): void {
    const projectSettings = event.data;
    let automaticFileSystem = this.#automaticFileSystem;
    if (projectSettings.workspace) {
      const {root, uuid} = projectSettings.workspace;
      if (automaticFileSystem === null || automaticFileSystem.root !== root || automaticFileSystem.uuid !== uuid) {
        automaticFileSystem = Object.freeze({root, uuid, state: 'disconnected'});
      }
    } else if (automaticFileSystem !== null) {
      automaticFileSystem = null;
    }

    if (this.#automaticFileSystem !== automaticFileSystem) {
      this.disconnectedAutomaticFileSystem();
      this.#automaticFileSystem = automaticFileSystem;
      this.dispatchEventToListeners(Events.AUTOMATIC_FILE_SYSTEM_CHANGED, this.#automaticFileSystem);
      void this.connectAutomaticFileSystem(/* addIfMissing= */ false);
    }
  }

  /**
   * Attempt to connect the automatic workspace folder (if any).
   *
   * @param addIfMissing if `false` (the default), this will only try to connect
   *                     to a previously connected automatic workspace folder.
   *                     If the folder was never connected before and `true` is
   *                     specified, the user will be asked to grant permission
   *                     to allow Chrome DevTools to access the folder first.
   * @returns `true` if the automatic workspace folder was connected, `false`
   *          if there wasn't any, or the connection attempt failed (e.g. the
   *          user did not grant permission).
   */
  async connectAutomaticFileSystem(addIfMissing = false): Promise<boolean> {
    if (!this.#automaticFileSystem) {
      return false;
    }
    const {root, uuid, state} = this.#automaticFileSystem;
    if (state === 'disconnected') {
      const automaticFileSystem = this.#automaticFileSystem =
          Object.freeze({...this.#automaticFileSystem, state: 'connecting'});
      this.dispatchEventToListeners(Events.AUTOMATIC_FILE_SYSTEM_CHANGED, this.#automaticFileSystem);
      const {success} = await new Promise<{success: boolean}>(
          resolve => this.#inspectorFrontendHost.connectAutomaticFileSystem(root, uuid, addIfMissing, resolve));
      if (this.#automaticFileSystem === automaticFileSystem) {
        const state = success ? 'connected' : 'disconnected';
        this.#automaticFileSystem = Object.freeze({...automaticFileSystem, state});
        this.dispatchEventToListeners(Events.AUTOMATIC_FILE_SYSTEM_CHANGED, this.#automaticFileSystem);
      }
    }
    return this.#automaticFileSystem?.state === 'connected';
  }

  /**
   * Disconnects any automatic workspace folder.
   */
  disconnectedAutomaticFileSystem(): void {
    if (this.#automaticFileSystem && this.#automaticFileSystem.state !== 'disconnected') {
      this.#inspectorFrontendHost.disconnectAutomaticFileSystem(this.#automaticFileSystem.root);
      this.#automaticFileSystem = Object.freeze({...this.#automaticFileSystem, state: 'disconnected'});
      this.dispatchEventToListeners(Events.AUTOMATIC_FILE_SYSTEM_CHANGED, this.#automaticFileSystem);
    }
  }
}

/**
 * Events emitted by the `AutomaticFileSystemManager`.
 */
export const enum Events {
  /**
   * Emitted whenever the `automaticFileSystem` property of the
   * `AutomaticFileSystemManager` changes.
   */
  AUTOMATIC_FILE_SYSTEM_CHANGED = 'AutomaticFileSystemChanged',
}

/**
 * @internal
 */
export interface EventTypes {
  [Events.AUTOMATIC_FILE_SYSTEM_CHANGED]: Readonly<AutomaticFileSystem>|null;
}
