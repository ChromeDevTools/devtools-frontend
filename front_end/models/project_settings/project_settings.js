var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/project_settings/ProjectSettingsModel.ts
var ProjectSettingsModel_exports = {};
__export(ProjectSettingsModel_exports, {
  Events: () => Events,
  ProjectSettingsModel: () => ProjectSettingsModel
});
import * as Common from "../../core/common/common.js";
import * as Platform from "../../core/platform/platform.js";
import * as SDK from "../../core/sdk/sdk.js";
var DEVTOOLS_SECURITY_ORIGIN = "devtools://devtools";
var WELL_KNOWN_DEVTOOLS_JSON_PATH = "/.well-known/appspecific/com.chrome.devtools.json";
function isDevToolsBundledURL(url) {
  return url.startsWith(`${DEVTOOLS_SECURITY_ORIGIN}/bundled/`);
}
function isLocalFrame(frame) {
  if (!frame) {
    return false;
  }
  if (isDevToolsBundledURL(frame.url)) {
    return new URL(frame.url).searchParams.get("debugFrontend") === "true";
  }
  return frame.securityOriginDetails?.isLocalhost ?? false;
}
var EMPTY_PROJECT_SETTINGS = Object.freeze({});
var IDLE_PROMISE = Promise.resolve();
var UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var DISALLOWED_PATH_CHARS_REGEX = /[\p{Cc}\p{Cs}\p{Bidi_Control}]/u;
var WINDOWS_DRIVE_ABSOLUTE_PREFIX_REGEX = /^[A-Za-z]:[\\/]/;
function isValidWorkspaceUuid(uuid) {
  return UUID_REGEX.test(uuid);
}
function isValidWorkspaceRoot(root) {
  if (root.length === 0 || root.trim() !== root || DISALLOWED_PATH_CHARS_REGEX.test(root)) {
    return false;
  }
  if (root.startsWith("/")) {
    if (root.startsWith("//") || root.startsWith("/\\")) {
      return false;
    }
    const segments = root.slice(1).split("/").filter((segment) => segment.length > 0);
    return segments.length > 0 && segments.every((segment) => segment !== "." && segment !== "..");
  }
  if (WINDOWS_DRIVE_ABSOLUTE_PREFIX_REGEX.test(root)) {
    const segments = root.slice(2).split(/[\\/]/).filter((segment) => segment.length > 0);
    return segments.length > 0 && segments.every((segment) => segment !== "." && segment !== ".." && !segment.endsWith(".") && !segment.endsWith(" ") && !segment.includes(":"));
  }
  return false;
}
var ProjectSettingsModel = class extends Common.ObjectWrapper.ObjectWrapper {
  #pageResourceLoader;
  #targetManager;
  #availability = "unavailable";
  #projectSettings = EMPTY_PROJECT_SETTINGS;
  #promise = IDLE_PROMISE;
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
  get availability() {
    return this.#availability;
  }
  /**
   * Yields the current project settings.
   *
   * @returns the current project settings.
   */
  get projectSettings() {
    return this.#projectSettings;
  }
  get projectSettingsPromise() {
    return this.#promise.then(() => this.#projectSettings);
  }
  constructor(pageResourceLoader, targetManager) {
    super();
    this.#pageResourceLoader = pageResourceLoader;
    this.#targetManager = targetManager;
    this.#targetManager.addEventListener(
      SDK.TargetManager.Events.INSPECTED_URL_CHANGED,
      this.#inspectedURLChanged,
      this
    );
    const target = this.#targetManager.primaryPageTarget();
    if (target) {
      this.#inspectedURLChanged({ data: target });
    }
  }
  disposeForTest() {
    this.#targetManager.removeEventListener(
      SDK.TargetManager.Events.INSPECTED_URL_CHANGED,
      this.#inspectedURLChanged,
      this
    );
  }
  #inspectedURLChanged(event) {
    const target = event.data;
    const promise = this.#promise = this.#promise.then(async () => {
      let projectSettings = EMPTY_PROJECT_SETTINGS;
      try {
        projectSettings = await this.#loadAndValidateProjectSettings(target);
      } catch (error) {
        console.debug(`Could not load project settings for ${target.inspectedURL()}: ${error.message}`);
      }
      if (this.#promise === promise) {
        if (this.#projectSettings !== projectSettings) {
          this.#projectSettings = projectSettings;
          this.dispatchEventToListeners("ProjectSettingsChanged" /* PROJECT_SETTINGS_CHANGED */, projectSettings);
        }
        this.#promise = IDLE_PROMISE;
      }
    });
  }
  async #loadAndValidateProjectSettings(target) {
    const frame = target.model(SDK.ResourceTreeModel.ResourceTreeModel)?.mainFrame;
    if (!isLocalFrame(frame)) {
      if (this.#availability !== "unavailable") {
        this.#availability = "unavailable";
        this.dispatchEventToListeners("AvailabilityChanged" /* AVAILABILITY_CHANGED */, this.#availability);
      }
      return EMPTY_PROJECT_SETTINGS;
    }
    if (this.#availability !== "available") {
      this.#availability = "available";
      this.dispatchEventToListeners("AvailabilityChanged" /* AVAILABILITY_CHANGED */, this.#availability);
    }
    const initiatorUrl = frame.url;
    const frameId = frame.id;
    let url = WELL_KNOWN_DEVTOOLS_JSON_PATH;
    if (isDevToolsBundledURL(initiatorUrl)) {
      url = "/bundled" + url;
    }
    url = new URL(url, initiatorUrl).toString();
    const { content } = await this.#pageResourceLoader.loadResource(
      Platform.DevToolsPath.urlString`${url}`,
      { target, frameId, initiatorUrl }
    );
    const devtoolsJSON = JSON.parse(content);
    if (typeof devtoolsJSON !== "object" || devtoolsJSON === null || Array.isArray(devtoolsJSON)) {
      throw new Error("Invalid project settings payload");
    }
    if (Object.hasOwn(devtoolsJSON, "workspace") && typeof devtoolsJSON.workspace !== "undefined") {
      const { workspace } = devtoolsJSON;
      if (typeof workspace !== "object" || workspace === null || Array.isArray(workspace)) {
        throw new Error('Invalid "workspace" field');
      }
      if (!Object.hasOwn(workspace, "root") || typeof workspace.root !== "string" || !isValidWorkspaceRoot(workspace.root)) {
        throw new Error('Invalid or missing "workspace.root" field');
      }
      if (!Object.hasOwn(workspace, "uuid") || typeof workspace.uuid !== "string" || !isValidWorkspaceUuid(workspace.uuid)) {
        throw new Error('Invalid or missing "workspace.uuid" field');
      }
      Object.freeze(workspace);
    }
    return Object.freeze(devtoolsJSON);
  }
};
var Events = /* @__PURE__ */ ((Events2) => {
  Events2["AVAILABILITY_CHANGED"] = "AvailabilityChanged";
  Events2["PROJECT_SETTINGS_CHANGED"] = "ProjectSettingsChanged";
  return Events2;
})(Events || {});
export {
  ProjectSettingsModel_exports as ProjectSettingsModel
};
//# sourceMappingURL=project_settings.js.map
