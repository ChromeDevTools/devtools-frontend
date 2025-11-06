var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/helpers/component-server-setup.js
var component_server_setup_exports = {};
__export(component_server_setup_exports, {
  setup: () => setup
});
import * as ThemeSupport from "./../../legacy/theme_support/theme_support.js";
async function setup() {
  const setting = {
    get() {
      return "default";
    },
    addChangeListener: () => {
    }
  };
  ThemeSupport.ThemeSupport.instance({ forceNew: true, setting });
}

// gen/front_end/ui/components/helpers/get-root-node.js
var get_root_node_exports = {};
__export(get_root_node_exports, {
  getRootNode: () => getRootNode
});
function getRootNode(node) {
  const potentialRoot = node.getRootNode();
  if (!(potentialRoot instanceof Document || potentialRoot instanceof ShadowRoot)) {
    throw new Error(`Expected root of widget to be a document or shadowRoot, but was "${potentialRoot.nodeName}"`);
  }
  return potentialRoot;
}

// gen/front_end/ui/components/helpers/scheduled-render.js
var scheduled_render_exports = {};
__export(scheduled_render_exports, {
  isScheduledRender: () => isScheduledRender,
  scheduleRender: () => scheduleRender
});
import * as RenderCoordinator from "./../render_coordinator/render_coordinator.js";
var requests = /* @__PURE__ */ new Map();
var active = /* @__PURE__ */ new Set();
function scheduleRender(component, callback) {
  const request = requests.get(component);
  if (request !== void 0) {
    if (request.callback !== callback) {
      throw new TypeError(`Incompatible callback arguments for scheduling rendering of ${component.nodeName.toLowerCase()}`);
    }
    return request.promise;
  }
  const promise = RenderCoordinator.write(async () => {
    try {
      active.add(component);
      requests.delete(component);
      await callback.call(component);
    } catch (error) {
      console.error(`ScheduledRender: rendering ${component.nodeName.toLowerCase()}:`);
      console.error(error);
      throw error;
    } finally {
      active.delete(component);
    }
  });
  requests.set(component, { callback, promise });
  return promise;
}
function isScheduledRender(component) {
  return active.has(component);
}
export {
  component_server_setup_exports as ComponentServerSetup,
  get_root_node_exports as GetRootNode,
  scheduled_render_exports as ScheduledRender
};
//# sourceMappingURL=helpers.js.map
