// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "APIImpl.h"
#include "Logger.h"
#include "Modules.h"
#include "Transport.h"  // from clangd
#include "Util.h"

#include "Plugins/Language/CPlusPlus/CPlusPlusLanguage.h"  // IWYU pragma: keep
#include "Plugins/ObjectFile/ELF/ObjectFileELF.h"          // IWYU pragma: keep
#include "Plugins/ObjectFile/wasm/ObjectFileWasm.h"        // IWYU pragma: keep
#include "Plugins/SymbolFile/DWARF/SymbolFileDWARF.h"      // IWYU pragma: keep
#include "Plugins/SymbolVendor/wasm/SymbolVendorWasm.h"    // IWYU pragma: keep
#include "lldb/Host/FileSystem.h"                          // IWYU pragma: keep
#include "llvm/ADT/StringRef.h"
#include "llvm/Support/CommandLine.h"
#include "llvm/Support/raw_ostream.h"
namespace symbol_server {
namespace api {
llvm::json::Value CallApiMethod(api::DWARFSymbolsApi* api,
                                llvm::StringRef method,
                                llvm::json::Value params);
}
}  // namespace symbol_server

namespace {
class JSONRPCHandler : public clang::clangd::Transport::MessageHandler {
 public:
  explicit JSONRPCHandler(clang::clangd::Transport* transport_layer)
      : transport_layer_(transport_layer) {}

 protected:
  bool onNotify(llvm::StringRef method, llvm::json::Value params) override {
    return method != "quit";
  }

  bool onCall(llvm::StringRef method,
              llvm::json::Value params,
              llvm::json::Value id) override {
    if (method == "quit") {
      return false;
    }
    auto result = symbol_server::api::CallApiMethod(&api_, method, params);
    LLVM_DEBUG(llvm::dbgs() << "Sending Response '" << result << "'\n");
    transport_layer_->reply(std::move(id), result);
    return true;
  }

  bool onReply(llvm::json::Value id,
               llvm::Expected<llvm::json::Value> result) override {
    return true;
  }

  clang::clangd::Transport* transport_layer_;
  symbol_server::api::ApiContext api_;
};
}  // namespace

int main(int Argc, char** Argv) {
  if (!llvm::cl::ParseCommandLineOptions(Argc, Argv, "Description",
                                         &llvm::errs())) {
    return 7;
  }

  symbol_server::DefaultPluginsContext context;

  llvm::errs() << "Running interactive listener\n";
  clang::clangd::StreamLogger logger(llvm::errs(),
                                     clang::clangd::Logger::Debug);
  clang::clangd::LoggingSession s(logger);

  auto transport_layer =
      clang::clangd::newJSONTransport(stdin, llvm::outs(), nullptr, false);
  JSONRPCHandler handler(transport_layer.get());
  auto status = transport_layer->loop(handler);
  if (status) {
    llvm::errs() << status << "\n";
    consumeError(std::move(status));
    return 1;
  }
  return 0;
}
