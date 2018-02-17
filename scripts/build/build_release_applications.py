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

from modular_build import read_file, write_file, bail_error
import modular_build
import rjsmin

try:
    import simplejson as json
except ImportError:
    import json

special_case_namespaces_path = path.join(path.dirname(path.dirname(path.abspath(__file__))), 'special_case_namespaces.json')


def main(argv):
    try:
        input_path_flag_index = argv.index('--input_path')
        input_path = argv[input_path_flag_index + 1]
        output_path_flag_index = argv.index('--output_path')
        output_path = argv[output_path_flag_index + 1]
        application_names = argv[1:input_path_flag_index]
    except:
        print('Usage: %s app_1 app_2 ... app_N --input_path <input_path> --output_path <output_path>' % argv[0])
        raise

    loader = modular_build.DescriptorLoader(input_path)
    for app in application_names:
        descriptors = loader.load_application(app)
        builder = ReleaseBuilder(app, descriptors, input_path, output_path)
        builder.build_app()


def resource_source_url(url):
    return '\n/*# sourceURL=' + url + ' */'


def minify_js(javascript):
    return rjsmin.jsmin(javascript)


def concatenated_module_filename(module_name, output_dir):
    return join(output_dir, module_name + '/' + module_name + '_module.js')


def symlink_or_copy_file(src, dest, safe=False):
    if safe and path.exists(dest):
        os.remove(dest)
    if hasattr(os, 'symlink'):
        os.symlink(src, dest)
    else:
        shutil.copy(src, dest)


def symlink_or_copy_dir(src, dest):
    if path.exists(dest):
        shutil.rmtree(dest)
    for src_dir, dirs, files in os.walk(src):
        subpath = path.relpath(src_dir, src)
        dest_dir = path.normpath(join(dest, subpath))
        os.mkdir(dest_dir)
        for name in files:
            src_name = join(os.getcwd(), src_dir, name)
            dest_name = join(dest_dir, name)
            symlink_or_copy_file(src_name, dest_name)


# Outputs:
#   <app_name>.html
#   <app_name>.js
#   <module_name>_module.js
class ReleaseBuilder(object):

    def __init__(self, application_name, descriptors, application_dir, output_dir):
        self.application_name = application_name
        self.descriptors = descriptors
        self.application_dir = application_dir
        self.output_dir = output_dir
        with open(special_case_namespaces_path) as json_file:
            self._special_case_namespaces = json.load(json_file)

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
            self._build_html()
        self._build_app_script()
        for module in filter(lambda desc: (not desc.get('type') or desc.get('type') == 'remote'),
                             self.descriptors.application.values()):
            self._concatenate_dynamic_module(module['name'])

    def _write_include_tags(self, descriptors, output):
        if descriptors.extends:
            self._write_include_tags(descriptors.extends, output)
        output.write(self._generate_include_tag(descriptors.application_name + '.js'))


    def _build_html(self):
        html_name = self.app_file('html')
        output = StringIO()
        with open(join(self.application_dir, html_name), 'r') as app_input_html:
            for line in app_input_html:
                if '<script ' in line or '<link ' in line:
                    continue
                if '</head>' in line:
                    self._write_include_tags(self.descriptors, output)
                    js_file = join(self.application_dir, self.app_file('js'))
                    if path.exists(js_file):
                        output.write('    <script>%s</script>\n' % minify_js(read_file(js_file)))
                output.write(line)

        write_file(join(self.output_dir, html_name), output.getvalue())
        output.close()

    def _build_app_script(self):
        script_name = self.app_file('js')
        output = StringIO()
        self._concatenate_application_script(output)
        write_file(join(self.output_dir, script_name), minify_js(output.getvalue()))
        output.close()

    def _generate_include_tag(self, resource_path):
        if resource_path.endswith('.js'):
            return '    <script type="text/javascript" src="%s"></script>\n' % resource_path
        else:
            assert resource_path

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
            # Resources are already baked into scripts.
            if resources is not None:
                del module['resources']
            result.append(module)
        return json.dumps(result)

    def _write_module_resources(self, resource_names, output):
        for resource_name in resource_names:
            resource_name = path.normpath(resource_name).replace('\\', '/')
            output.write('Runtime.cachedResources["%s"] = "' % resource_name)
            resource_content = read_file(path.join(self.application_dir, resource_name)) + resource_source_url(resource_name)
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
                    bail_error('Non-autostart dependencies specified for the autostarted module "%s": %s' %
                               (name, non_autostart_deps))
                namespace = self._map_module_to_namespace(name)
                output.write('\n/* Module %s */\n' % name)
                output.write('\nself[\'%s\'] = self[\'%s\'] || {};\n' % (namespace, namespace))
                modular_build.concatenate_scripts(desc.get('scripts'), join(self.application_dir, name), self.output_dir, output)
            else:
                non_autostart.add(name)

    def _map_module_to_namespace(self, module):
        camel_case_namespace = "".join(map(lambda x: x[0].upper() + x[1:], module.split('_')))
        return self._special_case_namespaces.get(module, camel_case_namespace)

    def _concatenate_application_script(self, output):
        if not self.descriptors.extends:
            runtime_contents = read_file(join(self.application_dir, 'Runtime.js'))
            output.write('/* Runtime.js */\n')
            output.write(runtime_contents)
            output.write('allDescriptors.push(...%s);' % self._release_module_descriptors())
            output.write('/* Application descriptor %s */\n' % self.app_file('json'))
            output.write('applicationDescriptor = ')
            output.write(self.descriptors.application_json())
        else:
            output.write('/* Additional descriptors */\n')
            output.write('allDescriptors.push(...%s);' % self._release_module_descriptors())
            output.write('/* Additional descriptors %s */\n' % self.app_file('json'))
            output.write('applicationDescriptor.modules.push(...%s)' % json.dumps(self.descriptors.application.values()))

        output.write('\n/* Autostart modules */\n')
        self._concatenate_autostart_modules(output)
        output.write(';\n/* Autostart resources */\n')
        self._write_module_resources(self.autorun_resource_names(), output)
        if not self.descriptors.has_html:
            js_file = join(self.application_dir, self.app_file('js'))
            if path.exists(js_file):
                output.write(';\n/* Autostart script for worker */\n')
                output.write(read_file(js_file))

    def _concatenate_dynamic_module(self, module_name):
        module = self.descriptors.modules[module_name]
        scripts = module.get('scripts')
        resources = self.descriptors.module_resources(module_name)
        module_dir = join(self.application_dir, module_name)
        output = StringIO()
        if scripts:
            modular_build.concatenate_scripts(scripts, module_dir, self.output_dir, output)
        if resources:
            self._write_module_resources(resources, output)
        output_file_path = concatenated_module_filename(module_name, self.output_dir)
        write_file(output_file_path, minify_js(output.getvalue()))
        output.close()


if __name__ == '__main__':
    sys.exit(main(sys.argv))
