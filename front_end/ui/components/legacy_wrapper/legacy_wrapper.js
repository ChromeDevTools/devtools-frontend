var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/legacy_wrapper/LegacyWrapper.js
var LegacyWrapper_exports = {};
__export(LegacyWrapper_exports, {
  WrappableComponent: () => WrappableComponent,
  legacyWrapper: () => legacyWrapper
});
import * as VisualLogging from "./../../visual_logging/visual_logging.js";
var WrappableComponent = class extends HTMLElement {
  wrapper = null;
  async render() {
  }
  wasShown() {
  }
  willHide() {
  }
};
function legacyWrapper(base, component, jsLogContext) {
  return new class extends base {
    #component;
    constructor(..._args) {
      super(
        /* useShadowDom=*/
        true
      );
      this.#component = component;
      this.#component.wrapper = this;
      void this.#component.render();
      this.contentElement.appendChild(this.#component);
      if (jsLogContext) {
        this.element.setAttribute("jslog", `${VisualLogging.pane().context(jsLogContext)}`);
      }
    }
    wasShown() {
      super.wasShown();
      this.#component.wasShown();
      void this.#component.render();
    }
    willHide() {
      super.willHide();
      this.#component.willHide();
    }
    async performUpdate() {
      await this.#component.render();
    }
    getComponent() {
      return this.#component;
    }
  }();
}
export {
  LegacyWrapper_exports as LegacyWrapper
};
//# sourceMappingURL=legacy_wrapper.js.map
