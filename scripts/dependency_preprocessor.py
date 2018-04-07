# Copyright 2016 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""
This ensures that each front-end module does not accidentally rely on a module
that isn't listed as a transitive dependency in the module.json.

How this works:
1. Renames any potential undeclared namespace usage across the entire front-end code
(e.g. identifiers, strings) into e.g. "$$UndeclaredDependency_SDK$$.Foo".
2. Closure Compiler catches any illegal usage and safely ignores coincidental
usages (e.g. "Console.Foo" in a string).
"""

import codecs
import multiprocessing
from os import path
import re
import shutil

try:
    import simplejson as json
except ImportError:
    import json

special_case_namespaces_path = path.join(path.dirname(path.abspath(__file__)), 'special_case_namespaces.json')


class DependencyPreprocessor(object):

    def __init__(self, descriptors, temp_frontend_path, devtools_frontend_path):
        self.descriptors = descriptors
        self.temp_frontend_path = temp_frontend_path
        self.module_descriptors = descriptors.modules
        self.modules = set(self.descriptors.sorted_modules())
        shutil.copytree(devtools_frontend_path, self.temp_frontend_path)
        with open(special_case_namespaces_path) as json_file:
            self._special_case_namespaces = json.load(json_file)

    def enforce_dependencies(self):
        arg_list = []
        for module in self.modules:
            dependencies = set(self.descriptors.sorted_dependencies_closure(module))
            excluded_modules = self.modules - {module} - dependencies
            excluded_namespaces = [self._map_module_to_namespace(m) for m in excluded_modules]
            file_paths = [
                path.join(self.temp_frontend_path, module, file_name)
                for file_name in self.descriptors.module_compiled_files(module)
            ]
            arg = {
                'excluded_namespaces': excluded_namespaces,
                'file_paths': file_paths,
            }
            arg_list.append(arg)
        parallelize(poison_module, arg_list)

    def _map_module_to_namespace(self, module):
        return self._special_case_namespaces.get(module, self._to_camel_case(module))

    def _to_camel_case(self, snake_string):
        components = snake_string.split('_')
        return ''.join(x.title() for x in components)


def poison_module(target):
    excluded_namespaces = target['excluded_namespaces']
    file_paths = target['file_paths']
    for file_path in file_paths:
        with codecs.open(file_path, 'r', 'utf-8') as file:
            file_contents = file.read()
        file_contents = poison_contents_for_namespaces(file_contents, excluded_namespaces)
        with codecs.open(file_path, 'w', 'utf-8') as file:
            file.write(file_contents)


def poison_contents_for_namespaces(file_contents, namespaces):
    # Technically, should be [^.]\s*\b + NAMESPACES + \b\s*[^:]
    # but we rely on clang-format to format like this:
    #   SomeModule
    #     .Console
    regex = r'([^.]\b)(' + '|'.join(namespaces) + r')(\b[^:])'
    replace = r'\1$$UndeclaredDependency_\2$$\3'
    return re.sub(regex, replace, file_contents)


def parallelize(fn, arg_list):
    number_of_processes = min(multiprocessing.cpu_count(), 8)
    pool = multiprocessing.Pool(number_of_processes)
    pool.map(fn, arg_list)
    pool.close()
    pool.join()
