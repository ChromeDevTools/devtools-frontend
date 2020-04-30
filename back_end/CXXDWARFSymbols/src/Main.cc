// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "RPC.h"
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

int main(int Argc, char** Argv) {
  if (!llvm::cl::ParseCommandLineOptions(Argc, Argv, "Description",
                                         &llvm::errs())) {
    return 7;
  }

  symbol_server::DefaultPluginsContext context;
  return symbol_server::LLDBLanguageComponentServiceImpl::RunInteractive();
}
