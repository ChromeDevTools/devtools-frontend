# Copyright (C) 2014 Google Inc. All rights reserved.
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
"""
DevTools presubmit script

See http://dev.chromium.org/developers/how-tos/depottools/presubmit-scripts
for more details about the presubmit API built into gcl.
"""

import sys
import six
import time

AUTOROLL_ACCOUNT = "devtools-ci-autoroll-builder@chops-service-accounts.iam.gserviceaccount.com"
USE_PYTHON3 = True


def _ExecuteSubProcess(input_api, output_api, script_path, args, results):
    if isinstance(script_path, six.string_types):
        script_path = [input_api.python3_executable, script_path]

    start_time = time.time()
    process = input_api.subprocess.Popen(script_path + args,
                                         stdout=input_api.subprocess.PIPE,
                                         stderr=input_api.subprocess.STDOUT)
    out, _ = process.communicate()
    end_time = time.time()

    time_difference = end_time - start_time
    time_info = "Script execution time was %.1fs seconds\n" % (time_difference)
    if process.returncode != 0:
        results.append(
            output_api.PresubmitError(time_info + out.decode('utf-8')))
    else:
        results.append(
            output_api.PresubmitNotifyResult(time_info + out.decode('utf-8')))
    return results


def _CheckChangesAreExclusiveToDirectory(input_api, output_api):
    if input_api.change.DISABLE_THIRD_PARTY_CHECK != None:
        return []

    results = [output_api.PresubmitNotifyResult('Directory Exclusivity Check:')]

    def IsParentDir(file, dir):
        while file != '':
            if file == dir:
                return True
            file = input_api.os_path.dirname(file)
        return False

    def FileIsInDir(file, dirs):
        if file.endswith('OWNERS') and 'OWNERS' in dirs:
            return True
        for dir in dirs:
            if IsParentDir(file, dir):
                return True

    EXCLUSIVE_CHANGE_DIRECTORIES = [
        [
            'third_party', 'v8',
            input_api.os_path.join('front_end', 'models',
                                   'javascript_metadata'),
            input_api.os_path.join('front_end', 'generated')
        ],
        [
            'node_modules',
            'package-lock.json',
            input_api.os_path.join('scripts', 'deps', 'manage_node_deps.py'),
        ],
        ['OWNERS'],
    ]

    affected_files = input_api.LocalPaths()
    num_affected = len(affected_files)
    for dirs in EXCLUSIVE_CHANGE_DIRECTORIES:
        dir_list = ', '.join(dirs)
        affected_in_dir = [
            file for file in affected_files if FileIsInDir(file, dirs)
        ]
        num_in_dir = len(affected_in_dir)
        if num_in_dir == 0:
            continue
        # Addition of new third_party folders must have a new entry in `.gitignore`
        if '.gitignore' in affected_files:
            num_in_dir = num_in_dir + 1
        if num_in_dir < num_affected:
            unexpected_files = [
                file for file in affected_files if file not in affected_in_dir
            ]
            results.append(
                output_api.PresubmitError(
                    ('CLs that affect files in "%s" should be limited to these files/directories.'
                     % dir_list) +
                    ('\nUnexpected files: %s.' % unexpected_files) +
                    '\nYou can disable this check by adding DISABLE_THIRD_PARTY_CHECK=<reason> to your commit message'
                ))
            break

    return results


def _CheckBugAssociation(input_api, output_api, is_committing):
    results = [output_api.PresubmitNotifyResult('Bug Association Check:')]
    bugs = input_api.change.BugsFromDescription()
    message = (
        "Each CL should be associated with a bug, use \'Bug:\' or \'Fixed:\' lines in\n"
        "the footer of the commit description. If you explicitly don\'t want to\n"
        "set a bug, use \'Bug: none\' in the footer of the commit description.\n\n"
        "Note: The footer of the commit description is the last block of lines in\n"
        "the commit description that doesn't contain empty lines. This means that\n"
        "any \'Bug:\' or \'Fixed:\' lines that are eventually followed by an empty\n"
        "line are not detected by this presubmit check.")

    if not bugs:
        if is_committing:
            results.append(output_api.PresubmitError(message))
        else:
            results.append(output_api.PresubmitNotifyResult(message))

    for bug in bugs:
        results.append(output_api.PresubmitNotifyResult(('%s') % bug))

    return results


def _CheckExperimentTelemetry(input_api, output_api):
    experiment_telemetry_files = [
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'front_end',
                               'entrypoints', 'main', 'MainImpl.ts'),
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'front_end',
                               'core', 'host', 'UserMetrics.ts')
    ]
    affected_main_files = _getAffectedFiles(input_api,
                                            experiment_telemetry_files, [],
                                            ['.ts'])
    if len(affected_main_files) == 0:
        return [
            output_api.PresubmitNotifyResult(
                'No affected files for telemetry check')
        ]

    results = [
        output_api.PresubmitNotifyResult('Running Experiment Telemetry check:')
    ]
    script_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                         'scripts', 'check_experiments.js')
    results.extend(_checkWithNodeScript(input_api, output_api, script_path))
    return results


def _CheckESBuildVersion(input_api, output_api):
    results = [
        output_api.PresubmitNotifyResult('Running ESBuild version check:')
    ]
    script_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                         'scripts',
                                         'check_esbuild_versions.js')
    results.extend(_checkWithNodeScript(input_api, output_api, script_path))
    return results


def _CheckFormat(input_api, output_api):
    node_modules_affected_files = _getAffectedFiles(input_api, [
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'node_modules'),
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'front_end',
                               'third_party')
    ], [], [])

    # TODO(crbug.com/1068198): Remove once `git cl format --js` can handle large CLs.
    if (len(node_modules_affected_files) > 0):
        return [
            output_api.PresubmitNotifyResult(
                'Skipping Format Checks because `node_modules`/`front_end/third_party` files are affected.'
            )
        ]

    results = [output_api.PresubmitNotifyResult('Running Format Checks:')]

    return _ExecuteSubProcess(input_api, output_api, ['git', 'cl', 'format', '--js'], [], results)


def _CheckDevToolsRunESLintTests(input_api, output_api):
    # Check for changes in the eslint_rules directory, and run the eslint rules
    # tests if so.
    # We don't do this on every CL as most do not touch the rules, but if we do
    # change them we need to make sure all the tests are passing.
    original_sys_path = sys.path
    try:
        sys.path = sys.path + [
            input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts')
        ]
        import devtools_paths
    finally:
        sys.path = original_sys_path
    eslint_rules_dir_path = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'scripts', 'eslint_rules')
    eslint_rules_affected_files = _getAffectedFiles(input_api,
                                                    [eslint_rules_dir_path],
                                                    [], [])

    if (len(eslint_rules_affected_files) == 0):
        return []

    mocha_path = devtools_paths.mocha_path()
    eslint_tests_path = input_api.os_path.join(eslint_rules_dir_path, 'tests',
                                               '*_test.js')

    results = [output_api.PresubmitNotifyResult('ESLint rules unit tests')]
    results.extend(
        # The dot reporter is more concise which is useful to not get LOADS of
        # output when just one test fails.
        _checkWithNodeScript(input_api, output_api, mocha_path,
                             ['--reporter', 'dot', eslint_tests_path]))
    return results


def _CheckDevToolsRunBuildTests(input_api, output_api):
    # Check for changes in the build/tests directory, and run the tests if so.
    # We don't do this on every CL as most do not touch the rules, but if we do
    # change them we need to make sure all the tests are passing.
    original_sys_path = sys.path
    try:
        sys.path = sys.path + [
            input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts')
        ]
        import devtools_paths
    finally:
        sys.path = original_sys_path
    scripts_build_dir_path = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'scripts', 'build')
    scripts_build_affected_files = _getAffectedFiles(input_api,
                                                     [scripts_build_dir_path],
                                                     [], [])

    if len(scripts_build_affected_files) == 0:
        return []

    mocha_path = devtools_paths.mocha_path()
    build_tests_path = input_api.os_path.join(scripts_build_dir_path, 'tests',
                                              '*_test.js')

    results = [output_api.PresubmitNotifyResult('Build plugins unit tests')]
    results.extend(
        # The dot reporter is more concise which is useful to not get LOADS of
        # output when just one test fails.
        _checkWithNodeScript(input_api, output_api, mocha_path,
                             ['--reporter', 'dot', build_tests_path]))
    return results


def _CheckDevToolsStyleJS(input_api, output_api):
    results = [output_api.PresubmitNotifyResult('JS style check:')]
    lint_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                       'scripts', 'test',
                                       'run_lint_check_js.mjs')

    front_end_directory = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'front_end')
    component_docs_directory = input_api.os_path.join(front_end_directory,
                                                      'ui', 'components',
                                                      'docs')
    inspector_overlay_directory = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'inspector_overlay')
    test_directory = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                            'test')
    scripts_directory = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                               'scripts')

    default_linted_directories = [
        front_end_directory, test_directory, scripts_directory,
        inspector_overlay_directory
    ]

    eslint_related_files = [
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'node_modules',
                               'eslint'),
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'node_modules',
                               '@typescript-eslint'),
        input_api.os_path.join(input_api.PresubmitLocalPath(), '.eslintrc.js'),
        input_api.os_path.join(input_api.PresubmitLocalPath(),
                               '.eslintignore'),
        input_api.os_path.join(front_end_directory, '.eslintrc.js'),
        input_api.os_path.join(component_docs_directory, '.eslintrc.js'),
        input_api.os_path.join(test_directory, '.eslintrc.js'),
        input_api.os_path.join(scripts_directory, 'test',
                               'run_lint_check_js.py'),
        input_api.os_path.join(scripts_directory, 'test',
                               'run_lint_check_js.mjs'),
        input_api.os_path.join(scripts_directory, '.eslintrc.js'),
        input_api.os_path.join(scripts_directory, 'eslint_rules'),
    ]

    lint_config_files = _getAffectedFiles(input_api, eslint_related_files, [],
                                          ['.js', '.py', '.eslintignore'])

    should_bail_out, files_to_lint = _getFilesToLint(
        input_api, output_api, lint_config_files, default_linted_directories,
        ['.js', '.ts'], results)
    if should_bail_out:
        return results

    # If there are more than 50 files to check, don't bother and check
    # everything, so as to not run into command line length limits on Windows.
    if len(files_to_lint) > 50:
        files_to_lint = []

    results.extend(
        _checkWithNodeScript(input_api, output_api, lint_path, files_to_lint))
    return results


def _CheckDevToolsStyleCSS(input_api, output_api):
    results = [output_api.PresubmitNotifyResult('CSS style check:')]
    lint_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                       'scripts', 'test',
                                       'run_lint_check_css.js')

    front_end_directory = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'front_end')
    inspector_overlay_directory = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'inspector_overlay')
    default_linted_directories = [
        front_end_directory, inspector_overlay_directory
    ]

    scripts_directory = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                               'scripts')

    stylelint_related_files = [
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'node_modules',
                               'stylelint'),
        input_api.os_path.join(input_api.PresubmitLocalPath(),
                               '.stylelintrc.json'),
        input_api.os_path.join(input_api.PresubmitLocalPath(),
                               '.stylelintignore'),
        input_api.os_path.join(scripts_directory, 'test',
                               'run_lint_check_css.js'),
    ]

    lint_config_files = _getAffectedFiles(input_api, stylelint_related_files,
                                          [], [])

    css_should_bail_out, css_files_to_lint = _getFilesToLint(
        input_api, output_api, lint_config_files, default_linted_directories,
        ['.css'], results)

    # If there are more than 50 files to check, don't bother and check
    # everything, so as to not run into command line length limits on Windows.
    if not css_should_bail_out:
        if len(css_files_to_lint) < 50:
            script_args = ["--files"] + css_files_to_lint
        else:
            script_args = []  # The defaults check all CSS files.
        results.extend(
            _checkWithNodeScript(input_api, output_api, lint_path,
                                 script_args))

    return results


def _CheckDevToolsNonJSFileLicenseHeaders(input_api, output_api):
    results = [
        output_api.PresubmitNotifyResult(
            'Python-like file license header check:')
    ]
    lint_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                       'scripts', 'test',
                                       'run_header_check_non_js_files.js')

    front_end_directory = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'front_end')
    inspector_overlay_directory = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'inspector_overlay')
    test_directory = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                            'test')
    scripts_directory = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                               'scripts')
    config_directory = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                              'config')

    default_linted_directories = [
        front_end_directory, test_directory, scripts_directory,
        inspector_overlay_directory, config_directory
    ]

    check_related_files = [lint_path]

    lint_config_files = _getAffectedFiles(input_api, check_related_files, [],
                                          ['.js'])

    should_bail_out, files_to_lint = _getFilesToLint(
        input_api, output_api, lint_config_files, default_linted_directories,
        ['BUILD.gn', '.gni', '.css'], results)
    if should_bail_out:
        return results

    # If there are more than 50 files to check, don't bother and check
    # everything, so as to not run into command line length limits on Windows.
    if len(files_to_lint) > 50:
        files_to_lint = []

    results.extend(
        _checkWithNodeScript(input_api, output_api, lint_path, files_to_lint))
    return results


def _CheckGeneratedFiles(input_api, output_api):
    v8_directory_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'v8')
    blink_directory_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'third_party', 'blink')
    protocol_location = input_api.os_path.join(blink_directory_path, 'public', 'devtools_protocol')
    scripts_build_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts', 'build')
    scripts_generated_output_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'front_end', 'generated')

    generated_aria_path = input_api.os_path.join(scripts_build_path, 'generate_aria.py')
    generated_supported_css_path = input_api.os_path.join(scripts_build_path, 'generate_supported_css.py')
    generated_deprecation_path = input_api.os_path.join(
        scripts_build_path, 'generate_deprecations.py')
    generated_protocol_path = input_api.os_path.join(scripts_build_path, 'code_generator_frontend.py')
    generated_protocol_typescript_path = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'scripts', 'protocol_typescript')
    concatenate_protocols_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'third_party', 'inspector_protocol',
                                                        'concatenate_protocols.py')

    affected_files = _getAffectedFiles(input_api, [
        v8_directory_path,
        blink_directory_path,
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'third_party',
                               'pyjson5'),
        generated_aria_path,
        generated_supported_css_path,
        generated_deprecation_path,
        concatenate_protocols_path,
        generated_protocol_path,
        scripts_generated_output_path,
        generated_protocol_typescript_path,
    ], [], ['.pdl', '.json5', '.py', '.js', '.ts'])

    if len(affected_files) == 0:
        return [
            output_api.PresubmitNotifyResult(
                'No affected files for generated files check')
        ]

    results = [output_api.PresubmitNotifyResult('Running Generated Files Check:')]
    generate_protocol_resources_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts', 'deps',
                                                              'generate_protocol_resources.py')

    return _ExecuteSubProcess(input_api, output_api, generate_protocol_resources_path, [], results)


def _CheckL10nStrings(input_api, output_api):
    devtools_root = input_api.PresubmitLocalPath()
    devtools_front_end = input_api.os_path.join(devtools_root, 'front_end')
    script_path = input_api.os_path.join(devtools_root, 'third_party', 'i18n',
                                         'check-strings.js')
    affected_front_end_files = _getAffectedFiles(
        input_api, [devtools_front_end, script_path], [], ['.js', '.ts'])
    if len(affected_front_end_files) == 0:
        return [
            output_api.PresubmitNotifyResult(
                'No affected files to run check-strings')
        ]

    results = [
        output_api.PresubmitNotifyResult('Checking UI strings from front_end:')
    ]
    results.extend(
        _checkWithNodeScript(input_api, output_api, script_path,
                             [devtools_front_end]))
    return results


def _CheckNoUncheckedFiles(input_api, output_api):
    results = []
    process = input_api.subprocess.Popen(['git', 'diff', '--exit-code'],
                                         stdout=input_api.subprocess.PIPE,
                                         stderr=input_api.subprocess.STDOUT)
    out, _ = process.communicate()
    if process.returncode != 0:
        files_changed_process = input_api.subprocess.Popen(
            ['git', 'diff'],
            stdout=input_api.subprocess.PIPE,
            stderr=input_api.subprocess.STDOUT)
        files_changed, _ = files_changed_process.communicate()

        return [
            output_api.PresubmitError(
                'You have changed files that need to be committed:'),
            output_api.PresubmitError(files_changed.decode('utf-8'))
        ]
    return []

def _CheckForTooLargeFiles(input_api, output_api):
    """Avoid large files, especially binary files, in the repository since
  git doesn't scale well for those. They will be in everyone's repo
  clones forever, forever making Chromium slower to clone and work
  with."""
    # Uploading files to cloud storage is not trivial so we don't want
    # to set the limit too low, but the upper limit for "normal" large
    # files seems to be 1-2 MB, with a handful around 5-8 MB, so
    # anything over 20 MB is exceptional.
    TOO_LARGE_FILE_SIZE_LIMIT = 20 * 1024 * 1024  # 10 MB
    too_large_files = []
    for f in input_api.AffectedFiles():
        # Check both added and modified files (but not deleted files).
        if f.Action() in ('A', 'M'):
            size = input_api.os_path.getsize(f.AbsoluteLocalPath())
            if size > TOO_LARGE_FILE_SIZE_LIMIT:
                too_large_files.append("%s: %d bytes" % (f.LocalPath(), size))
    if too_large_files:
        message = (
          'Do not commit large files to git since git scales badly for those.\n' +
          'Instead put the large files in cloud storage and use DEPS to\n' +
          'fetch them.\n' + '\n'.join(too_large_files)
        )
        return [output_api.PresubmitError(
            'Too large files found in commit', long_text=message + '\n')]
    else:
        return []


def _CheckObsoleteScreenshotGoldens(input_api, output_api):
    results = [
        output_api.PresubmitNotifyResult('Obsolete screenshot images check')
    ]
    interaction_test_root_path = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'test', 'interactions')
    interaction_test_files = [interaction_test_root_path]

    interaction_test_files_changed = _getAffectedFiles(input_api,
                                                       interaction_test_files,
                                                       [], [])

    if len(interaction_test_files_changed) > 0:
        script_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                             'scripts', 'test',
                                             'check_obsolete_goldens.js')
        eslint_rules_dir_path = input_api.os_path.join(
            input_api.PresubmitLocalPath(), 'scripts', 'eslint_rules')

        script_args = ["--interaction-test-root", interaction_test_root_path]
        errors_from_script = _checkWithNodeScript(input_api, output_api,
                                                  script_path, script_args)
        results.extend(errors_from_script)

    return results


def _RunCannedChecks(input_api, output_api):
    results = []
    results.extend(
        input_api.canned_checks.CheckOwnersFormat(input_api, output_api))
    results.extend(input_api.canned_checks.CheckOwners(input_api, output_api))
    results.extend(
        input_api.canned_checks.CheckChangeHasNoCrAndHasOnlyOneEol(
            input_api, output_api))
    results.extend(
        input_api.canned_checks.CheckChangeHasNoStrayWhitespace(
            input_api,
            output_api,
            source_file_filter=lambda file: not file.LocalPath().startswith(
                'node_modules')))
    results.extend(
        input_api.canned_checks.CheckGenderNeutral(input_api, output_api))
    return results


def _CommonChecks(input_api, output_api):
    """Checks common to both upload and commit."""
    results = []
    results.extend(
        input_api.canned_checks.CheckAuthorizedAuthor(
            input_api, output_api, bot_allowlist=[AUTOROLL_ACCOUNT]))
    results.extend(_CheckExperimentTelemetry(input_api, output_api))
    results.extend(_CheckGeneratedFiles(input_api, output_api))
    results.extend(_CheckDevToolsStyleJS(input_api, output_api))
    results.extend(_CheckDevToolsStyleCSS(input_api, output_api))
    results.extend(_CheckDevToolsRunESLintTests(input_api, output_api))
    results.extend(_CheckDevToolsRunBuildTests(input_api, output_api))
    results.extend(_CheckDevToolsNonJSFileLicenseHeaders(
        input_api, output_api))

    results.extend(_CheckFormat(input_api, output_api))
    results.extend(_CheckESBuildVersion(input_api, output_api))
    results.extend(_CheckChangesAreExclusiveToDirectory(input_api, output_api))
    results.extend(_CheckObsoleteScreenshotGoldens(input_api, output_api))
    # Run the canned checks from `depot_tools` after the custom DevTools checks.
    # The canned checks for example check that lines have line endings. The
    # DevTools presubmit checks automatically fix these issues. If we would run
    # the canned checks before the DevTools checks, they would erroneously conclude
    # that there are issues in the code. Since the canned checks are allowed to be
    # ignored, a confusing message is shown that asks if the failed presubmit can
    # be continued regardless. By fixing the issues before we reach the canned checks,
    # we don't show the message to suppress these errors, which would otherwise be
    # causing CQ to fail.
    results.extend(_RunCannedChecks(input_api, output_api))
    return results


def _SideEffectChecks(input_api, output_api):
    """Check side effects caused by other checks"""
    results = []
    results.extend(_CheckNoUncheckedFiles(input_api, output_api))
    results.extend(_CheckForTooLargeFiles(input_api, output_api))
    return results


def CheckChangeOnUpload(input_api, output_api):
    results = []
    results.extend(_CommonChecks(input_api, output_api))
    results.extend(_CheckL10nStrings(input_api, output_api))
    # Run checks that rely on output from other DevTool checks
    results.extend(_SideEffectChecks(input_api, output_api))
    results.extend(_CheckBugAssociation(input_api, output_api, False))
    return results


def CheckChangeOnCommit(input_api, output_api):
    results = []
    results.extend(_CommonChecks(input_api, output_api))
    results.extend(_CheckL10nStrings(input_api, output_api))
    # Run checks that rely on output from other DevTool checks
    results.extend(_SideEffectChecks(input_api, output_api))
    results.extend(input_api.canned_checks.CheckChangeHasDescription(input_api, output_api))
    results.extend(_CheckBugAssociation(input_api, output_api, True))
    return results


def _getAffectedFiles(input_api, parent_directories, excluded_actions, accepted_endings):  # pylint: disable=invalid-name
    """Return absolute file paths of affected files (not due to an excluded action)
       under a parent directory with an accepted file ending.
    """
    local_paths = [
        f.AbsoluteLocalPath() for f in input_api.AffectedFiles() if all(f.Action() != action for action in excluded_actions)
    ]
    affected_files = [
        file_name for file_name in local_paths
        if any(parent_directory in file_name
               for parent_directory in parent_directories) and (
                   len(accepted_endings) == 0 or any(
                       file_name.endswith(accepted_ending)
                       for accepted_ending in accepted_endings))
    ]
    return affected_files


def _checkWithNodeScript(input_api, output_api, script_path, script_arguments=[]):  # pylint: disable=invalid-name
    original_sys_path = sys.path
    try:
        sys.path = sys.path + [input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts')]
        import devtools_paths
    finally:
        sys.path = original_sys_path

    return _ExecuteSubProcess(input_api, output_api, [devtools_paths.node_path(), script_path], script_arguments, [])


def _getFilesToLint(input_api, output_api, lint_config_files,
                    default_linted_directories, accepted_endings, results):
    run_full_check = False
    files_to_lint = []

    # We are changing the lint configuration; run the full check.
    if len(lint_config_files) != 0:
        results.append(
            output_api.PresubmitNotifyResult('Running full lint check'))
        run_full_check = True
    else:
        # Only run the linter on files that are relevant, to save PRESUBMIT time.
        files_to_lint = _getAffectedFiles(input_api,
                                          default_linted_directories, ['D'],
                                          accepted_endings)

        # Exclude front_end/third_party and front_end/generated files.
        files_to_lint = [
            file for file in files_to_lint
            if "third_party" not in file or "generated" not in file
        ]

        if len(files_to_lint) == 0:
            results.append(
                output_api.PresubmitNotifyResult(
                    'No affected files for lint check'))

    should_bail_out = len(files_to_lint) == 0 and not run_full_check
    return should_bail_out, files_to_lint
