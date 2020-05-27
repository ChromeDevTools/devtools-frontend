#!/usr/bin/env python3
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import argparse
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

#ifndef SYMBOL_SERVER_API_H_
#define SYMBOL_SERVER_API_H_

#include <string>
#include <vector>

#include "llvm/ADT/Optional.h"

""")


def write_footer(output):
    output.write("""
#endif // SYMBOL_SERVER_API_H_
""")


def write_enum(output, spec):
    output.write('  enum class %s {\n' % spec.cxx_name)
    for enum in spec.members:
        sep = ',' if enum != spec.members[-1] else ''
        output.write('    %s%s\n' % (spec.get_member_cxx_name(enum), sep))
    output.write('  };')


def write_command(output, spec, return_type):

    if spec.doc:
        for doc_line in spec.doc:
            output.write('  // %s\n' % doc_line)
    output.write(
        '  virtual %s %s(\n' %
        (return_type.cxx_name if return_type else 'void', spec.cxx_name))
    for param in spec.arguments:
        arg_type_name = param.type.cxx_name
        if param.optional:
            arg_type_name = 'llvm::Optional<%s>' % arg_type_name

        sep = ',' if param != spec.arguments[-1] else ''
        decl = '    %s %s%s' % (arg_type_name, param.cxx_name, sep)
        output.write(decl)
        if param.doc:
            output.write(' //%s\n' % param.doc[0])
            for more_doc in param.doc[1:]:
                output.write('%s //%s\n' % (' ' * len(decl), more_doc))
        else:
            output.write('\n')

    output.write('  ) = 0;\n\n')


def write_member(output, spec):
    member_type = spec.type.cxx_name
    if spec.array:
        member_type = 'std::vector<%s>' % member_type
    if spec.optional:
        member_type = 'llvm::Optional<%s>' % member_type
    member_decl = '  %s %s_;' % (member_type, spec.cxx_name)
    output.write(member_decl)
    if spec.doc:
        output.write(' // %s\n' % spec.doc[0])
        for more_doc in spec.doc[1:]:
            output.write('%s // %s\n' % (' ' * len(member_decl), more_doc))
    else:
        output.write('\n')


def write_accessors(output, spec):
    accessor_suffix = spec.get_accessor_suffix()
    member_type = spec.type.cxx_name
    if spec.array:
        member_type = 'std::vector<%s>' % member_type
    if spec.optional:
        member_type = 'llvm::Optional<%s>' % member_type
    member_name = '%s_' % spec.cxx_name
    output.write('  %s Get%s() const { return %s; }\n' %
                 (member_type, accessor_suffix, member_name))
    output.write('  void Set%s(%s value) { %s = std::move(value); }\n' %
                 (accessor_suffix, member_type, member_name))


def write_type(output, spec):
    if spec.builtin: return
    for doc_line in spec.doc:
        output.write('// %s\n' % doc_line)
    output.write('class %s {\n' % spec.cxx_name)
    if spec.enums:
        output.write(' public:\n')
        for enum in spec.enums:  # FIXME indent
            write_enum(output, enum)
        output.write('\n private:\n')

    if spec.members:
        for member in spec.members:
            write_member(output, member)

        output.write('\n public:\n')
        output.write('  %s() = default;\n' % spec.cxx_name)
        for member in spec.members:
            write_accessors(output, member)
    output.write('};\n\n')


def write_spec(output, spec):
    for domain in spec:
        output.write('namespace %s {\nnamespace api {\n' % domain.domain)
        for ty in domain.types.values():
            write_type(output, ty)

        return_types = {}
        for command in domain.functions.values():
            if not command.returns: continue
            return_types[command] = pdl_cxx.Type.make_type(
                '%sResponse' % command.cxx_name, command.returns,
                ['Return type of the %s command' % command.cxx_name])
            write_type(output, return_types[command])

        output.write('class DWARFSymbolsApi {\n public:')
        for command in domain.functions.values():
            write_command(output, command, return_types.get(command))
        output.write('};\n')
        output.write('}  // namespace api\n}  // namespace %s\n\n' %
                     domain.domain)


def script_main(args):
    parser = argparse.ArgumentParser()
    parser.add_argument('json_input', type=argparse.FileType())
    parser.add_argument('output',
                        type=argparse.FileType('w'),
                        default='-',
                        nargs='?')
    options = parser.parse_args(args)

    spec = pdl_cxx.PDL.parse(json.load(options.json_input))
    write_header(options.output)
    write_spec(options.output, spec)
    write_footer(options.output)


if __name__ == '__main__':
    script_main(sys.argv[1:])
