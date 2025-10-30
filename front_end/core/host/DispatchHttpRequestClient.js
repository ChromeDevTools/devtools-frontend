"use strict";
import { InspectorFrontendHostInstance } from "./InspectorFrontendHost.js";
export var ErrorType = /* @__PURE__ */ ((ErrorType2) => {
  ErrorType2["HTTP_RESPONSE_UNAVAILABLE"] = "HTTP_RESPONSE_UNAVAILABLE";
  ErrorType2["NOT_FOUND"] = "NOT_FOUND";
  return ErrorType2;
})(ErrorType || {});
export class DispatchHttpRequestError extends Error {
  constructor(type, options) {
    super(void 0, options);
    this.type = type;
  }
}
export async function makeHttpRequest(request) {
  const response = await new Promise((resolve) => {
    InspectorFrontendHostInstance.dispatchHttpRequest(request, resolve);
  });
  debugLog({ request, response });
  if (response.statusCode === 404) {
    throw new DispatchHttpRequestError("NOT_FOUND" /* NOT_FOUND */);
  }
  if ("response" in response && response.statusCode === 200) {
    try {
      return JSON.parse(response.response);
    } catch (err) {
      throw new DispatchHttpRequestError("HTTP_RESPONSE_UNAVAILABLE" /* HTTP_RESPONSE_UNAVAILABLE */, { cause: err });
    }
  }
  throw new DispatchHttpRequestError("HTTP_RESPONSE_UNAVAILABLE" /* HTTP_RESPONSE_UNAVAILABLE */);
}
function isDebugMode() {
  return Boolean(localStorage.getItem("debugDispatchHttpRequestEnabled"));
}
function debugLog(...log) {
  if (!isDebugMode()) {
    return;
  }
  console.log("debugLog", ...log);
}
function setDebugDispatchHttpRequestEnabled(enabled) {
  if (enabled) {
    localStorage.setItem("debugDispatchHttpRequestEnabled", "true");
  } else {
    localStorage.removeItem("debugDispatchHttpRequestEnabled");
  }
}
globalThis.setDebugDispatchHttpRequestEnabled = setDebugDispatchHttpRequestEnabled;
//# sourceMappingURL=DispatchHttpRequestClient.js.map
