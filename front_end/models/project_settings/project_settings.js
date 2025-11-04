var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/project_settings/ProjectSettingsModel.js
var ProjectSettingsModel_exports = {};
__export(ProjectSettingsModel_exports, {
  ProjectSettingsModel: () => ProjectSettingsModel
});
import * as Common from "./../../core/common/common.js";
import * as Platform from "./../../core/platform/platform.js";
import * as SDK from "./../../core/sdk/sdk.js";
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
var projectSettingsModelInstance;
var ProjectSettingsModel = class _ProjectSettingsModel extends Common.ObjectWrapper.ObjectWrapper {
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
  constructor(hostConfig, pageResourceLoader, targetManager) {
    super();
    this.#pageResourceLoader = pageResourceLoader;
    this.#targetManager = targetManager;
    if (hostConfig.devToolsWellKnown?.enabled) {
      this.#targetManager.addEventListener("InspectedURLChanged", this.#inspectedURLChanged, this);
      const target = this.#targetManager.primaryPageTarget();
      if (target !== null) {
        this.#inspectedURLChanged({ data: target });
      }
    }
  }
  /**
   * Yields the `ProjectSettingsModel` singleton.
   *
   * @returns the singleton.
   */
  static instance({ forceNew, hostConfig, pageResourceLoader, targetManager }) {
    if (!projectSettingsModelInstance || forceNew) {
      if (!hostConfig || !pageResourceLoader || !targetManager) {
        throw new Error("Unable to create ProjectSettingsModel: hostConfig, pageResourceLoader, and targetManager must be provided");
      }
      projectSettingsModelInstance = new _ProjectSettingsModel(hostConfig, pageResourceLoader, targetManager);
    }
    return projectSettingsModelInstance;
  }
  /**
   * Clears the `ProjectSettingsModel` singleton (if any).
   */
  static removeInstance() {
    if (projectSettingsModelInstance) {
      projectSettingsModelInstance.#dispose();
      projectSettingsModelInstance = void 0;
    }
  }
  #dispose() {
    this.#targetManager.removeEventListener("InspectedURLChanged", this.#inspectedURLChanged, this);
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
          this.dispatchEventToListeners("ProjectSettingsChanged", projectSettings);
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
        this.dispatchEventToListeners("AvailabilityChanged", this.#availability);
      }
      return EMPTY_PROJECT_SETTINGS;
    }
    if (this.#availability !== "available") {
      this.#availability = "available";
      this.dispatchEventToListeners("AvailabilityChanged", this.#availability);
    }
    const initiatorUrl = frame.url;
    const frameId = frame.id;
    let url = WELL_KNOWN_DEVTOOLS_JSON_PATH;
    if (isDevToolsBundledURL(initiatorUrl)) {
      url = "/bundled" + url;
    }
    url = new URL(url, initiatorUrl).toString();
    const { content } = await this.#pageResourceLoader.loadResource(Platform.DevToolsPath.urlString`${url}`, { target, frameId, initiatorUrl });
    const devtoolsJSON = JSON.parse(content);
    if (typeof devtoolsJSON.workspace !== "undefined") {
      const { workspace } = devtoolsJSON;
      if (typeof workspace !== "object" || workspace === null) {
        throw new Error('Invalid "workspace" field');
      }
      if (typeof workspace.root !== "string") {
        throw new Error('Invalid or missing "workspace.root" field');
      }
      if (typeof workspace.uuid !== "string") {
        throw new Error('Invalid or missing "workspace.uuid" field');
      }
    }
    return Object.freeze(devtoolsJSON);
  }
};
export {
  ProjectSettingsModel_exports as ProjectSettingsModel
};
//# sourceMappingURL=project_settings.js.map
