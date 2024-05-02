#!/usr/bin/env vpython3
# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import argparse
from collections import Counter
import http.server
import json
import os
import subprocess
import sys
import threading

import yaml


def repo_path(*paths):
    RootDirectory = os.path.dirname(
        os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.realpath(__file__)))))

    def make_absolute(path):
        if not path.startswith('//'):
            return path
        return os.path.join(RootDirectory, path[2:])

    return os.path.join(os.getcwd(), *(make_absolute(path) for path in paths))


def make_dir(*paths):
    path = repo_path(*paths)
    try:
        os.makedirs(path)
    except FileExistsError:
        pass
    return path


def create_symlink(src, dst):
    src = repo_path(src)
    dst = repo_path(dst)
    if os.path.islink(dst):
        os.remove(dst)
    if os.path.exists(dst):
        raise FileExistsError(dst)
    make_dir(os.path.dirname(dst))
    os.symlink(src, dst)


def get_artifact_dir(project, *paths):
    dirs = {
        'devtools-frontend': 'devtools-frontend',
        'test_suite': 'extensions/cxx_debugging/e2e',
        'cxx_debugging': 'DevTools_CXX_Debugging.stage2'
    }
    base = dirs.get(project, None)
    if not base:
        return base
    return os.path.join(base, *paths)


def ninja(build_root, artifact, verbose):
    ninja_dir = repo_path(build_root, get_artifact_dir(artifact))
    if not os.path.exists(repo_path(ninja_dir, 'build.ninja')):
        sys.stderr.write(
            f'build.ninja not found for build artifact {artifact}. Did you run `compile` first?'
        )
        raise FileNotFoundError(repo_path(ninja_dir, 'build.ninja'))

    run_process('ninja', cwd=ninja_dir, verbose=verbose)


def run_process(*args, verbose=False, cwd=None, env=None):
    stdout = None if verbose else subprocess.PIPE
    stderr = None if verbose else subprocess.PIPE
    if verbose:
        env_spec = (' '.join(f"{a}='{b}'"
                             for (a, b) in env.items()) + ' ') if env else ''
        sys.stderr.write(
            f'RUN: {env_spec}{" ".join(args)} (wd: {cwd or "."})\n')

    if env:
        full_env = os.environ.copy()
        full_env.update(env)
    else:
        full_env = None

    process = subprocess.Popen(args,
                               cwd=cwd,
                               env=full_env,
                               stdout=stdout,
                               stderr=stderr)
    out, err = process.communicate()
    if process.returncode != 0:
        sys.stderr.write(
            f'FAILED: {args[0]} returned non-zero exit status {process.returncode}\n'
        )
        if not verbose:
            sys.stderr.write(f'{out.decode()}{err.decode()}')
        raise subprocess.CalledProcessError(process.returncode, args[0])


def list_tests(path):
    base_path = repo_path(path)
    for dirpath, _, files in os.walk(path):
        yield from (repo_path(base_path, dirpath, f) for f in files
                    if f.endswith('.yaml'))


class Test(object):
    def __init__(self, build_root, path):
        output_directory = repo_path(build_root,
                                     get_artifact_dir('test_suite'))
        with open(path) as test_file:
            test_data = yaml.load(test_file, Loader=yaml.SafeLoader)
        self.name = test_data['name']
        self.source_file = repo_path(os.path.dirname(path),
                                     test_data['source_file'])
        self.output_directory = output_directory
        self.test_script = test_data.get('script', [])
        self.extension_parameters = test_data.get('extension_parameters', '')
        self.use_dwo = 'use_dwo' in test_data
        self.test_file = test_data.get('file', '')
        extra_flag = [
            f'-fdebug-prefix-map={os.path.dirname(self.source_file)}/='
        ]
        self.flags = [f + extra_flag for f in test_data['flags']]

        input_basename, _ = os.path.splitext(self.source_file)
        output_file_name = input_basename + '__' + Test.__replace_special_characters(
            self.name)
        output_file = os.path.relpath(output_file_name, repo_path('//'))

        # Create one output file per flag config
        self.output_files = [
            f'{output_file}_{i}.html' for i in range(0, len(self.flags))
        ]

    @classmethod
    def __replace_special_characters(cls, name):
        return name.replace('/', '_').replace(' ', '_').replace(':', '_')

    @classmethod
    def load_tests(cls, build_root):
        test_dir = repo_path('//extensions/cxx_debugging/e2e/tests')
        tests = [Test(build_root, t) for t in list_tests(test_dir)]
        names = Counter(t.name for t in tests)
        if len(names) != len(tests):
            duplicates = [k for k, v in names.items() if v > 1]
            raise Exception(
                f'Found {len(duplicates)} test{"s" if len(duplicates) > 1 else ""} with a non-unique name: {", ".join(duplicates)}'
            )
        return tests

    def compile(self):
        _, ext = os.path.splitext(self.source_file)
        test_directory = os.path.join(self.output_directory,
                                      os.path.dirname(self.output_files[0]))
        make_dir(test_directory)
        compiler = repo_path(
            '//third_party/emscripten-releases/install/emscripten/',
            'em++' if ext == '.cc' else 'emcc')
        source_file_name = os.path.basename(self.source_file)
        output_source_file = os.path.join(
            os.path.dirname(self.output_files[0]), source_file_name)

        # Create build ninja rules for each output_file
        for idx, output_file in enumerate(self.output_files):
            flags = self.flags[idx]
            output_test_name, _ = os.path.splitext(output_file)

            html_rule_name = os.path.basename(output_file)
            object_file = output_test_name + '.o'
            object_rule_name = os.path.basename(object_file)

            flags = ' '.join(flags)
            # Build the html output file from the object file
            yield f'rule build_{html_rule_name}\n  command = cd {test_directory} && {compiler} {flags} {object_rule_name} -o {html_rule_name}\n  description = Compiling test {self.name} to object file with flags: "{flags}"\n'
            yield f'build {output_file}: build_{html_rule_name} {object_file}\n'

            flags += ' -c'
            # Build the object file from the source file
            yield f'rule build_{object_rule_name}\n  command = cd {test_directory} && {compiler} {flags} {source_file_name} -o {object_rule_name}\n  description = Linking test {self.name} to binary with flags: "{flags}"\n'  #.format(

            if '-gsplit-dwarf' in flags:
                # Generate the dwarf package file if necessary
                dwp_file = output_test_name + '.wasm.dwp'
                dwo_file = output_test_name + '.dwo'
                yield f'build {object_file} | {dwo_file}: build_{object_rule_name} {output_source_file}\n'
                if not self.use_dwo:
                    yield f'build {dwp_file}: build_dwp {dwo_file}\n'
            else:
                yield f'build {object_file}: build_{object_rule_name} {output_source_file}\n'

        yield f'build {output_source_file}: cp {self.source_file}\n'


class RunnerCommand(object):
    Command = None
    Help = None

    def _register_options(self, parser):
        pass

    @classmethod
    def create(cls, subparsers):
        if not cls.Command:
            raise RuntimeError(f'Class {cls} must override Command')
        parser = subparsers.add_parser(cls.Command, help=cls.Help)
        command = cls()
        command._register_options(parser)
        parser.add_argument('--build-root',
                            dest='build_root',
                            default='//out/Default')
        parser.add_argument('--verbose', '-v', action='store_true')
        parser.add_argument('--release',
                            action='store_true',
                            help='Build a release instead of a debug version.')
        parser.add_argument(
            '--release-version',
            type=int,
            default=None,
            help=
            'Provide a version number for building a release, instead of building a debug version.'
        )
        parser.add_argument(
            '--patch-level',
            type=int,
            default=0,
            help=
            'Provide a version patch level for building a release, instead of building a debug version.'
        )
        return cls.Command, command


class Compile(RunnerCommand):
    Command = 'compile'
    Help = 'Compile the tests and the dependencies'

    def _register_options(self, parser):
        parser.add_argument('--goma')

    def __call__(self, options):
        self.build_extension(options)
        self.build_devtools(options.build_root, options.verbose)
        self.build_tests(options.build_root, options.verbose)
        self.build_driver(options.build_root, options.verbose)

    def configure_tests(self, build_root):
        tests = Test.load_tests(build_root)
        test_suite_dir = repo_path(build_root, get_artifact_dir('test_suite'))
        make_dir(test_suite_dir)

        with open(repo_path(test_suite_dir, 'build.ninja'), 'w') as ninja_file:
            ninja_file.write(
                'rule cp\n  command = cp $in $out\n  description = Installing $in\n\n'
            )

            llvm_dwp = repo_path(
                '//third_party/emscripten-releases/install/bin/', 'llvm-dwp')
            ninja_file.write(
                'rule build_dwp\n  command = {llvm_dwp} $in -o $out\n  description = Generating dwp file, creating $out\n\n'
                .format(llvm_dwp=llvm_dwp))

            rules = set()
            for test in tests:
                for rule in test.compile():
                    if rule in rules: continue
                    ninja_file.write('{}\n'.format(rule))
                    rules.add(rule)

    def build_tests(self, build_root, verbose):
        self.configure_tests(build_root)
        ninja(build_root, 'test_suite', verbose)

    def build_driver(self, build_root, verbose):
        node = repo_path('//third_party/node/node.py')
        tsc = repo_path('//node_modules/typescript/bin/tsc')
        run_process(sys.executable,
                    node,
                    '--output',
                    tsc,
                    '-p',
                    repo_path('//extensions/cxx_debugging/e2e'),
                    '--outDir',
                    repo_path(build_root),
                    verbose=verbose)

    def build_extension(self, options):
        args = ['-goma', options.goma] if options.goma else ['-no-goma']
        if options.release or options.release_version:
            args.append('-release-version')
            args.append(options.release_version or 0)
            args.append('-patch-level')
            args.append(options.patch_level or 0)
        run_process(sys.executable,
                    repo_path('//extensions/cxx_debugging/tools/bootstrap.py'),
                    '-infra',
                    *[str(a) for a in args],
                    repo_path(options.build_root),
                    verbose=options.verbose,
                    cwd=repo_path('//'))
        return options.build_root

    def build_devtools(self, build_root, verbose):
        platforms = {'linux': 'linux64', 'win32': 'win', 'darwin': 'mac'}
        gn = repo_path('//buildtools/{}/'.format(platforms[sys.platform]),
                       'gn')
        gn_args_path = repo_path('//build/config/gclient_args.gni')

        devtools_build_root = repo_path(build_root,
                                        get_artifact_dir('devtools-frontend'))
        make_dir(devtools_build_root)

        run_process(gn,
                    'gen',
                    devtools_build_root,
                    cwd=repo_path('//'),
                    verbose=verbose)
        ninja(build_root, 'devtools-frontend', verbose)


class Init(RunnerCommand):
    Command = 'init'
    Help = 'Initialize the test suite'

    @classmethod
    def generate_tests(cls, test, test_suite_dir):
        return [{
            "name":
            test.name,
            "test":
            os.path.relpath(os.path.join(test.output_directory, output_file),
                            test_suite_dir),
            "script":
            test.test_script,
            "extension_parameters":
            test.extension_parameters,
            "file":
            test.test_file
        } for output_file in test.output_files]

    def _register_options(self, parser):
        parser.add_argument('--debug', '-d', action='store_true')
        parser.add_argument('tests', nargs='*')

    def __call__(self, options):
        tests = Test.load_tests(options.build_root)
        if options.debug:
            sys.stdout.write('Tests:\n')
            for test in tests:
                sys.stdout.write('- {}\n'.format(test.name))
        if options.tests:
            test_names = set(options.tests)
            tests = [t for t in tests if t.name in test_names]
            unresolved_tests = test_names - {t.name for t in tests}

            if unresolved_tests:
                sys.stderr.write(
                    'The following tests could not be resolved:\n{}\n'.format(
                        '\n'.join(unresolved_tests)))
                return 1
        test_suite_dir = repo_path(options.build_root,
                                   get_artifact_dir('test_suite'))
        make_dir(test_suite_dir)

        mocha_spec = {
            'require': [
                repo_path(options.build_root,
                          'extensions/cxx_debugging/e2e/MochaRootHooks.js'),
                'source-map-support/register'
            ],
            'spec': [
                repo_path(
                    options.build_root,
                    'extensions/cxx_debugging/e2e/StandaloneTestDriver.js'),
                repo_path(options.build_root,
                          'extensions/cxx_debugging/e2e/OptionsPageTests.js'),
                repo_path(options.build_root,
                          'extensions/cxx_debugging/e2e/TestDriver.js')
            ],
            'slow':
            15000,
            'timeout':
            0 if options.debug else 120000
        }
        with open(repo_path(test_suite_dir, '.mocharc.js'), 'w') as mocharc:
            mocharc.write(
                'process.env.TEST_SERVER_TYPE = "hosted-mode";\nmodule.exports = {};'
                .format(json.dumps(mocha_spec, indent=2)))

        with open(repo_path(test_suite_dir, 'tests.json'), 'w') as tests_file:
            tests = [Init.generate_tests(t, test_suite_dir) for t in tests]
            json.dump([test for sublist in tests for test in sublist],
                      tests_file,
                      indent=2)

        Compile().configure_tests(options.build_root)

        create_symlink(
            repo_path(options.build_root, get_artifact_dir('test_suite')),
            repo_path(options.build_root,
                      get_artifact_dir('devtools-frontend'), 'gen',
                      'extension_test_suite'))
        create_symlink(
            repo_path(options.build_root, get_artifact_dir('cxx_debugging')),
            repo_path(options.build_root,
                      get_artifact_dir('devtools-frontend'), 'gen',
                      'cxx_debugging'))


class Inspect(Init):
    Command = 'inspect'
    Help = 'Interactively run the test programs'

    class RequestHandlerFactory(object):
        def __init__(self, build_root):
            self.build_root = build_root

        def __call__(self, request, client_address, server):
            return http.server.SimpleHTTPRequestHandler(
                request,
                client_address,
                server,
                directory=repo_path(self.build_root,
                                    get_artifact_dir('test_suite')))

    def _register_options(self, parser):
        super()._register_options(parser)
        parser.add_argument('--port', '-p', default=8000)

    def __call__(self, options):
        init = super().__call__(options)
        if init:
            return init

        ninja(options.build_root, 'devtools-frontend', options.verbose)
        ninja(options.build_root, 'cxx_debugging', options.verbose)
        ninja(options.build_root, 'test_suite', options.verbose)

        httpd = http.server.HTTPServer(
            ('127.0.0.1', options.port),
            Inspect.RequestHandlerFactory(options.build_root))
        httpd_thread = threading.Thread(target=httpd.serve_forever,
                                        daemon=True)
        httpd_thread.start()

        chrome_binaries = {
            'linux': '//third_party/chrome/chrome-linux/chrome',
            'darwin':
            '//third_party/chrome/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
            'win32': '//third_party/chrome/chrome-win/chrome.exe'
        }

        chrome_binary = repo_path(chrome_binaries[sys.platform])
        if options.tests:
            tests = [
                t for t in Test.load_tests(options.build_root)
                if t.name in options.tests
            ]
            pages = [
                f'http://localhost:{options.port}/{os.path.relpath(test.output_file, test.output_directory)}'
                for test in tests
            ]
        else:
            pages = [f'http://localhost:{options.port}/']

        run_process(
            chrome_binary,
            f'--auto-open-devtools-for-tabs',
            f'--load-extension={repo_path(options.build_root, get_artifact_dir("cxx_debugging"), "src")}',
            f'--custom-devtools-frontend=file://{repo_path(options.build_root, get_artifact_dir("devtools-frontend"), "gen", "front_end")}',
            f'--enable-features=WebAssemblySimd',
            f'--enable-features=SharedArrayBuffer',
            f'--js-flags=--no-compilation-cache',
            *pages,
            verbose=options.verbose)


class Run(Init):
    Command = 'run'
    Help = 'Run tests'

    def _register_options(self, parser):
        super()._register_options(parser)
        parser.add_argument('--compile', '-C', action='store_true')

    def __call__(self, options):
        init = super().__call__(options)
        if init:
            return init

        if options.compile:
            options.goma = None
            Compile()(options)
        else:
            ninja(options.build_root, 'test_suite', options.verbose)
            ninja(options.build_root, 'devtools-frontend', options.verbose)
            ninja(options.build_root, 'cxx_debugging', options.verbose)
            Compile().build_driver(options.build_root, options.verbose)

        env = {
            'NODE_PATH':
            ':'.join((repo_path('//node_modules'),
                      repo_path(options.build_root,
                                get_artifact_dir('devtools-frontend'),
                                'gen'))),
            'TEST_SUITE':
            repo_path(options.build_root, get_artifact_dir('test_suite')),
        }
        if options.debug:
            env['DEBUG_TEST'] = '1'
        run_process(sys.executable,
                    repo_path('//scripts/test/run_test_suite.py'),
                    '--chrome-features=WebAssemblySimd',
                    '--chrome-features=SharedArrayBuffer',
                    '--test-suite',
                    repo_path(options.build_root,
                              get_artifact_dir('test_suite')),
                    env=env,
                    cwd=repo_path(options.build_root),
                    verbose=options.verbose or options.debug)


def runner_main(args):
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(required=True, dest='command')
    commands = dict([
        Init.create(subparsers),
        Run.create(subparsers),
        Compile.create(subparsers),
        Inspect.create(subparsers)
    ])
    options = parser.parse_args(args)
    command = commands[options.command]
    return command(options)


if __name__ == '__main__':
    sys.exit(runner_main(sys.argv[1:]))
