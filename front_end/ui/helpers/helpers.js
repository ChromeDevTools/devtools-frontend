// gen/front_end/ui/helpers/OpenInNewTab.js
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as Platform from "./../../core/platform/platform.js";
import * as Root from "./../../core/root/root.js";
import * as SDK from "./../../core/sdk/sdk.js";
function openInNewTab(url) {
  url = new URL(`${url}`);
  if (Common.ParsedURL.schemeIs(url, "chrome:")) {
    const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
    if (rootTarget === null) {
      return;
    }
    void rootTarget.targetAgent().invoke_createTarget({ url: url.toString() }).then((result) => {
      if (result.getError()) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(Platform.DevToolsPath.urlString`${url}`);
      }
    });
  } else {
    if (["developer.chrome.com", "developers.google.com", "web.dev"].includes(url.hostname)) {
      if (!url.searchParams.has("utm_source")) {
        url.searchParams.append("utm_source", "devtools");
      }
      const { channel } = Root.Runtime.hostConfig;
      if (!url.searchParams.has("utm_campaign") && typeof channel === "string") {
        url.searchParams.append("utm_campaign", channel);
      }
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(Platform.DevToolsPath.urlString`${url}`);
  }
}
export {
  openInNewTab
};
//# sourceMappingURL=helpers.js.map
