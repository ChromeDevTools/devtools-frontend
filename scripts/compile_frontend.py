#!/usr/bin/env python
# Copyright (c) 2012 Google Inc. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#
#     * Redistributions of source code must retain the above copyright
# notice, this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above
# copyright notice, this list of conditions and the following disclaimer
# in the documentation and/or other materials provided with the
# distribution.
#     * Neither the name of Google Inc. nor the names of its
# contributors may be used to endorse or promote products derived from
# this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
# A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
# DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
# THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

import argparse
import os
import os.path as path
import re
import shutil
import subprocess
import sys
import tempfile

from build import modular_build
from build import generate_protocol_externs

import dependency_preprocessor
import utils

try:
    import simplejson as json
except ImportError:
    import json

is_cygwin = sys.platform == 'cygwin'


def popen(arguments):
    return subprocess.Popen(arguments, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


def to_platform_path(filepath):
    if not is_cygwin:
        return filepath
    return re.sub(r'^/cygdrive/(\w)', '\\1:', filepath)


def to_platform_path_exact(filepath):
    if not is_cygwin:
        return filepath
    output, _ = popen(['cygpath', '-w', filepath]).communicate()
    # pylint: disable=E1103
    return output.strip().replace('\\', '\\\\')


scripts_path = path.dirname(path.abspath(__file__))
devtools_path = path.dirname(scripts_path)
inspector_path = path.join(path.dirname(devtools_path), 'core', 'inspector')
# TODO(dgozman): move these checks to v8.
v8_inspector_path = path.normpath(path.join(path.dirname(devtools_path), os.pardir, os.pardir, os.pardir, 'v8', 'src', 'inspector'))
devtools_frontend_path = path.join(devtools_path, 'front_end')
global_externs_file = to_platform_path(path.join(devtools_frontend_path, 'externs.js'))
protocol_externs_file = path.join(devtools_frontend_path, 'protocol_externs.js')
runtime_file = to_platform_path(path.join(devtools_frontend_path, 'Runtime.js'))

closure_compiler_jar = to_platform_path(path.join(scripts_path, 'closure', 'compiler.jar'))
closure_runner_jar = to_platform_path(path.join(scripts_path, 'closure', 'closure_runner', 'closure_runner.jar'))
jsdoc_validator_jar = to_platform_path(path.join(scripts_path, 'jsdoc_validator', 'jsdoc_validator.jar'))

type_checked_jsdoc_tags_list = ['param', 'return', 'type', 'enum']
type_checked_jsdoc_tags_or = '|'.join(type_checked_jsdoc_tags_list)

# Basic regex for invalid JsDoc types: an object type name ([A-Z][_A-Za-z0-9.]+[A-Za-z0-9]) not preceded by '!', '?', ':' (this, new), or '.' (object property).
invalid_type_regex = re.compile(r'@(?:' + type_checked_jsdoc_tags_or +
                                r')\s*\{.*(?<![!?:._A-Za-z0-9])([A-Z][_A-Za-z0-9.]+[A-Za-z0-9])[^/]*\}')
invalid_type_designator_regex = re.compile(r'@(?:' + type_checked_jsdoc_tags_or + r')\s*.*(?<![{: ])([?!])=?\}')
invalid_non_object_type_regex = re.compile(r'@(?:' + type_checked_jsdoc_tags_or + r')\s*\{.*(![a-z]+)[^/]*\}')
error_warning_regex = re.compile(r'WARNING|ERROR')
loaded_css_regex = re.compile(r'(?:registerRequiredCSS|WebInspector\.View\.createStyleElement)\s*\(\s*"(.+)"\s*\)')

java_build_regex = re.compile(r'\w+ version "(\d+)\.(\d+)')


def log_error(message):
    print 'ERROR: ' + message


def error_excepthook(exctype, value, traceback):
    print 'ERROR:'
    sys.__excepthook__(exctype, value, traceback)


sys.excepthook = error_excepthook

application_descriptors = [
    'inspector.json',
    'toolbox.json',
    'integration_test_runner.json',
    'formatter_worker.json',
    'heap_snapshot_worker.json',
]

skipped_namespaces = {
    'Console',  # Closure uses Console as a namespace item so we cannot override it right now.
    'Gonzales',  # third party module defined in front_end/externs.js
    'Terminal',  # third party module defined in front_end/externs.js
}


def has_errors(output):
    return re.search(error_warning_regex, output) != None


class JSDocChecker:

    def __init__(self, descriptors, java_exec):
        self._error_found = False
        self._all_files = descriptors.all_compiled_files()
        self._java_exec = java_exec

    def check(self):
        print 'Verifying JSDoc comments...'
        self._verify_jsdoc()
        self._run_jsdoc_validator()
        return self._error_found

    def _run_jsdoc_validator(self):
        files = [to_platform_path(f) for f in self._all_files]
        file_list = tempfile.NamedTemporaryFile(mode='wt', delete=False)
        try:
            file_list.write('\n'.join(files))
        finally:
            file_list.close()
        proc = popen(self._java_exec + ['-jar', jsdoc_validator_jar, '--files-list-name', to_platform_path_exact(file_list.name)])
        (out, _) = proc.communicate()
        if out:
            print('JSDoc validator output:%s%s' % (os.linesep, out))
            self._error_found = True
        os.remove(file_list.name)

    def _verify_jsdoc(self):
        for full_file_name in self._all_files:
            line_index = 0
            with open(full_file_name, 'r') as sourceFile:
                for line in sourceFile:
                    line_index += 1
                    if line.rstrip():
                        self._verify_jsdoc_line(full_file_name, line_index, line)

    def _verify_jsdoc_line(self, file_name, line_index, line):

        def print_error(message, error_position):
            print '%s:%s: ERROR - %s%s%s%s%s%s' % (file_name, line_index, message, os.linesep, line, os.linesep,
                                                   ' ' * error_position + '^', os.linesep)

        known_css = {}
        match = re.search(invalid_type_regex, line)
        if match:
            print_error('Type "%s" nullability not marked explicitly with "?" (nullable) or "!" (non-nullable)' % match.group(1),
                        match.start(1))
            self._error_found = True

        match = re.search(invalid_non_object_type_regex, line)
        if match:
            print_error('Non-object type explicitly marked with "!" (non-nullable), which is the default and should be omitted',
                        match.start(1))
            self._error_found = True

        match = re.search(invalid_type_designator_regex, line)
        if match:
            print_error('Type nullability indicator misplaced, should precede type', match.start(1))
            self._error_found = True

        match = re.search(loaded_css_regex, line)
        if match:
            file = path.join(devtools_frontend_path, match.group(1))
            exists = known_css.get(file)
            if exists is None:
                exists = path.isfile(file)
                known_css[file] = exists
            if not exists:
                print_error('Dynamically loaded CSS stylesheet is missing in the source tree', match.start(1))
                self._error_found = True


def find_java():
    required_major = 1
    required_minor = 7
    exec_command = None
    has_server_jvm = True
    java_path = utils.which('java')

    if not java_path:
        print 'NOTE: No Java executable found in $PATH.'
        sys.exit(1)

    is_ok = False
    java_version_out, _ = popen([java_path, '-version']).communicate()
    # pylint: disable=E1103
    match = re.search(java_build_regex, java_version_out)
    if match:
        major = int(match.group(1))
        minor = int(match.group(2))
        is_ok = major >= required_major and minor >= required_minor
    if is_ok:
        exec_command = [java_path, '-Xms1024m', '-server', '-XX:+TieredCompilation']
        check_server_proc = popen(exec_command + ['-version'])
        check_server_proc.communicate()
        if check_server_proc.returncode != 0:
            # Not all Java installs have server JVMs.
            exec_command = exec_command.remove('-server')
            has_server_jvm = False

    if not is_ok:
        print 'NOTE: Java executable version %d.%d or above not found in $PATH.' % (required_major, required_minor)
        sys.exit(1)
    print 'Java executable: %s%s' % (java_path, '' if has_server_jvm else ' (no server JVM)')
    return exec_command


common_closure_args = [
    '--summary_detail_level',
    '3',
    '--jscomp_error',
    'visibility',
    '--jscomp_warning',
    'missingOverride',
    '--compilation_level',
    'SIMPLE_OPTIMIZATIONS',
    '--warning_level',
    'VERBOSE',
    '--language_in=ECMASCRIPT_NEXT',
    '--language_out=ES5_STRICT',
    '--extra_annotation_name',
    'suppressReceiverCheck',
    '--extra_annotation_name',
    'suppressGlobalPropertiesCheck',
    '--checks-only',
]


def check_conditional_dependencies(modules_by_name):
    errors_found = False
    for name in modules_by_name:
        if 'test_runner' in name:
            continue
        for dep_name in modules_by_name[name].get('dependencies', []):
            dependency = modules_by_name[dep_name]
            if dependency.get('experiment') or dependency.get('condition'):
                log_error('Module "%s" may not depend on the conditional module "%s"' % (name, dep_name))
                errors_found = True
    return errors_found


def prepare_closure_frontend_compile(temp_devtools_path, descriptors, namespace_externs_path):
    temp_frontend_path = path.join(temp_devtools_path, 'front_end')
    checker = dependency_preprocessor.DependencyPreprocessor(descriptors, temp_frontend_path, devtools_frontend_path)
    checker.enforce_dependencies()

    command = common_closure_args + [
        '--externs',
        to_platform_path(global_externs_file),
        '--externs',
        namespace_externs_path,
        '--js',
        runtime_file,
    ]

    all_files = descriptors.all_compiled_files()
    args = []
    for file in all_files:
        args.extend(['--js', file])
        if "InspectorBackend.js" in file:
            args.extend(['--js', protocol_externs_file])
    command += args
    command = [arg.replace(devtools_frontend_path, temp_frontend_path) for arg in command]
    compiler_args_file = tempfile.NamedTemporaryFile(mode='wt', delete=False)
    try:
        compiler_args_file.write('devtools_frontend %s' % (' '.join(command)))
    finally:
        compiler_args_file.close()
    return compiler_args_file.name


def generate_namespace_externs(modules_by_name):
    special_case_namespaces_path = path.join(path.dirname(path.abspath(__file__)), 'special_case_namespaces.json')
    with open(special_case_namespaces_path) as json_file:
        special_case_namespaces = json.load(json_file)

    def map_module_to_namespace(module):
        return special_case_namespaces.get(module, to_camel_case(module))

    def to_camel_case(snake_string):
        components = snake_string.split('_')
        return ''.join(x.title() for x in components)

    all_namespaces = [map_module_to_namespace(module) for module in modules_by_name]
    namespaces = [namespace for namespace in all_namespaces if namespace not in skipped_namespaces]
    namespaces.sort()
    namespace_externs_file = tempfile.NamedTemporaryFile(mode='wt', delete=False)
    try:
        for namespace in namespaces:
            namespace_externs_file.write('/** @const */\n')
            namespace_externs_file.write('var %s = {};\n' % namespace)
    finally:
        namespace_externs_file.close()
    namespace_externs_path = to_platform_path(namespace_externs_file.name)
    return namespace_externs_path


def main():
    global protocol_externs_file
    errors_found = False
    parser = argparse.ArgumentParser()
    parser.add_argument('--protocol-externs-file')
    args, _ = parser.parse_known_args()
    if args.protocol_externs_file:
        protocol_externs_file = args.protocol_externs_file
    else:
        generate_protocol_externs.generate_protocol_externs(protocol_externs_file,
                                                            path.join(inspector_path, 'browser_protocol.json'),
                                                            path.join(v8_inspector_path, 'js_protocol.json'))
    loader = modular_build.DescriptorLoader(devtools_frontend_path)
    descriptors = loader.load_applications(application_descriptors)
    modules_by_name = descriptors.modules

    java_exec = find_java()
    errors_found |= check_conditional_dependencies(modules_by_name)

    print 'Compiling frontend...'
    temp_devtools_path = tempfile.mkdtemp()
    namespace_externs_path = generate_namespace_externs(modules_by_name)
    compiler_args_file_path = prepare_closure_frontend_compile(temp_devtools_path, descriptors, namespace_externs_path)
    frontend_compile_proc = popen(
        java_exec + ['-jar', closure_runner_jar, '--compiler-args-file', to_platform_path_exact(compiler_args_file_path)])

    print 'Compiling devtools_compatibility.js...'

    closure_compiler_command = java_exec + ['-jar', closure_compiler_jar] + common_closure_args

    devtools_js_compile_command = closure_compiler_command + [
        '--externs', to_platform_path(global_externs_file), '--externs',
        to_platform_path(path.join(devtools_frontend_path, 'host', 'InspectorFrontendHostAPI.js')),
        '--jscomp_off=externsValidation', '--js', to_platform_path(path.join(devtools_frontend_path, 'devtools_compatibility.js'))
    ]
    devtools_js_compile_proc = popen(devtools_js_compile_command)

    errors_found |= JSDocChecker(descriptors, java_exec).check()

    (devtools_js_compile_out, _) = devtools_js_compile_proc.communicate()
    print 'devtools_compatibility.js compilation output:%s' % os.linesep, devtools_js_compile_out
    errors_found |= has_errors(devtools_js_compile_out)

    (frontend_compile_out, _) = frontend_compile_proc.communicate()
    print 'devtools frontend compilation output:'
    for line in frontend_compile_out.splitlines():
        if "@@ START_MODULE" in line or "@@ END_MODULE" in line:
            continue
        print line
    errors_found |= has_errors(frontend_compile_out)

    os.remove(protocol_externs_file)
    os.remove(namespace_externs_path)
    os.remove(compiler_args_file_path)
    shutil.rmtree(temp_devtools_path, True)

    if errors_found:
        print 'ERRORS DETECTED'
        sys.exit(1)
    print 'DONE - compiled without errors'


if __name__ == "__main__":
    main()
