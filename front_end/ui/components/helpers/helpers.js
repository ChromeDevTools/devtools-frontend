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

// gen/front_end/ui/components/helpers/directives.js
var directives_exports = {};
__export(directives_exports, {
  nodeRenderedCallback: () => nodeRenderedCallback
});
import * as Lit from "./../../lit/lit.js";
var NodeRenderedCallback = class extends Lit.Directive.Directive {
  constructor(partInfo) {
    super(partInfo);
    if (partInfo.type !== Lit.Directive.PartType.ATTRIBUTE) {
      throw new Error("Node rendered callback directive must be used as an attribute.");
    }
  }
  update(part, [callback]) {
    callback(part.element);
  }
  /*
   * Because this directive doesn't render anything, there's no implementation
   * here for the render method. But we need it to state that it takes in a
   * callback function at the callsite. Without this definition, the types in
   * the update() method above don't get correctly picked up.
   */
  render(_callback) {
  }
};
var nodeRenderedCallback = Lit.Directive.directive(NodeRenderedCallback);

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
      throw new TypeError(
        `Incompatible callback arguments for scheduling rendering of ${component.nodeName.toLowerCase()}`
      );
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
  directives_exports as Directives,
  get_root_node_exports as GetRootNode,
  scheduled_render_exports as ScheduledRender
};
//# sourceMappingURL=helpers.js.map
