// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "RPC.h"
#include "Logger.h"
#include "Modules.h"
#include "Transport.h"
#include "Util.h"
#include "symbol-server-config.h"
#include "symbol_server.pb.h"

#include <google/protobuf/message.h>
#include <google/protobuf/util/json_util.h>
#include <memory>
#include <type_traits>
#include "llvm/ADT/SmallSet.h"
#include "llvm/ADT/SmallVector.h"
#include "llvm/ADT/StringRef.h"
#include "llvm/ADT/iterator_range.h"
#include "llvm/Support/Error.h"
#include "llvm/Support/raw_ostream.h"

namespace symbol_server {
bool operator<(const protocol::Variable& a, const protocol::Variable& b) {
  return (a.name() < b.name() || a.scope() < b.scope() || a.type() < b.type());
}
bool operator==(const protocol::Variable& a, const protocol::Variable& b) {
  return (a.name() == b.name() || a.scope() == b.scope() ||
          a.type() == b.type());
}

namespace {
llvm::raw_ostream& operator<<(llvm::raw_ostream& o,
                              const google::protobuf::Message& m) {
  google::protobuf::util::JsonPrintOptions options;
  options.add_whitespace = true;
  std::string s;
  google::protobuf::util::MessageToJsonString(m, &s);
  return o << s;
}

std::unique_ptr<protocol::Error> MakeError(protocol::Error_Code ec,
                                           llvm::Twine message) {
  auto e = std::make_unique<protocol::Error>();
  e->set_code(ec);
  e->set_message(message.str());
  return e;
}

std::unique_ptr<protocol::Error> MakeNotFoundError(llvm::StringRef module_id) {
  return MakeError(protocol::Error_Code::Error_Code_NOT_FOUND,
                   "Module with id '" + module_id + "' not found");
}

template <typename ResponseT>
ResponseT* SetError(ResponseT* response,
                    std::unique_ptr<protocol::Error> error) {
  response->set_allocated_error(error.release());
  return response;
}

template <typename ResponseT>
ResponseT* SetError(ResponseT* response, llvm::Error error) {
  llvm::handleAllErrors(
      std::move(error), [response](const llvm::StringError& e) {
        SetError(response,
                 MakeError(protocol::Error_Code::Error_Code_INTERNAL_ERROR,
                           e.getMessage()));
      });
  return response;
}

protocol::AddRawModuleResponse DoAddRawModule(
    ModuleCache* modules,
    const protocol::AddRawModuleRequest& request) {
  protocol::AddRawModuleResponse response;
  if (modules->DeleteModule(request.rawmoduleid())) {
    llvm::errs() << "Deleted duplicate module " << request.rawmoduleid()
                 << "\n";
  }
  auto* m = [&request, modules]() -> const WasmModule* {
    if (!request.rawmodule().code().empty()) {
      return modules->GetModuleFromCode(request.rawmoduleid(),
                                        request.rawmodule().code());
    }

    if (!request.rawmodule().url().empty()) {
      return modules->GetModuleFromUrl(request.rawmoduleid(),
                                       request.rawmodule().url());
    }
    return nullptr;
  }();

  if (!m) {
    return *SetError(&response, MakeNotFoundError(request.rawmoduleid()));
  }

  for (auto& source_file : m->GetSourceScripts()) {
    response.add_sources(source_file);
  }

  return response;
}

protocol::SourceLocationToRawLocationResponse DoSourceLocationToRawLocation(
    ModuleCache* mc,
    const protocol::SourceLocation& loc) {
  protocol::SourceLocationToRawLocationResponse response;
  auto module = mc->FindModule(loc.rawmoduleid());
  if (!module) {
    return *SetError(&response, MakeNotFoundError(loc.sourcefile()));
  }

  for (auto offset : module->GetOffsetFromSourceLocation(
           {loc.sourcefile(), static_cast<uint32_t>(loc.linenumber() + 1),
            static_cast<uint16_t>(loc.columnnumber() + 1)})) {
    auto* raw_loc = response.add_rawlocation();
    raw_loc->set_rawmoduleid(loc.rawmoduleid());
    raw_loc->set_codeoffset(offset);
  }
  return response;
}

protocol::RawLocationToSourceLocationResponse DoRawLocationToSourceLocation(
    ModuleCache* mc,
    const protocol::RawLocation& loc) {
  protocol::RawLocationToSourceLocationResponse response;
  auto* mod = mc->FindModule(loc.rawmoduleid());
  if (!mod) {
    return *SetError(&response, MakeNotFoundError(loc.rawmoduleid()));
  }
  for (auto& source_loc : mod->GetSourceLocationFromOffset(loc.codeoffset())) {
    auto* proto_loc = response.add_sourcelocation();
    proto_loc->set_sourcefile(source_loc.file);
    proto_loc->set_rawmoduleid(loc.rawmoduleid());
    proto_loc->set_linenumber(source_loc.line - 1);
    proto_loc->set_columnnumber(source_loc.column - 1);
  }
  return response;
}

protocol::Variable_Scope ToProtocolScope(lldb::ValueType scope) {
  switch (scope) {
    case lldb::eValueTypeVariableGlobal:
      return protocol::Variable_Scope_GLOBAL;
    case lldb::eValueTypeVariableArgument:
      return protocol::Variable_Scope_PARAMETER;
    case lldb::eValueTypeVariableLocal:
    case lldb::eValueTypeVariableStatic:
      return protocol::Variable_Scope_LOCAL;
    default:
      llvm::errs() << "Got variable scope " << scope << "\n";
      llvm_unreachable("Unhandled variable scope");
  }
}

protocol::ListVariablesInScopeResponse DoListVariables(
    ModuleCache* mc,
    const protocol::RawLocation& loc) {
  protocol::ListVariablesInScopeResponse response;

  auto* mod = mc->FindModule(loc.rawmoduleid());
  if (!mod) {
    return *SetError(&response, MakeNotFoundError(loc.rawmoduleid()));
  }

  for (auto& variable : mod->GetVariablesInScope(loc.codeoffset())) {
    auto* proto_var = response.add_variable();
    proto_var->set_scope(ToProtocolScope(variable.scope));
    proto_var->set_name(variable.name);
    proto_var->set_type(variable.type);
  }
  return response;
}

protocol::EvaluateVariableResponse DoEvaluateVariables(
    ModuleCache* mc,
    const protocol::EvaluateVariableRequest& request) {
  protocol::EvaluateVariableResponse response;
#ifndef SYMBOL_SERVER_BUILD_FORMATTERS
  return *SetError(&response,
                   MakeError(protocol::Error_Code::Error_Code_INTERNAL_ERROR,
                             "Formatter library not available"));
#else
  auto* mod = mc->FindModule(request.location().rawmoduleid());
  if (!mod) {
    return *SetError(&response,
                     MakeNotFoundError(request.location().rawmoduleid()));
  }

  auto format_script = mod->GetVariableFormatScript(
      request.name(), request.location().codeoffset(), mc->Printer());
  if (!format_script) {
    return *SetError(&response, format_script.takeError());
  }

  response.set_allocated_value(new protocol::RawModule());
  *response.mutable_value()->mutable_code() = *format_script;
  return response;
#endif
}

template <typename T>
llvm::Expected<T> Parse(llvm::json::Value message) {
  T result;
  std::string json_string;
  {
    llvm::raw_string_ostream os(json_string);
    os << message;
  }

  auto stat = google::protobuf::util::JsonStringToMessage(json_string, &result);
  if (!stat.ok()) {
    LLVM_DEBUG(llvm::dbgs()
               << __PRETTY_FUNCTION__ << ": Failed to decode json.\n");
    return llvm::make_error<llvm::StringError>(stat.error_message().as_string(),
                                               llvm::inconvertibleErrorCode());
  }
  return result;
}

void ReportError(llvm::raw_ostream& os, llvm::Error e) {
  llvm::handleAllErrors(std::move(e), [&os](const llvm::StringError& e) {
    os << "{\"error\":"
       << *MakeError(protocol::Error_Code_PROTOCOL_ERROR, e.getMessage())
       << "}";
  });
}

class JSONRPCHandler : public clang::clangd::Transport::MessageHandler {
 public:
  JSONRPCHandler(ModuleCache* mc, clang::clangd::Transport* transport_layer)
      : transport_layer_(transport_layer), mc_(mc) {}

 protected:
  bool onNotify(llvm::StringRef method, llvm::json::Value params) override {
    return method != "quit";
  }

  bool onCall(llvm::StringRef method,
              llvm::json::Value params,
              llvm::json::Value id) override {
    std::string response;
    {
      llvm::raw_string_ostream os(response);

      if (method == "addRawModule") {
        auto m = Parse<protocol::AddRawModuleRequest>(std::move(params));
        if (m) {
          os << DoAddRawModule(mc_, *m);
        } else {
          ReportError(os, m.takeError());
        }
      } else if (method == "sourceLocationToRawLocation") {
        auto m = Parse<protocol::SourceLocation>(std::move(params));
        if (m) {
          os << DoSourceLocationToRawLocation(mc_, *m);
        } else {
          ReportError(os, m.takeError());
        }
      } else if (method == "rawLocationToSourceLocation") {
        auto m = Parse<protocol::RawLocation>(std::move(params));
        if (m) {
          os << DoRawLocationToSourceLocation(mc_, *m);
        } else {
          ReportError(os, m.takeError());
        }
      } else if (method == "listVariablesInScope") {
        auto m = Parse<protocol::RawLocation>(std::move(params));
        if (m) {
          os << DoListVariables(mc_, *m);
        } else {
          ReportError(os, m.takeError());
        }
      } else if (method == "evaluateVariable") {
        auto m = Parse<protocol::EvaluateVariableRequest>(std::move(params));
        if (m) {
          os << DoEvaluateVariables(mc_, *m);
        } else {
          ReportError(os, m.takeError());
        }
      } else if (method == "quit") {
        return false;
      } else {
        os << *MakeError(protocol::Error_Code_PROTOCOL_ERROR,
                         "Unknown protocol method '" + method + "'");
      }
    }
    LLVM_DEBUG(llvm::dbgs() << "Sending Response '" << response << "'\n");
    transport_layer_->reply(std::move(id), llvm::json::parse(response));
    return true;
  }

  bool onReply(llvm::json::Value id,
               llvm::Expected<llvm::json::Value> result) override {
    return true;
  }

  clang::clangd::Transport* transport_layer_;
  ModuleCache* mc_;
};
}  // namespace

/*static*/ int LLDBLanguageComponentServiceImpl::RunInteractive() {
  LLDBLanguageComponentServiceImpl service;

  llvm::errs() << "Running interactive listener\n";
  clang::clangd::StreamLogger logger(llvm::errs(),
                                     clang::clangd::Logger::Debug);
  clang::clangd::LoggingSession s(logger);

  auto transport_layer =
      clang::clangd::newJSONTransport(stdin, llvm::outs(), nullptr, false);
  JSONRPCHandler handler(&service.mdb_, &*transport_layer);
  auto status = transport_layer->loop(handler);
  if (status) {
    llvm::errs() << status << "\n";
    consumeError(std::move(status));
    return 1;
  }
  return 0;
}
}  // namespace symbol_server
