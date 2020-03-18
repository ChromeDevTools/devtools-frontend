#!/usr/bin/env python
# -*- coding: UTF-8 -*-
#
# Copyright 2016 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Builds applications in release mode:
- Concatenates autostart modules, application modules' module.json descriptors,
and the application loader into a single script.
- Builds app.html referencing the application script.
"""

from cStringIO import StringIO
from os import path
from os.path import join
import copy
import os
import re
import shutil
import sys
import subprocess

from modular_build import read_file, write_file, bail_error
import modular_build
import rjsmin
import special_case_namespaces

try:
    import simplejson as json
except ImportError:
    import json

try:
    original_sys_path = sys.path
    sys.path = sys.path + [path.join(os.path.dirname(os.path.realpath(__file__)), '..')]
    import devtools_paths
finally:
    sys.path = original_sys_path

FRONT_END_DIRECTORY = path.join(os.path.dirname(path.abspath(__file__)), '..', '..', 'front_end')

MODULE_LIST = [
    path.join(FRONT_END_DIRECTORY, subfolder, subfolder + '.js')
    for subfolder in os.listdir(FRONT_END_DIRECTORY)
    if path.isdir(os.path.join(FRONT_END_DIRECTORY, subfolder))
]

ROLLUP_ARGS = [
    '--no-treeshake', '--format', 'esm', '--context', 'self', '--external',
    ','.join([path.abspath(module) for module in MODULE_LIST])
]


def main(argv):
    try:
        input_path_flag_index = argv.index('--input_path')
        input_path = argv[input_path_flag_index + 1]
        output_path_flag_index = argv.index('--output_path')
        output_path = argv[output_path_flag_index + 1]
        application_names = argv[1:input_path_flag_index]
        use_rollup = '--rollup' in argv
    except:
        print('Usage: %s app_1 app_2 ... app_N --input_path <input_path> --output_path <output_path> --rollup true' % argv[0])
        raise

    loader = modular_build.DescriptorLoader(input_path)
    for app in application_names:
        descriptors = loader.load_application(app)
        builder = ReleaseBuilder(app, descriptors, input_path, output_path, use_rollup)
        builder.build_app()

    def copy_file(file_name):
        write_file(join(output_path, file_name), minify_js(read_file(join(input_path, file_name))))

    copy_file('root.js')
    copy_file('RuntimeInstantiator.js')



def resource_source_url(url):
    return '\n/*# sourceURL=' + url + ' */'


def minify_js(javascript):
    return rjsmin.jsmin(javascript)


def concatenated_module_filename(module_name, output_dir):
    return join(output_dir, module_name + '/' + module_name + '_module.js')


# Outputs:
#   <app_name>.html
#   <app_name>.js
#   <module_name>_module.js
class ReleaseBuilder(object):

    def __init__(self, application_name, descriptors, application_dir, output_dir, use_rollup):
        self.application_name = application_name
        self.descriptors = descriptors
        self.application_dir = application_dir
        self.output_dir = output_dir
        self.use_rollup = use_rollup
        self._special_case_namespaces = special_case_namespaces.special_case_namespaces

    def app_file(self, extension):
        return self.application_name + '.' + extension

    def autorun_resource_names(self):
        result = []
        for module in self.descriptors.sorted_modules():
            if self.descriptors.application[module].get('type') != 'autostart':
                continue

            resources = self.descriptors.modules[module].get('resources')
            if not resources:
                continue
            for resource_name in resources:
                result.append(path.join(module, resource_name))
        return result

    def build_app(self):
        if self.descriptors.has_html:
            html_entrypoint = self.app_file('html')
            write_file(join(self.output_dir, html_entrypoint), read_file(join(self.application_dir, html_entrypoint)))
        self._build_app_script()
        for module in filter(lambda desc: (not desc.get('type') or desc.get('type') == 'remote'),
                             self.descriptors.application.values()):
            self._concatenate_dynamic_module(module['name'])

    def _build_app_script(self):
        script_name = self.app_file('js')
        output = StringIO()
        self._concatenate_application_script(output)
        write_file(join(self.output_dir, script_name), minify_js(output.getvalue()))
        output.close()

    def _release_module_descriptors(self):
        module_descriptors = self.descriptors.modules
        result = []
        for name in module_descriptors:
            module = copy.copy(module_descriptors[name])
            module_type = self.descriptors.application[name].get('type')
            # Clear scripts, as they are not used at runtime
            # (only the fact of their presence is important).
            resources = module.get('resources', None)
            if module.get('scripts') or resources:
                if module_type == 'autostart':
                    # Autostart modules are already baked in.
                    del module['scripts']
                else:
                    # Non-autostart modules are vulcanized.
                    module['scripts'] = [name + '_module.js']
                    module['modules'] = module.get('modules', [])
            # Resources are already baked into scripts.
            if resources is not None:
                del module['resources']
            result.append(module)
        return json.dumps(result)

    def _write_module_resources(self, resource_names, output):
        for resource_name in resource_names:
            resource_name = path.normpath(resource_name).replace('\\', '/')
            output.write('self.Runtime.cachedResources["%s"] = "' % resource_name)
            resource_content = read_file(path.join(self.application_dir, resource_name))
            resource_content += resource_source_url(resource_name).encode('utf-8')
            resource_content = resource_content.replace('\\', '\\\\')
            resource_content = resource_content.replace('\n', '\\n')
            resource_content = resource_content.replace('"', '\\"')
            output.write(resource_content)
            output.write('";\n')

    def _concatenate_autostart_modules(self, output):
        non_autostart = set()
        sorted_module_names = self.descriptors.sorted_modules()
        for name in sorted_module_names:
            desc = self.descriptors.modules[name]
            name = desc['name']
            type = self.descriptors.application[name].get('type')
            if type == 'autostart':
                deps = set(desc.get('dependencies', []))
                non_autostart_deps = deps & non_autostart
                if len(non_autostart_deps):
                    bail_error(
                        'Non-autostart dependencies specified for the autostarted module "%s": %s' % (name, non_autostart_deps))
                self._rollup_module(name, desc.get('modules', []))
            else:
                non_autostart.add(name)

    def _concatenate_application_script(self, output):
        output.write('Root.allDescriptors.push(...%s);' % self._release_module_descriptors())
        if self.descriptors.extends:
            output.write('Root.applicationDescriptor.modules.push(...%s);' % json.dumps(self.descriptors.application.values()))
        else:
            output.write('Root.applicationDescriptor = %s;' % self.descriptors.application_json())

        output.write(minify_js(read_file(join(self.application_dir, self.app_file('js')))))
        self._concatenate_autostart_modules(output)

        self._write_module_resources(self.autorun_resource_names(), output)

    def _concatenate_dynamic_module(self, module_name):
        module = self.descriptors.modules[module_name]
        scripts = module.get('scripts')
        modules = module.get('modules')
        resources = self.descriptors.module_resources(module_name)
        module_dir = join(self.application_dir, module_name)
        output = StringIO()
        if scripts:
            modular_build.concatenate_scripts(scripts, module_dir, self.output_dir, output)
        if resources:
            self._write_module_resources(resources, output)
        if modules:
            self._rollup_module(module_name, modules)
        output_file_path = concatenated_module_filename(module_name, self.output_dir)
        write_file(output_file_path, minify_js(output.getvalue()))
        output.close()

    def _rollup_module(self, module_name, modules):
        js_entrypoint = join(self.application_dir, module_name, module_name + '.js')
        out = ''
        if self.use_rollup:
            rollup_process = subprocess.Popen(
                [devtools_paths.node_path(), devtools_paths.rollup_path()] + ROLLUP_ARGS + ['--input', js_entrypoint],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE)
            out, error = rollup_process.communicate()
        else:
            out = read_file(js_entrypoint)
        write_file(join(self.output_dir, module_name, module_name + '.js'), minify_js(out))

        legacyFileName = module_name + '-legacy.js'
        if legacyFileName in modules:
            write_file(
                join(self.output_dir, module_name, legacyFileName),
                minify_js(read_file(join(self.application_dir, module_name, legacyFileName))))


if __name__ == '__main__':
    sys.exit(main(sys.argv))
