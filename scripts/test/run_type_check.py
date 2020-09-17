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
# 'AS IS' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
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
from os import path
import re
import shutil
import subprocess
import sys
import tempfile

SCRIPTS_PATH = path.dirname(path.dirname(path.abspath(__file__)))
sys.path.append(SCRIPTS_PATH)

from build import dependency_preprocessor
from build import generate_protocol_externs
from build import modular_build
from build import special_case_namespaces

import devtools_paths

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


DEVTOOLS_PATH = devtools_paths.devtools_root_path()
SCRIPTS_PATH = path.join(DEVTOOLS_PATH, 'scripts')
ROOT_PATH = devtools_paths.root_path()
BROWSER_PROTOCOL_PATH = devtools_paths.browser_protocol_path()
# TODO(dgozman): move these checks to v8.
JS_PROTOCOL_PATH = path.join(ROOT_PATH, 'v8', 'include', 'js_protocol.pdl')
DEVTOOLS_FRONTEND_PATH = path.join(DEVTOOLS_PATH, 'front_end')
GLOBAL_EXTERNS_FILE = to_platform_path(path.join(DEVTOOLS_FRONTEND_PATH, 'externs.js'))
DEFAULT_PROTOCOL_EXTERNS_FILE = path.join(DEVTOOLS_FRONTEND_PATH, 'protocol_externs.js')
RUNTIME_FILE = to_platform_path(path.join(DEVTOOLS_FRONTEND_PATH, 'RuntimeInstantiator.js'))
ROOT_MODULE_FILE = to_platform_path(path.join(DEVTOOLS_FRONTEND_PATH, 'root.js'))

CLOSURE_COMPILER_JAR = to_platform_path(path.join(SCRIPTS_PATH, 'closure', 'compiler.jar'))
CLOSURE_RUNNER_JAR = to_platform_path(path.join(SCRIPTS_PATH, 'closure', 'closure_runner', 'closure_runner.jar'))
JSDOC_VALIDATOR_JAR = to_platform_path(path.join(SCRIPTS_PATH, 'jsdoc_validator', 'jsdoc_validator.jar'))

TYPE_CHECKED_JSDOC_TAGS_LIST = ['param', 'return', 'type', 'enum']
TYPE_CHECKED_JSDOC_TAGS_OR = '|'.join(TYPE_CHECKED_JSDOC_TAGS_LIST)

# Basic regex for invalid JsDoc types: an object type name ([A-Z][_A-Za-z0-9.]+[A-Za-z0-9]) not preceded by '!', '?', ':' (this, new), or '.' (object property).
INVALID_TYPE_REGEX = re.compile(r'@(?:' + TYPE_CHECKED_JSDOC_TAGS_OR +
                                r')\s*\{.*(?<![!?:._A-Za-z0-9])([A-Z][_A-Za-z0-9.]+[A-Za-z0-9])[^/]*\}')
INVALID_TYPE_DESIGNATOR_REGEX = re.compile(r'@(?:' + TYPE_CHECKED_JSDOC_TAGS_OR + r')\s*.*(?<![{: ])([?!])=?\}')
INVALID_NON_OBJECT_TYPE_REGEX = re.compile(r'@(?:' + TYPE_CHECKED_JSDOC_TAGS_OR + r')\s*\{.*(![a-z]+)[^/]*\}')
ERROR_WARNING_REGEX = re.compile(r'WARNING|ERROR')
LOADED_CSS_REGEX = re.compile(r'(?:registerRequiredCSS|WebInspector\.View\.createStyleElement)\s*\(\s*"(.+)"\s*\)')

JAVA_BUILD_REGEX = re.compile(r'\w+ version "(\d+)\.(\d+)')

def log_error(message):
    print 'ERROR: ' + message


def error_excepthook(exctype, value, traceback):
    print 'ERROR:'
    sys.__excepthook__(exctype, value, traceback)


sys.excepthook = error_excepthook

APPLICATION_DESCRIPTORS = [
    'inspector',
    'toolbox',
    'integration_test_runner',
    'heap_snapshot_worker_entrypoint',
]

SKIPPED_NAMESPACES = {
    'Console',  # Closure uses Console as a namespace item so we cannot override it right now.
    'Gonzales',  # third party module defined in front_end/externs.js
    'Terminal',  # third party module defined in front_end/externs.js
}


def has_errors(output):
    return re.search(ERROR_WARNING_REGEX, output) is not None


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
        proc = popen(self._java_exec + ['-jar', JSDOC_VALIDATOR_JAR, '--files-list-name', to_platform_path_exact(file_list.name)])
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
        match = re.search(INVALID_TYPE_REGEX, line)
        if match:
            problematic_type = match.group(1)
            start_line = match.start(1)
            # `typeof Type` is allowed and should not be marked with nulllable
            match = re.search(re.compile('typeof %s' % problematic_type), line)
            if not match:
                print_error(
                    'Type "%s" nullability not marked explicitly with "?" (nullable) or "!" (non-nullable)'
                    % problematic_type, start_line)
                self._error_found = True

        match = re.search(INVALID_NON_OBJECT_TYPE_REGEX, line)
        if match:
            print_error('Non-object type explicitly marked with "!" (non-nullable), which is the default and should be omitted',
                        match.start(1))
            self._error_found = True

        match = re.search(INVALID_TYPE_DESIGNATOR_REGEX, line)
        if match:
            print_error('Type nullability indicator misplaced, should precede type', match.start(1))
            self._error_found = True

        match = re.search(LOADED_CSS_REGEX, line)
        if match:
            css_file = path.join(DEVTOOLS_FRONTEND_PATH, match.group(1))
            exists = known_css.get(css_file)
            if exists is None:
                exists = path.isfile(css_file)
                known_css[css_file] = exists
            if not exists:
                print_error('Dynamically loaded CSS stylesheet is missing in the source tree', match.start(1))
                self._error_found = True


def find_java():
    # Based on http://stackoverflow.com/questions/377017/test-if-executable-exists-in-python.
    def which(program):
        def is_executable(fpath):
            return path.isfile(fpath) and os.access(fpath, os.X_OK)

        fpath, fname = path.split(program)
        if fpath:
            if is_executable(program):
                return program
            return None
        env_paths = os.environ["PATH"].split(os.pathsep)
        if sys.platform == "win32":
            env_paths = get_windows_path(env_paths)
        for part in env_paths:
            part = part.strip('\"')
            file = path.join(part, program)
            if is_executable(file):
                return file
            if sys.platform == "win32" and not file.endswith(".exe"):
                file_exe = file + ".exe"
                if is_executable(file_exe):
                    return file_exe
        return None

    # Use to find 64-bit programs (e.g. Java) when using 32-bit python in Windows
    def get_windows_path(env_paths):
        new_env_paths = env_paths[:]
        for env_path in env_paths:
            env_path = env_path.lower()
            if "system32" in env_path:
                new_env_paths.append(env_path.replace("system32", "sysnative"))
        return new_env_paths

    required_major = 1
    required_minor = 7
    exec_command = None
    has_server_jvm = True
    java_path = which('java')

    if not java_path:
        print 'NOTE: No Java executable found in $PATH.'
        sys.exit(1)

    is_ok = False
    java_version_out, _ = popen([java_path, '-version']).communicate()
    # pylint: disable=E1103
    match = re.search(JAVA_BUILD_REGEX, java_version_out)
    if match:
        major = int(match.group(1))
        minor = int(match.group(2))
        is_ok = major > required_major or major == required_major and minor >= required_minor
    if is_ok:
        exec_command = [java_path, '-Xms1024m', '-server', '-XX:+TieredCompilation']
        check_server_proc = popen(exec_command + ['-version'])
        check_server_proc.communicate()
        if check_server_proc.returncode != 0:
            # Not all Java installs have server JVMs.
            exec_command.remove('-server')
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
    '--language_out=ECMASCRIPT_NEXT',
    '--extra_annotation_name',
    'suppressReceiverCheck',
    '--extra_annotation_name',
    'suppressGlobalPropertiesCheck',
    '--checks-only',
    # Bounded Generics should be supported (https://github.com/google/closure-compiler/wiki/Generic-Types#declaring-a-bounded-generic-type)
    # however, when running it against the source code it throws an error. Here
    # we switch off compilation of bounded generics for Closure Compiler (though
    # TypeScript Compiler understands them, which is handy) and hide warnings for
    # files which make use of them.
    '--jscomp_off',
    'boundedGenerics',
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


def prepare_closure_frontend_compile(temp_devtools_path, descriptors, namespace_externs_path, protocol_externs_file):
    temp_frontend_path = path.join(temp_devtools_path, 'front_end')
    checker = dependency_preprocessor.DependencyPreprocessor(descriptors, temp_frontend_path, DEVTOOLS_FRONTEND_PATH)

    command = common_closure_args + [
        '--externs',
        to_platform_path(GLOBAL_EXTERNS_FILE),
        '--externs',
        namespace_externs_path,
        '--js',
        RUNTIME_FILE,
        '--js',
        ROOT_MODULE_FILE,
    ]

    all_files = descriptors.all_compiled_files()
    args = []

    # Closure Compiler currently doesn't understand Bounded Generics (see common
    # args comment above), and the files listed below make use of them so we hide
    # warnings for those files.
    bounded_generics = [
        'SourceMapManager.js',
        'CSSWorkspaceBinding.js',
        'SASSSourceMapping.js',
    ]

    for file in bounded_generics:
        args.extend(['--hide_warnings_for', file])

    for file in all_files:
        args.extend(['--js', file])
        if 'InspectorBackend.js' in file:
            args.extend(['--js', protocol_externs_file])


        if file.endswith('_bridge.js'):
            generated_file = path.join(temp_frontend_path, path.relpath(file, DEVTOOLS_FRONTEND_PATH).replace('_bridge.js', '.js'))
            modular_build.write_file(generated_file, '')
            args.extend(['--js', generated_file])

    for file in descriptors.all_skipped_compilation_files():
        # Write a dummy file for skipped compilation files that are autogenerated.
        # We don't type-check this file, but we import them via ES modules
        generated_file = path.normpath(path.join(temp_frontend_path, file))
        if not generated_file in args:
            modular_build.write_file(generated_file, '')
            if os.path.basename(generated_file) in [
                    'acorn-logical-assignment.mjs',
                    'acorn-loose.mjs',
                    'acorn-numeric-separator.mjs',
                    'acorn.mjs',
                    'ClientVariations.js',
                    'i18n.js',
                    'marked.esm.js',
                    'wasm_source_map.js',
            ]:
                with open(
                        generated_file.replace('.js', '_types.js').replace(
                            '.mjs', '_types.mjs')) as f:
                    modular_build.write_file(generated_file, f.read())
            args.extend(['--js', generated_file])

    command += args
    command = [arg.replace(DEVTOOLS_FRONTEND_PATH, temp_frontend_path) for arg in command]
    compiler_args_file = tempfile.NamedTemporaryFile(mode='wt', delete=False)
    try:
        compiler_args_file.write('devtools_frontend %s' % (' '.join(command)))
    finally:
        compiler_args_file.close()
    return compiler_args_file.name


def generate_namespace_externs(modules_by_name):

    def map_module_to_namespace(module):
        return special_case_namespaces.special_case_namespaces.get(module, to_camel_case(module))

    def to_camel_case(snake_string):
        components = snake_string.split('_')
        return ''.join(x.title() for x in components)

    all_namespaces = [map_module_to_namespace(module) for module in modules_by_name]
    namespaces = [namespace for namespace in all_namespaces if namespace not in SKIPPED_NAMESPACES]
    namespaces.sort()
    namespace_externs_file = tempfile.NamedTemporaryFile(mode='wt', delete=False)
    try:
        namespace_externs_file.write('var Protocol = {};\n')
        namespace_externs_file.write('var Root = {};\n')
        namespace_externs_file.write('var Runtime = {};\n')
        for namespace in namespaces:
            namespace_externs_file.write('var %s = {};\n' % namespace)
    finally:
        namespace_externs_file.close()
    namespace_externs_path = to_platform_path(namespace_externs_file.name)
    return namespace_externs_path


def main():
    protocol_externs_file = DEFAULT_PROTOCOL_EXTERNS_FILE
    errors_found = False
    parser = argparse.ArgumentParser()
    parser.add_argument('--protocol-externs-file')
    args, _ = parser.parse_known_args()
    if args.protocol_externs_file:
        protocol_externs_file = args.protocol_externs_file
    else:
        generate_protocol_externs.generate_protocol_externs(protocol_externs_file, BROWSER_PROTOCOL_PATH, JS_PROTOCOL_PATH)
    loader = modular_build.DescriptorLoader(DEVTOOLS_FRONTEND_PATH)
    descriptors = loader.load_applications(APPLICATION_DESCRIPTORS)
    modules_by_name = descriptors.modules

    java_exec = find_java()
    errors_found |= check_conditional_dependencies(modules_by_name)

    print 'Compiling frontend...'
    temp_devtools_path = tempfile.mkdtemp()
    namespace_externs_path = generate_namespace_externs(modules_by_name)
    compiler_args_file_path = prepare_closure_frontend_compile(temp_devtools_path, descriptors, namespace_externs_path,
                                                               protocol_externs_file)
    frontend_compile_proc = popen(
        java_exec + ['-jar', CLOSURE_RUNNER_JAR, '--compiler-args-file',
                     to_platform_path_exact(compiler_args_file_path)])

    print 'Compiling devtools_compatibility.js...'

    closure_compiler_command = java_exec + ['-jar', CLOSURE_COMPILER_JAR] + common_closure_args

    devtools_js_compile_command = closure_compiler_command + [
        '--externs',
        to_platform_path(GLOBAL_EXTERNS_FILE), '--jscomp_off=externsValidation', '--js',
        to_platform_path(path.join(DEVTOOLS_FRONTEND_PATH, 'devtools_compatibility.js'))
    ]
    devtools_js_compile_proc = popen(devtools_js_compile_command)

    errors_found |= JSDocChecker(descriptors, java_exec).check()

    (devtools_js_compile_out, _) = devtools_js_compile_proc.communicate()
    print 'devtools_compatibility.js compilation output:%s' % os.linesep, devtools_js_compile_out
    errors_found |= has_errors(devtools_js_compile_out)

    (frontend_compile_out, _) = frontend_compile_proc.communicate()
    print 'devtools frontend compilation output:'
    for line in frontend_compile_out.splitlines():
        if '@@ START_MODULE' in line or '@@ END_MODULE' in line:
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


if __name__ == '__main__':
    main()
