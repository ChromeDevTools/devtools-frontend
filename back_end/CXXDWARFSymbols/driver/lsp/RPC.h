// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef SYMBOL_SERVER_RPC_H_
#define SYMBOL_SERVER_RPC_H_
#include "Modules.h"
#include "symbol_server.pb.h"

namespace symbol_server {
struct LLDBLanguageComponentServiceImpl {
  static int RunInteractive();

 private:
  ModuleCache mdb_;
};
}  // namespace symbol_server
#endif  // SYMBOL_SERVER_RPC_H_
