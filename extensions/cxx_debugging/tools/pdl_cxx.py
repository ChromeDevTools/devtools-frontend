# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.


def to_snake_case(name):
    def to_snake(name):
        for i in range(len(name)):
            char = name[i]
            prev_char = name[i - 1]
            if char >= 'A' and char <= 'Z':
                if prev_char < 'A' or prev_char > 'Z':
                    yield '_'
                yield chr(ord('a') + ord(char) - ord('A'))
            else:
                yield char

    return ''.join(to_snake(name))


def to_proud_camel_case(name):
    return to_snake_case(name).title().replace('_', '')


def _desc(spec):
    if 'description' in spec:
        return spec['description'].split('\n')
    return []


class Variable(object):
    def __init__(self, spec, types, enums):
        self.cxx_name = to_snake_case(spec['name'])
        self.protocol_name = spec['name']
        self.doc = _desc(spec)
        self.optional = spec.get('optional', False)
        self.array = spec.get('type') == 'array'
        self.enum = 'enum' in spec
        if self.enum:
            self.type = Enum(spec)
            enums.append(self.type)
        else:
            type_spec = spec['items'] if self.array else spec
            type_name = type_spec.get('type') or type_spec['$ref']
            if type_name not in types:
                types[type_name] = Type.make_type(type_name)
                assert types[
                    type_name].builtin, 'Undeclared builtin type %s' % type_name
            self.type = types[type_name]

    def get_accessor_suffix(self):
        return to_proud_camel_case(self.cxx_name)


class Type(object):
    def __init__(self, spec):
        protocol_type_map = {
            'integer': 'int32_t',
            'bigint': 'int64_t',
            'binary': 'std::string',
            'string': 'std::string',
            'boolean': 'bool',
            'object': 'emscripten::val',
        }
        self.primitive = spec['id'] == 'integer' or spec['id'] == 'bigint'
        self.builtin = spec['id'] in protocol_type_map
        self.cxx_name = protocol_type_map.get(spec['id'],
                                              to_proud_camel_case(spec['id']))
        self.protocol_name = spec['id']
        self.doc = _desc(spec)
        self.enums = []
        self.members = []

    @classmethod
    def make_type(cls, name, members=None, description=None):
        new_type = Type({
            'id': name,
            'description': '\n'.join(description or [])
        })
        new_type.members = members or []
        for m in new_type.members:
            if m.enum:
                m.type.context = new_type
                new_type.enums.append(m.type)
        return new_type


class Enum(object):
    def __init__(self, spec):
        self.cxx_name = to_proud_camel_case(spec['name'])
        self.protocol_name = spec['name']
        self.doc = _desc(spec)
        self.members = spec['enum']
        self.context = None

    def get_member_cxx_name(self, member):
        return 'k%s' % to_proud_camel_case(member)


class Function(object):
    def __init__(self, spec, types, enums):
        self.cxx_name = to_proud_camel_case(spec['name'])
        self.protocol_name = spec['name']
        self.doc = _desc(spec)
        self.arguments = [
            Variable(var, types, enums) for var in spec.get('parameters', [])
        ]
        self.returns = [
            Variable(var, types, enums) for var in spec.get('returns', [])
        ]
        self.return_type = Type.make_type(
            '%sResponse' % self.cxx_name, self.returns,
            ['Return type of the %s command' %
             self.cxx_name]) if self.returns else None


class PDL(object):
    def __init__(self, spec):
        self.domain = spec['domain']
        self.types = {}
        self.functions = {}
        self.enums = []

        #parse types
        for ty in spec['types']:
            assert ty['type'] == 'object', 'Non-object types not implemented'
            self.types[ty['id']] = Type(ty)
        #parse type members
        for ty in spec['types']:
            type_obj = self.types[ty['id']]
            for member in ty['properties']:
                var = Variable(member, self.types, type_obj.enums)
                type_obj.members.append(var)
                if var.enum:
                    var.type.context = type_obj
        #parse commands
        for comm in spec['commands']:
            self.functions[comm['name']] = Function(comm, self.types,
                                                    self.enums)
        self.return_types = [
            func.return_type for func in self.functions.values()
            if func.return_type
        ]

    def optional_types(self):
        types = {}
        for ty in self.return_types + list(self.types.values()):
            for member in ty.members:
                if member.optional:
                    types[member.type.cxx_name] = member.type
        for ty in self.functions.values():
            for member in ty.arguments:
                if member.optional:
                    types[member.type.cxx_name] = member.type
        return types

    def array_types(self):
        types = {}
        for ty in self.return_types + list(self.types.values()):
            for member in ty.members:
                if member.array:
                    types[member.type.cxx_name] = member.type
        for ty in self.functions.values():
            for member in ty.arguments:
                if member.array:
                    types[member.type.cxx_name] = member.type
        return types

    @classmethod
    def parse(cls, spec):
        return [PDL(domain) for domain in spec['domains']]
