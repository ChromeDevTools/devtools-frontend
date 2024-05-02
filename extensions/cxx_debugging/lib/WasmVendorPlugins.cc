// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "WasmVendorPlugins.h"

#include "Plugins/SymbolFile/DWARF/LogChannelDWARF.h"
#include "lldb/Core/PluginManager.h"
#include "lldb/Host/linux/HostInfoLinux.h"
#include "lldb/Target/Platform.h"
#include "lldb/Utility/RegisterValue.h"

namespace symbols_backend {

void WasmPlatform::Initialize() {
  lldb_private::Platform::SetHostPlatform(
      std::make_shared<WasmPlatform>(/*is_host_platform*/ true));
}
void WasmPlatform::Terminate() {}

WasmRegisters::WasmRegisters(lldb_private::Thread& thread, size_t frame_offset)
    : RegisterContext(thread, 0), frame_offset_(frame_offset) {
  fake_pc_register_.kinds[lldb::eRegisterKindGeneric] = LLDB_REGNUM_GENERIC_PC;
}

const lldb_private::RegisterInfo* WasmRegisters::GetRegisterInfoAtIndex(
    size_t reg) {
  if (reg == 0) {
    return &fake_pc_register_;
  }
  return nullptr;
}

bool WasmRegisters::ReadRegister(const lldb_private::RegisterInfo* reg_info,
                                 lldb_private::RegisterValue& reg_value) {
  if (reg_info == &fake_pc_register_) {
    reg_value = static_cast<uint32_t>(frame_offset_);
    return true;
  }
  return false;
}

bool WasmUnwind::DoGetFrameInfoAtIndex(uint32_t frame_idx,
                                       lldb::addr_t& cfa,
                                       lldb::addr_t& pc,
                                       bool& behaves_like_zeroth_frame) {
  if (frame_idx != 0) {
    return false;
  }
  pc = frame_offset_;
  cfa = LLDB_INVALID_ADDRESS;
  behaves_like_zeroth_frame = true;
  return true;
}

lldb::RegisterContextSP WasmThread::CreateRegisterContextForFrame(
    lldb_private::StackFrame* frame) {
  return unwind_.DoCreateRegisterContextForFrame(frame);
}

lldb::RegisterContextSP WasmThread::GetRegisterContext() {
  return unwind_.GetRegisterContext();
}

lldb::StackFrameSP WasmThread::GetFrame() {
  if (!stack_frame_) {
    stack_frame_ = this->GetStackFrameList()->GetFrameAtIndex(0);
    this->SetSelectedFrame(stack_frame_.get());
  }
  return stack_frame_;
}

void WasmProcess::SetProxyAndFrameOffset(const api::DebuggerProxy& proxy,
                                         size_t frame_offset) {
  proxy_ = &proxy;
  frame_offset_ = frame_offset;
  this->SetPrivateState(lldb::StateType::eStateStopped);
}
bool WasmProcess::CanDebug(lldb::TargetSP target,
                           bool plugin_specified_by_name) {
  return target->GetArchitecture().GetTriple().getArchName() == "wasm32";
}
bool WasmProcess::DoUpdateThreadList(
    lldb_private::ThreadList& old_thread_list,
    lldb_private::ThreadList& new_thread_list) {
  if (frame_offset_ > 0) {
    new_thread_list.AddThread(
        lldb::ThreadSP(new WasmThread(*this, frame_offset_)));
    return true;
  }
  return false;
}

size_t WasmProcess::DoReadMemory(lldb::addr_t vm_addr,
                                 void* buf,
                                 size_t size,
                                 lldb_private::Status& error) {
  if (!proxy_) {
    error.SetErrorString("Proxy not initialized");
    return 0;
  }
  auto result = proxy_->ReadMemory(vm_addr, buf, size);
  if (!result) {
    error.SetErrorString(llvm::toString(result.takeError()));
    return 0;
  }
  return *result;
}

void WasmProcess::Initialize() {
  lldb_private::PluginManager::RegisterPlugin(
      GetPluginNameStatic(), GetPluginDescriptionStatic(), CreateInstance);
}

lldb::ProcessSP WasmProcess::CreateInstance(
    lldb::TargetSP target_sp,
    lldb::ListenerSP listener_sp,
    const lldb_private::FileSpec* crash_file_path,
    bool can_connect) {
  return lldb::ProcessSP(new WasmProcess(target_sp, listener_sp));
}

void WasmProcess::Terminate() {
  lldb_private::PluginManager::UnregisterPlugin(CreateInstance);
}

char SymbolFileWasmDWARF::ID;

void SymbolFileWasmDWARF::Initialize() {
  lldb_private::LogChannelDWARF::Initialize();
  lldb_private::PluginManager::RegisterPlugin(
      GetPluginNameStatic(), GetPluginDescriptionStatic(), CreateInstance,
      SymbolFileDWARF::DebuggerInitialize);
}

void SymbolFileWasmDWARF::Terminate() {
  lldb_private::PluginManager::UnregisterPlugin(CreateInstance);
  lldb_private::LogChannelDWARF::Terminate();
}

llvm::StringRef SymbolFileWasmDWARF::GetPluginDescriptionStatic() {
  return "Wasm DWARF";
}

lldb_private::SymbolFile* SymbolFileWasmDWARF::CreateInstance(
    lldb::ObjectFileSP objfile_sp) {
  return new SymbolFileWasmDWARF(std::move(objfile_sp),
                                 /*dwo_section_list*/ nullptr);
}
}  // namespace symbols_backend

LLDB_PLUGIN_DEFINE_ADV(symbols_backend::SymbolFileWasmDWARF,
                       SymbolFileWasmDWARF)

namespace lldb_private {
void HostInfoLinux::ComputeHostArchitectureSupport(ArchSpec& arch_32,
                                                   ArchSpec& arch_64) {
  HostInfoPosix::ComputeHostArchitectureSupport(arch_32, arch_64);
}

bool HostInfoLinux::ComputeSystemPluginsDirectory(FileSpec& file_spec) {
  return false;
}

bool HostInfoLinux::ComputeUserPluginsDirectory(FileSpec& file_spec) {
  return false;
}

Environment Host::GetEnvironment() {
  return {};
}
}  // namespace lldb_private
