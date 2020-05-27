#Copyright 2020 The Chromium Authors.All rights reserved.
#Use of this source code is governed by a BSD - style license that can be
#found in the LICENSE file.


def to_snake_case(name):
    def to_snake(name):
        for char in name:
            if char >= 'A' and char <= 'Z':
                yield '_'
                yield chr(ord('a') + ord(char) - ord('A'))
            else:
                yield char

    return ''.join(to_snake(name))


def to_proud_camel_case(name):
    return to_snake_case(name).title().replace('_', '')


def _desc(spec):
    if 'description' in spec: return spec['description'].split('\n')
    return []


def write_accessors(output, spec):
    if 'enum' in spec:
        type_name = to_proud_camel_case(spec['name'])
    else:
        type_name = get_type(spec)

    accessor_name = to_proud_camel_case(spec['name'])
    member_name = to_snake_case(spec['name'])
    output.write('  %s Get%s() const { return %s_; }\n' %
                 (type_name, accessor_name, member_name))
    output.write('  void Set%s(%s value) { %s_ = std::move(value); }\n' %
                 (accessor_name, type_name, member_name))


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
                assert types[type_name].builtin, 'Undeclared builtin type'
            self.type = types[type_name]

    def get_accessor_suffix(self):
        return to_proud_camel_case(self.cxx_name)


class Type(object):
    def __init__(self, spec):
        protocol_type_map = {
            'integer': 'int32_t',
            'binary': 'std::vector<uint8_t>',
            'string': 'std::string'
        }
        self.primitive = spec['id'] == 'integer'
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
        new_type.members = members or []  # FIXME copy this properly?
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

    @classmethod
    def parse(cls, spec):
        return [PDL(domain) for domain in spec['domains']]
