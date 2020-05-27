#!/usr/bin/env python3
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import argparse
from itertools import chain
import json
import sys

import pdl_cxx


def write_header(output):
    output.write(
        """// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// THIS IS GENERATED CODE, DO NOT MODIFY!
// clang-format off

#include "api.h"

#include "llvm/ADT/StringRef.h"
#include "llvm/Support/ErrorHandling.h"
#include "llvm/Support/Base64.h"
#include "llvm/Support/JSON.h"

namespace symbol_server {
namespace api {

template <typename T>
llvm::json::Value toJSON(const llvm::Optional<T>& Opt) { // NOLINT
  return llvm::json::toJSON(Opt);
}

llvm::json::Value ToBase64(const llvm::Optional<std::vector<uint8_t>> &out) {
  if (!out) return "";
  if (out->size() == 0) return "";
  return llvm::encodeBase64(*out);
}

bool FromBase64(const llvm::json::Value& value, std::vector<uint8_t> *out) {
  llvm_unreachable("Not implemented");
}

template <typename T>
llvm::Optional<T> GetValue(const llvm::json::Object* object, llvm::StringRef key) {
  if (!object) {
    return llvm::None;
  }
  if (const llvm::json::Value* value = object->get(key)) {
    T result;
    if (fromJSON(*value, result)) {
      return result;
    }
  }
  return llvm::None;
}

template <>
llvm::Optional<std::vector<uint8_t>> GetValue(const llvm::json::Object* object, llvm::StringRef key) {
  if (!object) {
    return llvm::None;
  }
  if (const llvm::json::Value* value = object->get(key)) {
    std::vector<uint8_t> result;
    if (FromBase64(*value, &result)) {
      return result;
    }
  }
  return llvm::None;
}

""")


def get_type_name(spec, enum):
    if not enum and spec.builtin:
        return spec.cxx_name

    if enum and spec.context:
        return 'symbol_server::api::%s::%s' % (spec.context.cxx_name,
                                               spec.cxx_name)
    return 'symbol_server::api::%s' % spec.cxx_name


def write_member(output, spec):
    type_name = get_type_name(spec.type, spec.enum)
    if spec.array:
        type_name = 'std::vector<%s>' % type_name
    output.write('    if (auto value = GetValue<%s>(obj, "%s")) {\n' %
                 (type_name, spec.protocol_name))
    output.write('      out.Set%s(*value);\n' % spec.get_accessor_suffix())
    output.write('    }\n')


def write_type(output, spec, decl_only):
    if spec.builtin: return
    output.write(
        '// NOLINTNEXTLINE\nbool fromJSON(const llvm::json::Value& e, symbol_server::api::%s& out)'
        % spec.cxx_name)
    if decl_only:
        output.write(';\n')
    else:
        output.write(' {\n')
        output.write('  if (auto* obj = e.getAsObject()) {\n')
        for member in spec.members:
            write_member(output, member)
        output.write('    return true;\n  }\n  return false;\n}\n\n')

    output.write(
        '// NOLINTNEXTLINE\nllvm::json::Value toJSON(const symbol_server::api::%s& out)'
        % spec.cxx_name)
    if decl_only:
        output.write(';\n')
    else:
        output.write(' {\n    return llvm::json::Object({')
        for member in spec.members:
            if member.type.cxx_name == 'std::vector<uint8_t>':
                output.write(
                    '      {"%s", ToBase64(out.Get%s())},\n' %
                    (member.protocol_name, member.get_accessor_suffix()))
            elif member.array or (not member.enum and member.type.builtin):
                output.write(
                    '      {"%s", out.Get%s()},\n' %
                    (member.protocol_name, member.get_accessor_suffix()))
            else:
                output.write(
                    '      {"%s", toJSON(out.Get%s())},\n' %
                    (member.protocol_name, member.get_accessor_suffix()))
        output.write('});\n}\n\n')


def write_enum(output, spec, decl_only):
    type_name = get_type_name(spec, True)
    output.write(
        '// NOLINTNEXTLINE\nbool fromJSON(const llvm::json::Value& e, %s& out)'
        % type_name)
    if decl_only:
        output.write(';\n')
    else:
        output.write(' {\n')
        output.write('  if (auto obj = e.getAsString()) {\n')
        for case in spec.members:
            output.write(
                '    if (*obj == "%s") {\n      out = %s::%s;\n      return true;\n    }\n'
                % (case.upper(), type_name, spec.get_member_cxx_name(case)))
        output.write('    }\n  return false;\n}\n\n')

    output.write('// NOLINTNEXTLINE\nllvm::json::Value toJSON(%s out)' %
                 type_name)
    if decl_only:
        output.write(';\n')
    else:
        output.write(' {\n    switch(out) {\n')
        for case in spec.members:
            output.write(
                '    case %s::%s: return "%s";\n' %
                (type_name, spec.get_member_cxx_name(case), case.upper()))
        output.write('    }\n  return {};\n}\n\n')


def write_command(output, spec, return_type):
    output.write('    if (method == "%s") {\n' % spec.protocol_name)
    for n, param in enumerate(spec.arguments):
        param_type = get_type_name(param.type, param.enum)
        output.write('      auto param_%d = api::GetValue<%s>(obj, "%s");\n' %
                     (n, param_type, param.protocol_name))
        if not param.optional:
            output.write(
                '      if (!param_%d) { return MissingArgumentError("%s"); }\n'
                % (n, param.protocol_name))

    if return_type:
        output.write('      return toJSON(api->%s(' % spec.cxx_name)
        for n, param in enumerate(spec.arguments):
            if n != 0: output.write(', ')
            if not param.optional: output.write('*')
            output.write('param_%d' % n)
        output.write('));\n    }\n')
    else:
        output.write('      api->%s(%s);\n      return {};    }\n' %
                     (spec.cxx_name, param_string))


def write_spec(output, spec, name):
    for domain in spec:
        for ty in domain.types.values():
            write_type(output, ty, True)

        return_types = {}
        for command in domain.functions.values():
            if not command.returns: continue
            return_types[command] = pdl_cxx.Type.make_type(
                '%sResponse' % command.cxx_name, command.returns,
                ['Return type of the %s command' % command.cxx_name])
            write_type(output, return_types[command], True)

        for enum in domain.enums:
            if not enum.context:
                write_enum(output, enum, True)

        for ty in domain.types.values():
            for enum in ty.enums:
                if enum.context:
                    write_enum(output, enum, True)

        for ty in chain(domain.types.values(), return_types.values()):
            write_type(output, ty, False)

        for enum in domain.enums:
            if not enum.context:
                write_enum(output, enum, False)

        for ty in domain.types.values():
            for enum in ty.enums:
                if enum.context:
                    write_enum(output, enum, False)

        output.write('''
llvm::json::Value InvalidMethodError(llvm::StringRef method) {
  Error e;
  e.SetCode(Error::Code::kInternalError);
  e.SetMessage(("Invalid method '" + method + "'").str());
  return toJSON(e);
}

llvm::json::Value MissingArgumentError(llvm::StringRef argument) {
  Error e;
  e.SetCode(Error::Code::kInternalError);
  e.SetMessage(("JSON Error: missing non-optional argument '" + argument +
                "'").str());
  return toJSON(e);
}

llvm::Expected<llvm::json::Value> CallApiMethod(api::DWARFSymbolsApi *api,
                                               llvm::StringRef method,
                                               llvm::json::Value params) {
  llvm::json::Object *obj = params.getAsObject();
''')

        for command in domain.functions.values():
            write_command(output, command, return_types.get(command))

        output.write('''  return InvalidMethodError(method);\n
}
}  // namespace api
}  // namespace symbol_server
''')


def script_main(args):
    parser = argparse.ArgumentParser()
    parser.add_argument('-name', default='DWARFSymbolsPlugin')
    parser.add_argument('json_input', type=argparse.FileType())
    parser.add_argument('output',
                        type=argparse.FileType('w'),
                        default='-',
                        nargs='?')
    options = parser.parse_args(args)

    spec = pdl_cxx.PDL.parse(json.load(options.json_input))
    write_header(options.output)
    write_spec(options.output, spec, options.name)


if __name__ == '__main__':
    script_main(sys.argv[1:])
