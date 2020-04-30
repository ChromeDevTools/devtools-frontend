// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "Variables.h"

#include <iostream>
#include <system_error>
#include <vector>

#include "DWARFLocationParser.h"
#include "lld/Common/Driver.h"
#include "lldb/Core/Value.h"
#include "lldb/Core/dwarf.h"
#include "lldb/Symbol/CompilerType.h"
#include "lldb/Symbol/Function.h"
#include "lldb/Symbol/SymbolContextScope.h"
#include "lldb/Symbol/Type.h"
#include "lldb/Symbol/Variable.h"
#include "lldb/Utility/ConstString.h"
#include "lldb/Utility/DataExtractor.h"
#include "lldb/lldb-forward.h"
#include "lldb/lldb-types.h"
#include "llvm/ADT/SmallVector.h"
#include "llvm/ADT/Triple.h"
#include "llvm/Analysis/TargetTransformInfo.h"
#include "llvm/BinaryFormat/Dwarf.h"
#include "llvm/DebugInfo/DWARF/DWARFExpression.h"
#include "llvm/IR/BasicBlock.h"
#include "llvm/IR/Constants.h"
#include "llvm/IR/DerivedTypes.h"
#include "llvm/IR/Function.h"
#include "llvm/IR/GlobalVariable.h"
#include "llvm/IR/IRBuilder.h"
#include "llvm/IR/LLVMContext.h"
#include "llvm/IR/LegacyPassManager.h"
#include "llvm/IR/Module.h"
#include "llvm/IR/Type.h"
#include "llvm/IRReader/IRReader.h"
#include "llvm/Linker/Linker.h"
#include "llvm/Passes/PassBuilder.h"
#include "llvm/Support/Errc.h"
#include "llvm/Support/Error.h"
#include "llvm/Support/ErrorOr.h"
#include "llvm/Support/FileSystem.h"
#include "llvm/Support/MemoryBuffer.h"
#include "llvm/Support/Path.h"
#include "llvm/Support/SourceMgr.h"
#include "llvm/Support/TargetRegistry.h"
#include "llvm/Support/TargetSelect.h"
#include "llvm/Support/raw_ostream.h"
#include "llvm/Target/TargetMachine.h"
#include "llvm/Target/TargetOptions.h"
#include "llvm/Transforms/IPO/PassManagerBuilder.h"
#include "llvm/Transforms/Utils/BasicBlockUtils.h"
#include "symbol-server-config.h"

#define DEBUG_TYPE "symbol_server"

namespace symbol_server {

namespace {
llvm::AttributeList GetImportModuleAttr(llvm::LLVMContext* context) {
  return llvm::AttributeList::get(
      *context,
      {{llvm::AttributeList::FunctionIndex,
        llvm::Attribute::get(*context, "wasm-import-module", "env")}});
}

// void __getMemory(uint32_t offset, uint32_t size, void* result);
llvm::FunctionCallee GetGetMemoryCallback(llvm::Module* m) {
  llvm::IRBuilder<> b(m->getContext());
  return m->getOrInsertFunction(
      "__getMemory", GetImportModuleAttr(&m->getContext()), b.getVoidTy(),
      b.getInt32Ty(), b.getInt32Ty(), b.getInt8PtrTy());
}

// void __getLocal(uint32_t local,  void* result);
llvm::FunctionCallee GetGetLocalCallback(llvm::Module* m) {
  llvm::IRBuilder<> b(m->getContext());
  return m->getOrInsertFunction(
      "__getLocal", GetImportModuleAttr(&m->getContext()), b.getVoidTy(),
      b.getInt32Ty(), b.getInt8PtrTy());
}

// int format_begin_array(const char* ArrayName, const char *ElementType,
//                        char *Buffer, int Size);
llvm::FunctionCallee GetArrayBeginFormatter(llvm::Module* m) {
  llvm::IRBuilder<> b(m->getContext());
  return m->getOrInsertFunction("format_begin_array", b.getInt32Ty(),
                                b.getInt8PtrTy(), b.getInt8PtrTy(),
                                b.getInt8PtrTy(), b.getInt32Ty());
}

// uint32_t get_scratch_pad_size(void* begin, void* end);
llvm::FunctionCallee GetGetScratchPadSize(llvm::Module* m) {
  llvm::IRBuilder<> b(m->getContext());
  return m->getOrInsertFunction("get_scratch_pad_size", b.getInt32Ty(),
                                b.getInt8PtrTy(), b.getInt8PtrTy());
}

// void* sbrk(intptr_t increment);
llvm::FunctionCallee GetSBrk(llvm::Module* m) {
  llvm::IRBuilder<> b(m->getContext());
  return m->getOrInsertFunction("sbrk", GetImportModuleAttr(&m->getContext()),
                                b.getInt8PtrTy(), b.getInt32Ty());
}

// int format_sep(char *Buffer, int Size);
llvm::FunctionCallee GetSepFormatter(llvm::Module* m) {
  llvm::IRBuilder<> b(m->getContext());
  return m->getOrInsertFunction("format_sep", b.getInt32Ty(), b.getInt8PtrTy(),
                                b.getInt32Ty());
}

// int format_end_array(char *Buffer, int Size);
llvm::FunctionCallee GetArrayEndFormatter(llvm::Module* m) {
  llvm::IRBuilder<> b(m->getContext());
  return m->getOrInsertFunction("format_end_array", b.getInt32Ty(),
                                b.getInt8PtrTy(), b.getInt32Ty());
}

llvm::Value* GetHeapBase(llvm::IRBuilder<>* builder) {
  llvm::Module& m = *builder->GetInsertBlock()->getModule();
  llvm::Constant* symbol =
      m.getOrInsertGlobal("__heap_base", builder->getInt32Ty());
  return builder->CreatePointerBitCastOrAddrSpaceCast(symbol,
                                                      builder->getInt8PtrTy());
}

template <typename... ArgTs>
llvm::Value* CreateCall(llvm::IRBuilder<>* builder,
                        llvm::FunctionCallee callee,
                        ArgTs... args) {
  llvm::Value* arg_array[] = {args...};
  return builder->CreateCall(callee, arg_array);
}

llvm::Expected<llvm::Value*> ReadVarValue(llvm::IRBuilder<>* builder,
                                          const MemoryLocation& variable,
                                          llvm::Type* ty) {
  llvm::Module& m = *builder->GetInsertBlock()->getModule();
  switch (variable.address_space) {
    case WasmAddressSpace::kMemory: {
      llvm::FunctionCallee f = GetGetMemoryCallback(&m);
      llvm::Value* result = builder->CreateAlloca(ty);
      CreateCall(builder, f, variable.offset,
                 builder->getInt32(m.getDataLayout().getTypeAllocSize(ty)),
                 builder->CreateBitCast(result, builder->getInt8PtrTy()));
      return result;
    }
    default:
      return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                     "Unimplemented Wasm Address Space '%u'",
                                     variable.address_space);
  }
}

void HandleError(llvm::IRBuilder<>* builder, llvm::Value* return_value) {
  llvm::Function* f = builder->GetInsertBlock()->getParent();
  llvm::LLVMContext& context = f->getContext();
  assert(f && "Broken IR builder");
  llvm::BasicBlock* error_block = llvm::BasicBlock::Create(context, "error", f);
  llvm::IRBuilder<>(error_block)
      .CreateRet(llvm::ConstantPointerNull::get(
          llvm::cast<llvm::PointerType>(f->getReturnType())));

  llvm::Value* cmp = builder->CreateICmpSLT(return_value, builder->getInt32(0));
  assert(builder->GetInsertPoint() != builder->GetInsertBlock()->end());
  llvm::Instruction* ip = &*builder->GetInsertPoint();
  llvm::SplitBlockAndInsertIfThen(cmp, ip, false,
                                  /*BranchWeights=*/nullptr,
                                  /*DT=*/nullptr,
                                  /*LI=*/nullptr,
                                  /*ThenBlock=*/error_block);
  builder->SetInsertPoint(ip);
}
}  // namespace

template <typename... ArgTs>
VariablePrinter::StringSlice CallFormatter(llvm::IRBuilder<>* builder,
                                           llvm::FunctionCallee formatter,
                                           llvm::Value* buffer,
                                           llvm::Value* size,
                                           ArgTs... arguments) {
  llvm::Value* args[] = {arguments..., buffer, size};
  llvm::Value* offset = builder->CreateCall(formatter, args, "Offset");
  HandleError(builder, offset);
  size = builder->CreateSub(size, offset, "Size");
  buffer = builder->CreateInBoundsGEP(buffer, offset, "Buffer");
  return std::make_pair(buffer, size);
}

llvm::Expected<VariablePrinter::StringSlice> VariablePrinter::FormatPrimitive(
    llvm::IRBuilder<>* builder,
    llvm::Value* buffer,
    llvm::Value* size,
    llvm::StringRef name,
    const lldb_private::CompilerType& variable_type,
    const MemoryLocation& variable) {
  llvm::Module* m = builder->GetInsertBlock()->getModule();
  auto formatter =
      primitive_formatters_.find(variable_type.GetTypeName().GetStringRef());
  if (formatter == primitive_formatters_.end()) {
    return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                   "No formatter for type '%s'",
                                   variable.type.c_str());
  }
  auto f = formatter->second(m);
  auto var_value = ReadVarValue(
      builder, variable,
      f.getFunctionType()->getParamType(0)->getPointerElementType());
  if (!var_value) {
    return var_value.takeError();
  }
  llvm::Value* var_name = builder->CreateGlobalStringPtr(name);

  return CallFormatter(builder, formatter->second(m), buffer, size, *var_value,
                       var_name);
}

llvm::Expected<VariablePrinter::StringSlice> VariablePrinter::FormatAggregate(
    llvm::IRBuilder<>* builder,
    llvm::Value* buffer,
    llvm::Value* size,
    llvm::StringRef name,
    const lldb_private::CompilerType& variable_type,
    const MemoryLocation& variable) {
  auto& m = *builder->GetInsertBlock()->getModule();

  llvm::Value* type_name = builder->CreateGlobalStringPtr(
      variable_type.GetTypeName().GetStringRef());
  llvm::Value* var_name = builder->CreateGlobalStringPtr(name);

  std::tie(buffer, size) = CallFormatter(builder, GetArrayBeginFormatter(&m),
                                         buffer, size, var_name, type_name);
  for (size_t child = 0, e = variable_type.GetNumFields(); child < e; ++child) {
    if (child > 0) {
      std::tie(buffer, size) =
          CallFormatter(builder, GetSepFormatter(&m), buffer, size);
    }

    std::string child_name;
    uint64_t bit_offset;
    auto child_type = variable_type.GetFieldAtIndex(
        child, child_name, &bit_offset, nullptr, nullptr);
    assert(bit_offset % 8 == 0 && "Expecting fields to be byte-aligned");

    MemoryLocation child_location = variable;
    child_location.offset = builder->CreateAdd(
        child_location.offset, builder->getInt32(bit_offset / 8));
    auto result = FormatVariable(builder, buffer, size, child_name, child_type,
                                 child_location);
    if (!result) {
      return result;
    }
    std::tie(buffer, size) = *result;
  }
  return CallFormatter(builder, GetArrayEndFormatter(&m), buffer, size);
}

llvm::Expected<VariablePrinter::StringSlice> VariablePrinter::FormatArray(
    llvm::IRBuilder<>* builder,
    llvm::Value* buffer,
    llvm::Value* size,
    llvm::StringRef name,
    const lldb_private::CompilerType& element_type,
    const MemoryLocation& variable,
    uint64_t array_size,
    bool incomplete) {
  if (incomplete) {
    return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                   "Cannot print array of unknown size: '%s'\n",
                                   element_type.GetTypeName().GetCString());
  }
  auto& m = *builder->GetInsertBlock()->getModule();
  auto element_size = element_type.GetByteSize(nullptr);
  if (!element_size) {
    return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                   "Cannot determing byte size of type '%s'\n",
                                   element_type.GetTypeName().GetCString());
  }

  llvm::errs() << "Formatting array of type "
               << element_type.GetTypeName().GetStringRef() << " with "
               << array_size << " elements\n";

  llvm::Value* type_name =
      builder->CreateGlobalStringPtr(element_type.GetTypeName().GetStringRef());
  llvm::Value* var_name = builder->CreateGlobalStringPtr(name);

  std::tie(buffer, size) = CallFormatter(builder, GetArrayBeginFormatter(&m),
                                         buffer, size, var_name, type_name);

  MemoryLocation element_location = variable;
  for (size_t element = 0; element < array_size; ++element) {
    if (element > 0) {
      std::tie(buffer, size) =
          CallFormatter(builder, GetSepFormatter(&m), buffer, size);
    }
    // FIXME maybe don't unroll this thing?
    std::string element_name =
        (name + "[" + std::to_string(element) + "]").str();
    auto result = FormatVariable(builder, buffer, size, element_name,
                                 element_type, element_location);
    if (!result) {
      return result;
    }
    std::tie(buffer, size) = *result;
    element_location.offset = builder->CreateAdd(
        element_location.offset, builder->getInt32(*element_size));
  }

  return CallFormatter(builder, GetArrayEndFormatter(&m), buffer, size);
}

llvm::Expected<VariablePrinter::StringSlice> VariablePrinter::FormatVariable(
    llvm::IRBuilder<>* builder,
    llvm::Value* buffer,
    llvm::Value* size,
    llvm::StringRef name,
    const lldb_private::CompilerType& variable_type,
    const MemoryLocation& variable) {
  if (variable_type.IsScalarType() || variable_type.IsPointerType()) {
    return FormatPrimitive(builder, buffer, size, name, variable_type,
                           variable);
  }

  lldb_private::CompilerType element_type;
  uint64_t array_size;
  bool incomplete;
  if (variable_type.IsArrayType(&element_type, &array_size, &incomplete)) {
    return FormatArray(builder, buffer, size, name, element_type, variable,
                       array_size, incomplete);
  }

  if (variable_type.IsAggregateType()) {
    return FormatAggregate(builder, buffer, size, name, variable_type,
                           variable);
  }

  return llvm::createStringError(llvm::inconvertibleErrorCode(),
                                 "Unhandled type category for type '%s'",
                                 variable_type.GetTypeName().AsCString());
}

llvm::Expected<std::unique_ptr<llvm::Module>> VariablePrinter::GenerateModule(
    llvm::StringRef name,
    lldb::VariableSP var) {
  auto m = std::make_unique<llvm::Module>("wasm_eval", main_context_);
  m->setDataLayout(
      wasm_target_machine_->createDataLayout().getStringRepresentation());
  m->setTargetTriple(wasm_target_machine_->getTargetTriple().getTriple());
  llvm::IRBuilder<> builder(main_context_);

  llvm::FunctionCallee entry =
      m->getOrInsertFunction("wasm_format", builder.getInt8PtrTy());

  builder.SetInsertPoint(llvm::BasicBlock::Create(
      main_context_, "entry", llvm::cast<llvm::Function>(entry.getCallee())));
  auto* scratch_pad_begin = GetHeapBase(&builder);
  auto* scratch_pad_end =
      builder.CreateCall(GetSBrk(&*m), {builder.getInt32(0)});
  auto* size = builder.CreateCall(GetGetScratchPadSize(m.get()),
                                  {scratch_pad_begin, scratch_pad_end});
  builder.SetInsertPoint(builder.CreateRet(scratch_pad_begin));

  auto& location_exp = var->LocationExpression();
  auto* function =
      var->GetSymbolContextScope()->CalculateSymbolContextFunction();

  auto result = symbol_server::DWARFLocationParser::Parse(
      &builder, GetGetMemoryCallback(m.get()), GetGetLocalCallback(m.get()),
      function, location_exp);
  if (!result) {
    return result.takeError();
  }

  auto type = var->GetType()->GetFullCompilerType();
  MemoryLocation location;
  location.address_space = WasmAddressSpace::kMemory;
  location.offset = builder.CreateIntCast(*result, builder.getInt32Ty(), false);

  auto status =
      FormatVariable(&builder, scratch_pad_begin, size, name, type, location);
  LLVM_DEBUG(m->dump());

  if (!status) {
    return status.takeError();
  }
  return m;
}

std::unique_ptr<llvm::Module> VariablePrinter::LoadRuntimeModule() {
  llvm::SMDiagnostic err;
  llvm::SmallString<128> formatter_module_file(SYMBOL_SERVER_TOOL_DIR);
  llvm::sys::path::append(formatter_module_file, "formatters.bc");
  auto m = getLazyIRFileModule(formatter_module_file, err, main_context_);
  if (!m) {
    err.print("RuntimeModule", llvm::errs());
  }
  return m;
}

namespace {
class TempFileScope {
  llvm::sys::fs::TempFile* the_file_;

 public:
  explicit TempFileScope(llvm::sys::fs::TempFile* f) : the_file_(f) {}
  ~TempFileScope() {
    auto e = the_file_->discard();
    if (e) {
      llvm::errs() << "Failed to delete temporary file " << the_file_->TmpName
                   << ": " << e << "\n";
    }
  }
};

auto GetTempFile(llvm::StringRef model) {
  llvm::SmallString<128> tmpfile;
  llvm::sys::path::system_temp_directory(true, tmpfile);
  llvm::sys::path::append(tmpfile, model);
  return llvm::sys::fs::TempFile::create(tmpfile);
}
}  // namespace
std::unique_ptr<llvm::MemoryBuffer> VariablePrinter::GenerateCode(

    llvm::Module* m) {
  if (auto runtime_module = LoadRuntimeModule()) {
    llvm::Linker module_linker(*m);
    module_linker.linkInModule(std::move(runtime_module));
  }
  LLVM_DEBUG(m->dump());

  auto obj_file = GetTempFile("wasm_formatter-%%%%%%.o");
  if (!obj_file) {
    llvm::errs() << "Failed to create temporary object file: "
                 << obj_file.takeError() << "\n";
    return {};
  }
  TempFileScope obj_scope(&obj_file.get());
  llvm::raw_fd_ostream asm_stream(obj_file->FD, false);

  optimizer_.run(*m, module_analyses_);

  llvm::legacy::PassManager pm;
  pm.add(createTargetTransformInfoWrapperPass(
      wasm_target_machine_->getTargetIRAnalysis()));
  if (wasm_target_machine_->addPassesToEmitFile(
          pm, asm_stream, nullptr, llvm::CGFT_ObjectFile, true /* verify */)) {
    llvm::errs()
        << "The target does not support generation of this file type!\n";
    return {};
  }
  pm.run(*m);
  asm_stream.flush();

  auto module_file = GetTempFile("wasm_formatter-%%%%%%.wasm");
  if (!module_file) {
    llvm::errs() << "Failed to create temporary module file: "
                 << module_file.takeError() << "\n";
    return {};
  }
  TempFileScope module_scope(&*module_file);
  const char* link_args[] = {"wasm-ld",
                             obj_file->TmpName.c_str(),
                             "--export=wasm_format",
                             "--no-entry",
                             "--allow-undefined",
                             "-o",
                             module_file->TmpName.c_str()};
  llvm::errs() << "Linking: ";
  for (auto* a : link_args) {
    llvm::errs() << a << " ";
  }
  llvm::errs() << "\n";

  if (!lld::wasm::link(link_args, false, llvm::outs(), llvm::errs())) {
    llvm::errs() << "Linking failed\n";
    return {};
  }

  auto data = llvm::MemoryBuffer::getFile(module_file->TmpName);
  if (!data) {
    llvm::errs() << "Failed to read temporary module file: "
                 << data.getError().message() << "\n";
    return {};
  }
  llvm::errs() << (*data)->getBufferSize() << "\n";

  return std::move(*data);
}

#define MAKE_FORMATTER(name, type)                                           \
  {                                                                          \
    name, std::function<llvm::FunctionCallee(llvm::Module*)>(                \
              [](llvm::Module* m) -> llvm::FunctionCallee {                  \
                return m->getOrInsertFunction(                               \
                    "format_" name, llvm::Type::getInt32Ty(m->getContext()), \
                    llvm::Type::get##type##PtrTy(m->getContext()),           \
                    llvm::Type::getInt8PtrTy(m->getContext()),               \
                    llvm::Type::getInt8PtrTy(m->getContext()),               \
                    llvm::Type::getInt32Ty(m->getContext()));                \
              })                                                             \
  }

VariablePrinter::VariablePrinter()
    : primitive_formatters_(
          {MAKE_FORMATTER("int64_t", Int64),
           MAKE_FORMATTER("int32_t", Int32),
           MAKE_FORMATTER("int", Int32),
           MAKE_FORMATTER("int8_t", Int8),
           {"const char *", [](llvm::Module* m) -> llvm::FunctionCallee {
              return m->getOrInsertFunction(
                  "format_string", llvm::Type::getInt32Ty(m->getContext()),
                  llvm::Type::getInt8PtrTy(m->getContext())->getPointerTo(),
                  llvm::Type::getInt8PtrTy(m->getContext()),
                  llvm::Type::getInt8PtrTy(m->getContext()),
                  llvm::Type::getInt32Ty(m->getContext()));
            }}}) {
  LLVMInitializeWebAssemblyTarget();
  LLVMInitializeWebAssemblyTargetInfo();
  LLVMInitializeWebAssemblyTargetMC();
  LLVMInitializeWebAssemblyAsmPrinter();

  llvm::Triple wasm_triple("wasm32-unknown-unknown-wasm");
  std::string err_msg;
  const auto* wasm_target =
      llvm::TargetRegistry::lookupTarget(wasm_triple.getTriple(), err_msg);

  if (!wasm_target) {
    llvm::errs() << err_msg << "\n";
    return;
  }

  wasm_target_machine_.reset(wasm_target->createTargetMachine(
      wasm_triple.getTriple(), "", "", {}, /*RelocModel=*/llvm::None));
  llvm::PassBuilder pb;
  function_analyses_.registerPass(
      [&pb] { return pb.buildDefaultAAPipeline(); });
  pb.registerModuleAnalyses(module_analyses_);
  pb.registerCGSCCAnalyses(cgscc_analyses_);
  pb.registerFunctionAnalyses(function_analyses_);
  pb.registerLoopAnalyses(loop_analyses_);
  pb.crossRegisterProxies(loop_analyses_, function_analyses_, cgscc_analyses_,
                          module_analyses_);
  optimizer_ = pb.buildModuleOptimizationPipeline(
      llvm::PassBuilder::OptimizationLevel::Oz);
}

VariablePrinter::~VariablePrinter() = default;

}  // namespace symbol_server
