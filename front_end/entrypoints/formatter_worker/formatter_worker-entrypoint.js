// ../../front_end/entrypoints/formatter_worker/formatter_worker-entrypoint.ts
import * as Platform from "../../core/platform/platform.js";
import { FormatterActions } from "../formatter_actions/formatter_actions.js";
import * as FormatterWorker from "./formatter_worker.js";
Platform.HostRuntime.HOST_RUNTIME.workerScope.onmessage = function(event) {
  const method = event.data.method;
  const params = event.data.params;
  if (!method) {
    return;
  }
  switch (method) {
    case FormatterActions.FORMAT:
      Platform.HostRuntime.HOST_RUNTIME.workerScope.postMessage(
        FormatterWorker.FormatterWorker.format(params.mimeType, params.content, params.indentString)
      );
      break;
    case FormatterActions.PARSE_CSS:
      FormatterWorker.CSSRuleParser.parseCSS(params.content, self.postMessage);
      break;
    case FormatterActions.JAVASCRIPT_SUBSTITUTE: {
      let result;
      try {
        result = FormatterWorker.Substitute.substituteExpression(params.content, params.mapping);
      } catch (error) {
        result = { error: error instanceof Error ? error.message : String(error) };
      }
      Platform.HostRuntime.HOST_RUNTIME.workerScope.postMessage(result);
      break;
    }
    case FormatterActions.JAVASCRIPT_SCOPE_TREE: {
      Platform.HostRuntime.HOST_RUNTIME.workerScope.postMessage(
        FormatterWorker.ScopeParser.parseScopes(params.content, params.sourceType)?.export()
      );
      break;
    }
    default:
      Platform.assertNever(method, `Unsupport method name: ${method}`);
  }
};
Platform.HostRuntime.HOST_RUNTIME.workerScope.postMessage("workerReady");
//# sourceMappingURL=formatter_worker-entrypoint.js.map
