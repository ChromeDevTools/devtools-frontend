// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';

/** The security origin for all DevTools (front-end) resources. */
const DEVTOOLS_SECURITY_ORIGIN = 'devtools://devtools';

/** The (absolute) path to the project settings file. */
const WELL_KNOWN_DEVTOOLS_JSON_PATH = '/.well-known/appspecific/com.chrome.devtools.json';

/**
 * Checks if the origin of the `url` is `devtools://devtools` (meaning that it's
 * served by the `DevToolsDataSource` in Chromium) and it's path starts with
 * `/bundled/`.
 *
 * @param url the URL string to check.
 * @returns `true` if `url` refers to a resource in the Chromium DevTools bundle.
 */
function isDevToolsBundledURL(url: string): boolean {
  return url.startsWith(`${DEVTOOLS_SECURITY_ORIGIN}/bundled/`);
}

/**
 * Checks if the `frame` should be considered local and safe for loading the
 * project settings from.
 *
 * This checks the security origin of `frame` for whether Chromium considers it
 * to be localhost. It also supports special logic for when the origin of the
 * `frame` is `'devtools://devtools'`, in which case we check whether the path
 * starts with `'/bundled/'` and `debugFrontend=true` is passed as a query
 * parameter (indicating that `--custom-devtools-frontend=` command line option
 * was used).
 *
 * @param frame the `ResourceTreeFrame` to check.
 * @returns `true` if `frame` is considered safe for loading the project settings.
 * @see https://goo.gle/devtools-json-design
 */
function isLocalFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame|null|undefined):
    frame is SDK.ResourceTreeModel.ResourceTreeFrame {
  if (!frame) {
    return false;
  }
  if (isDevToolsBundledURL(frame.url)) {
    return new URL(frame.url).searchParams.get('debugFrontend') === 'true';
  }
  return frame.securityOriginDetails?.isLocalhost ?? false;
}

/**
 * The structure of the project settings.
 *
 * @see https://goo.gle/devtools-json-design
 */
export interface ProjectSettings {
  readonly workspace?: {readonly root: Platform.DevToolsPath.RawPathString, readonly uuid: string};
}

/**
 * Indicates the availability of the project settings feature.
 *
 * `'available'` means that the feature is enabled, the origin of the inspected
 * page is `localhost`. It doesn't however indicate whether or not the page is
 * actually providing a `com.chrome.devtools.json` or not.
 */
export type ProjectSettingsAvailability = 'available'|'unavailable';

const EMPTY_PROJECT_SETTINGS: ProjectSettings = Object.freeze({});
const IDLE_PROMISE: Promise<void> = Promise.resolve();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DISALLOWED_PATH_CHARS_REGEX = /[\p{Cc}\p{Cs}\p{Bidi_Control}]/u;
const WINDOWS_DRIVE_ABSOLUTE_PREFIX_REGEX = /^[A-Za-z]:[\\/]/;

/**
 * Checks whether `uuid` is a valid canonical UUID string (`8-4-4-4-12` hex
 * format).
 *
 * @param uuid the candidate workspace UUID string.
 * @returns `true` if `uuid` matches the canonical UUID format.
 */
function isValidWorkspaceUuid(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

/**
 * Validates that `root` is a syntactically valid local absolute non-root
 * directory path for `workspace.root`.
 *
 * Validation is intentionally platform-agnostic: it accepts both POSIX and
 * Windows drive-letter local directory syntax regardless of the host OS so
 * behavior and unit tests stay consistent across platforms.
 *
 * Requirements enforced:
 * - Non-empty string with no leading or trailing whitespace (`root.trim() === root`).
 * - No Unicode control characters (`\p{Cc}`: NUL, C0, DEL, C1), lone UTF-16
 *   surrogates (`\p{Cs}`), or bidirectional control characters
 *   (`\p{Bidi_Control}`, including LRM, RLM, ALM, embeddings, overrides, and
 *   isolates).
 * - Either a local POSIX absolute path starting with `/` (rejecting `//` and
 *   mixed `/\` prefixes used by UNC/network paths and `///`) or a Windows
 *   drive-letter absolute path starting with `[A-Za-z]:\` or `[A-Za-z]:/`
 *   (rejecting relative paths, drive-relative paths like `C:foo` or `\foo`,
 *   and UNC/network paths like `\\server\share`, `\\wsl.localhost`, or
 *   `\\wsl$`, which are also rejected by
 *   `DevToolsFileHelper::ConnectAutomaticFileSystem` via `!path.IsNetwork()`).
 * - At least one non-empty path segment after the root or drive prefix
 *   (rejecting filesystem and drive roots such as `/`, `C:\`, `D:/`), while
 *   permitting trailing separators on non-root directories (e.g.,
 *   `/home/user/project/`).
 * - No `.` or `..` traversal segments. Windows-specific segment checks
 *   (rejecting trailing `.` or `' '`, which Win32 normalization collapses, e.g.,
 *   `D:\. \`, and `:` alternate data streams) apply only to `[A-Za-z]:[\\/]`
 *   paths because POSIX legitimately permits `:` and trailing `.` in folder
 *   names, whereas on Windows any path starting with a single `/` is
 *   drive-relative (`!path.IsAbsolute()`) and is synchronously rejected by
 *   `DevToolsFileHelper` on the browser side.
 *
 * Browser-side sensitive directory checks (OS/system directories such as
 * `/etc`, user home/profile directories and sensitive dotfiles such as
 * `~/.ssh`, Chrome user data directories, `.git`/`.mvn` write-blocked paths,
 * and symlinks resolving to blocked paths) are enforced separately in the
 * browser host (`DevToolsFileHelper`).
 *
 * @param root the candidate workspace root string.
 * @returns `true` if `root` satisfies all syntactic workspace root checks.
 */
function isValidWorkspaceRoot(root: string): root is Platform.DevToolsPath.RawPathString {
  if (root.length === 0 || root.trim() !== root || DISALLOWED_PATH_CHARS_REGEX.test(root)) {
    return false;
  }
  if (root.startsWith('/')) {
    if (root.startsWith('//') || root.startsWith('/\\')) {
      return false;
    }
    const segments = root.slice(1).split('/').filter(segment => segment.length > 0);
    return segments.length > 0 && segments.every(segment => segment !== '.' && segment !== '..');
  }
  if (WINDOWS_DRIVE_ABSOLUTE_PREFIX_REGEX.test(root)) {
    const segments = root.slice(2).split(/[\\/]/).filter(segment => segment.length > 0);
    return segments.length > 0 &&
        segments.every(segment => segment !== '.' && segment !== '..' && !segment.endsWith('.') &&
                           !segment.endsWith(' ') && !segment.includes(':'));
  }
  return false;
}

export class ProjectSettingsModel extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #pageResourceLoader: SDK.PageResourceLoader.PageResourceLoader;
  readonly #targetManager: SDK.TargetManager.TargetManager;
  #availability: ProjectSettingsAvailability = 'unavailable';
  #projectSettings: ProjectSettings = EMPTY_PROJECT_SETTINGS;
  #promise: Promise<void> = IDLE_PROMISE;

  /**
   * Yields the availability of the project settings feature.
   *
   * `'available'` means that the feature is enabled, the origin of the inspected
   * page is `localhost`. It doesn't however indicate whether or not the page is
   * actually providing a `com.chrome.devtools.json` or not.
   *
   * @returns `'available'` if the feature is enabled and the inspected page is
   *         `localhost`, otherwise `'unavailable'`.
   */
  get availability(): ProjectSettingsAvailability {
    return this.#availability;
  }

  /**
   * Yields the current project settings.
   *
   * @returns the current project settings.
   */
  get projectSettings(): ProjectSettings {
    return this.#projectSettings;
  }

  get projectSettingsPromise(): Promise<ProjectSettings> {
    return this.#promise.then(() => this.#projectSettings);
  }

  constructor(
      pageResourceLoader: SDK.PageResourceLoader.PageResourceLoader,
      targetManager: SDK.TargetManager.TargetManager,
  ) {
    super();
    this.#pageResourceLoader = pageResourceLoader;
    this.#targetManager = targetManager;
    this.#targetManager.addEventListener(
        SDK.TargetManager.Events.INSPECTED_URL_CHANGED,
        this.#inspectedURLChanged,
        this,
    );
    const target = this.#targetManager.primaryPageTarget();
    if (target) {
      this.#inspectedURLChanged({data: target});
    }
  }

  disposeForTest(): void {
    this.#targetManager.removeEventListener(
        SDK.TargetManager.Events.INSPECTED_URL_CHANGED,
        this.#inspectedURLChanged,
        this,
    );
  }

  #inspectedURLChanged(event: Common.EventTarget.EventTargetEvent<SDK.Target.Target>): void {
    const target = event.data;

    const promise = this.#promise = this.#promise.then(async(): Promise<void> => {
      let projectSettings: ProjectSettings = EMPTY_PROJECT_SETTINGS;
      try {
        projectSettings = await this.#loadAndValidateProjectSettings(target);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.debug(`Could not load project settings for ${target.inspectedURL()}: ${error.message}`);
      }
      if (this.#promise === promise) {
        if (this.#projectSettings !== projectSettings) {
          this.#projectSettings = projectSettings;
          this.dispatchEventToListeners(Events.PROJECT_SETTINGS_CHANGED, projectSettings);
        }
        this.#promise = IDLE_PROMISE;
      }
    });
  }

  async #loadAndValidateProjectSettings(target: SDK.Target.Target): Promise<ProjectSettings> {
    const frame = target.model(SDK.ResourceTreeModel.ResourceTreeModel)?.mainFrame;
    if (!isLocalFrame(frame)) {
      if (this.#availability !== 'unavailable') {
        this.#availability = 'unavailable';
        this.dispatchEventToListeners(Events.AVAILABILITY_CHANGED, this.#availability);
      }
      return EMPTY_PROJECT_SETTINGS;
    }
    if (this.#availability !== 'available') {
      this.#availability = 'available';
      this.dispatchEventToListeners(Events.AVAILABILITY_CHANGED, this.#availability);
    }
    const initiatorUrl = frame.url;
    const frameId = frame.id;
    let url = WELL_KNOWN_DEVTOOLS_JSON_PATH;
    if (isDevToolsBundledURL(initiatorUrl)) {
      url = '/bundled' + url;
    }
    url = new URL(url, initiatorUrl).toString();
    const {content} = await this.#pageResourceLoader.loadResource(
        Platform.DevToolsPath.urlString`${url}`,
        {target, frameId, initiatorUrl},
    );
    const devtoolsJSON = JSON.parse(content);
    if (typeof devtoolsJSON !== 'object' || devtoolsJSON === null || Array.isArray(devtoolsJSON)) {
      throw new Error('Invalid project settings payload');
    }
    // Guard with Object.hasOwn as defense-in-depth against Object.prototype pollution.
    if (Object.hasOwn(devtoolsJSON, 'workspace') && typeof devtoolsJSON.workspace !== 'undefined') {
      const {workspace} = devtoolsJSON;
      if (typeof workspace !== 'object' || workspace === null || Array.isArray(workspace)) {
        throw new Error('Invalid "workspace" field');
      }
      if (!Object.hasOwn(workspace, 'root') || typeof workspace.root !== 'string' ||
          !isValidWorkspaceRoot(workspace.root)) {
        throw new Error('Invalid or missing "workspace.root" field');
      }
      if (!Object.hasOwn(workspace, 'uuid') || typeof workspace.uuid !== 'string' ||
          !isValidWorkspaceUuid(workspace.uuid)) {
        throw new Error('Invalid or missing "workspace.uuid" field');
      }
      Object.freeze(workspace);
    }
    return Object.freeze(devtoolsJSON);
  }
}

/**
 * Events emitted by the `ProjectSettingsModel`.
 */
export const enum Events {
  /**
   * Emitted whenever the `availability` property of the
   * `ProjectSettingsModel` changes.
   */
  AVAILABILITY_CHANGED = 'AvailabilityChanged',

  /**
   * Emitted whenever the `projectSettings` property of the
   * `ProjectSettingsModel` changes.
   */
  PROJECT_SETTINGS_CHANGED = 'ProjectSettingsChanged',
}

/**
 * @internal
 */
export interface EventTypes {
  [Events.AVAILABILITY_CHANGED]: ProjectSettingsAvailability;
  [Events.PROJECT_SETTINGS_CHANGED]: ProjectSettings;
}
