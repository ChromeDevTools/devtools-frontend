// gen/front_end/entrypoints/formatter_worker/formatter_worker-entrypoint.prebundle.js
import * as Platform from "./../../core/platform/platform.js";
import * as FormatterWorker from "./formatter_worker.js";
Platform.HostRuntime.HOST_RUNTIME.workerScope.onmessage = function(event) {
  const method = event.data.method;
  const params = event.data.params;
  if (!method) {
    return;
  }
  switch (method) {
    case "format":
      Platform.HostRuntime.HOST_RUNTIME.workerScope.postMessage(FormatterWorker.FormatterWorker.format(params.mimeType, params.content, params.indentString));
      break;
    case "parseCSS":
      FormatterWorker.CSSRuleParser.parseCSS(params.content, self.postMessage);
      break;
    case "javaScriptSubstitute": {
      Platform.HostRuntime.HOST_RUNTIME.workerScope.postMessage(FormatterWorker.Substitute.substituteExpression(params.content, params.mapping));
      break;
    }
    case "javaScriptScopeTree": {
      Platform.HostRuntime.HOST_RUNTIME.workerScope.postMessage(FormatterWorker.ScopeParser.parseScopes(params.content, params.sourceType)?.export());
      break;
    }
    default:
      Platform.assertNever(method, `Unsupport method name: ${method}`);
  }
};
Platform.HostRuntime.HOST_RUNTIME.workerScope.postMessage("workerReady");
//# sourceMappingURL=formatter_worker-entrypoint.js.map
