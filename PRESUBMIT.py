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

EXCLUSIVE_CHANGE_DIRECTORIES = [
    [ 'third_party', 'v8' ],
    [ 'node_modules' ],
    [ 'OWNERS' ],
]

AUTOROLL_ACCOUNT = "devtools-ci-autoroll-builder@chops-service-accounts.iam.gserviceaccount.com"


def _ExecuteSubProcess(input_api, output_api, script_path, args, results):
    if isinstance(script_path, six.string_types):
        script_path = [input_api.python_executable, script_path]

    start_time = time.time()
    process = input_api.subprocess.Popen(script_path + args, stdout=input_api.subprocess.PIPE, stderr=input_api.subprocess.STDOUT)
    out, _ = process.communicate()
    end_time = time.time()

    time_difference = end_time - start_time
    time_info = "Script execution time was %.1fs seconds\n" % (time_difference)
    if process.returncode != 0:
        results.append(output_api.PresubmitError(time_info + out))
    else:
        results.append(output_api.PresubmitNotifyResult(time_info + out))
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
        for dir in dirs:
            if IsParentDir(file, dir):
                return True

    affected_files = input_api.LocalPaths()
    num_affected = len(affected_files)
    for dirs in EXCLUSIVE_CHANGE_DIRECTORIES:
        dir_list = ', '.join(dirs)
        affected_in_dir = filter(lambda f: FileIsInDir(f, dirs), affected_files)
        num_in_dir = len(affected_in_dir)
        if num_in_dir == 0:
            continue
        # Addition of new third_party folders must have a new entry in `.gitignore`
        if '.gitignore' in affected_files:
            num_in_dir = num_in_dir + 1
        if num_in_dir < num_affected:
            results.append(output_api
                .PresubmitError(('CLs that affect files in "%s" should be limited to these files/directories.' % dir_list) +
                                ' You can disable this check by adding DISABLE_THIRD_PARTY_CHECK=<reason> to your commit message'))
            break

    return results


def _CheckBuildGN(input_api, output_api):
    results = [output_api.PresubmitNotifyResult('Running BUILD.GN check:')]
    script_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts', 'check_gn.js')
    results.extend(_checkWithNodeScript(input_api, output_api, script_path))
    return results


def _CheckExperimentTelemetry(input_api, output_api):
    experiment_telemetry_files = [
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'front_end',
                               'main', 'MainImpl.js'),
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'front_end',
                               'host', 'UserMetrics.js')
    ]
    affected_main_files = _getAffectedFiles(input_api,
                                            experiment_telemetry_files, [],
                                            ['.js'])
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


def _CheckJSON(input_api, output_api):
    results = [output_api.PresubmitNotifyResult('Running JSON Validator:')]
    script_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts', 'json_validator', 'validate_module_json.js')
    results.extend(_checkWithNodeScript(input_api, output_api, script_path))
    return results


def _CheckFormat(input_api, output_api):
    node_modules_affected_files = _getAffectedFiles(input_api, [input_api.os_path.join(input_api.PresubmitLocalPath(), 'node_modules')], [], [])

    # TODO(crbug.com/1068198): Remove once `git cl format --js` can handle large CLs.
    if (len(node_modules_affected_files) > 0):
        return [output_api.PresubmitNotifyResult('Skipping Format Checks because `node_modules` files are affected.')]

    results = [output_api.PresubmitNotifyResult('Running Format Checks:')]

    return _ExecuteSubProcess(input_api, output_api, ['git', 'cl', 'format', '--js'], [], results)


def _CheckDevtoolsLocalization(input_api, output_api, check_all_files=False):  # pylint: disable=invalid-name
    devtools_root = input_api.PresubmitLocalPath()
    script_path = input_api.os_path.join(devtools_root, 'scripts', 'test', 'run_localization_check.py')
    if check_all_files == True:
        # Scan all files and fix any errors
        args = ['--autofix', '--all']
    else:
        devtools_front_end = input_api.os_path.join(devtools_root, 'front_end')
        affected_front_end_files = _getAffectedFiles(
            input_api, [devtools_front_end], ['D'],
            ['.ts', '.js', '.grdp', '.grd', 'module.json'])

        if len(affected_front_end_files) == 0:
            return [
                output_api.PresubmitNotifyResult(
                    'No affected files for localization check')
            ]

        with input_api.CreateTemporaryFile() as file_list:
            for affected_file in affected_front_end_files:
                file_list.write(affected_file + '\n')
        file_list.close()

        # Scan only added or modified files with specific extensions.
        args = ['--autofix', '--file-list', file_list.name]

    results = [
        output_api.PresubmitNotifyResult('Running Localization Checks:')
    ]
    return _ExecuteSubProcess(input_api, output_api, script_path, args, results)


def _CheckDevToolsStyleJS(input_api, output_api):
    results = [output_api.PresubmitNotifyResult('JS style check:')]
    lint_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                       'scripts', 'test',
                                       'run_lint_check_js.js')

    front_end_directory = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'front_end')
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
        input_api.os_path.join(input_api.PresubmitLocalPath(), '.eslintrc.js'),
        input_api.os_path.join(input_api.PresubmitLocalPath(),
                               '.eslintignore'),
        input_api.os_path.join(front_end_directory, '.eslintrc.js'),
        input_api.os_path.join(test_directory, '.eslintrc.js'),
        input_api.os_path.join(scripts_directory, 'test',
                               'run_lint_check_js.py'),
        input_api.os_path.join(scripts_directory, 'test',
                               'run_lint_check_js.js'),
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

    results.extend(
        _checkWithNodeScript(input_api, output_api, lint_path, files_to_lint))
    return results


def _CheckDevToolsStyleCSS(input_api, output_api):
    results = [output_api.PresubmitNotifyResult('CSS style check:')]
    lint_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                       'scripts', 'test',
                                       'run_lint_check_css.py')

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
                               'run_lint_check_css.py'),
    ]

    lint_config_files = _getAffectedFiles(input_api, stylelint_related_files,
                                          [],
                                          ['.json', '.py', '.stylelintignore'])

    should_bail_out, files_to_lint = _getFilesToLint(
        input_api, output_api, lint_config_files, default_linted_directories,
        ['.css'], results)
    if should_bail_out:
        return results

    return _ExecuteSubProcess(input_api, output_api, lint_path, files_to_lint,
                              results)


def _CheckOptimizeSVGHashes(input_api, output_api):
    if not input_api.platform.startswith('linux'):
        return [output_api.PresubmitNotifyResult('Skipping SVG hash check')]

    results = [
        output_api.PresubmitNotifyResult('Running SVG optimization check:')
    ]

    original_sys_path = sys.path
    try:
        sys.path = sys.path + [input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts', 'build')]
        import devtools_file_hashes
    finally:
        sys.path = original_sys_path

    absolute_local_paths = [af.AbsoluteLocalPath() for af in input_api.AffectedFiles(include_deletes=False)]
    images_src_path = input_api.os_path.join('devtools', 'front_end', 'Images', 'src')
    image_source_file_paths = [path for path in absolute_local_paths if images_src_path in path and path.endswith('.svg')]
    image_sources_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'front_end', 'Images', 'src')
    hashes_file_name = 'optimize_svg.hashes'
    hashes_file_path = input_api.os_path.join(image_sources_path, hashes_file_name)
    invalid_hash_file_paths = devtools_file_hashes.files_with_invalid_hashes(hashes_file_path, image_source_file_paths)
    if len(invalid_hash_file_paths) == 0:
        return results
    invalid_hash_file_names = [input_api.os_path.basename(file_path) for file_path in invalid_hash_file_paths]
    file_paths_str = ', '.join(invalid_hash_file_names)
    error_message = 'The following SVG files should be optimized using optimize_svg_images script before uploading: \n  - %s' % file_paths_str
    results.append(output_api.PresubmitError(error_message))
    return results



def _CheckGeneratedFiles(input_api, output_api):
    v8_directory_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'v8')
    blink_directory_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'third_party', 'blink')
    protocol_location = input_api.os_path.join(blink_directory_path, 'public', 'devtools_protocol')
    scripts_build_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts', 'build')
    scripts_generated_output_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'front_end', 'generated')

    generated_aria_path = input_api.os_path.join(scripts_build_path, 'generate_aria.py')
    generated_supported_css_path = input_api.os_path.join(scripts_build_path, 'generate_supported_css.py')
    generated_protocol_path = input_api.os_path.join(scripts_build_path, 'code_generator_frontend.py')
    concatenate_protocols_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'third_party', 'inspector_protocol',
                                                        'concatenate_protocols.py')

    affected_files = _getAffectedFiles(input_api, [
        v8_directory_path,
        blink_directory_path,
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'third_party', 'pyjson5'),
        generated_aria_path,
        generated_supported_css_path,
        concatenate_protocols_path,
        generated_protocol_path,
        scripts_generated_output_path,
    ], [], ['.pdl', '.json5', '.py', '.js'])

    if len(affected_files) == 0:
        return [
            output_api.PresubmitNotifyResult(
                'No affected files for generated files check')
        ]

    results = [output_api.PresubmitNotifyResult('Running Generated Files Check:')]
    generate_protocol_resources_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts', 'deps',
                                                              'generate_protocol_resources.py')

    return _ExecuteSubProcess(input_api, output_api, generate_protocol_resources_path, [], results)


def _CollectStrings(input_api, output_api):
    devtools_root = input_api.PresubmitLocalPath()
    devtools_front_end = input_api.os_path.join(devtools_root, 'front_end')
    affected_front_end_files = _getAffectedFiles(input_api,
                                                 [devtools_front_end], ['D'],
                                                 ['.js'])
    if len(affected_front_end_files) == 0:
        return [
            output_api.PresubmitNotifyResult(
                'No affected files to run collect-strings')
        ]

    results = [
        output_api.PresubmitNotifyResult('Collecting strings from front_end:')
    ]
    script_path = input_api.os_path.join(devtools_root, 'third_party', 'i18n',
                                         'collect-strings.js')
    results.extend(_checkWithNodeScript(input_api, output_api, script_path))
    results.append(
        output_api.PresubmitNotifyResult(
            'Please commit en-US.json if changes are generated.'))
    return results


def _CheckNoUncheckedFiles(input_api, output_api):
    results = []
    process = input_api.subprocess.Popen(['git', 'diff', '--exit-code'],
                                         stdout=input_api.subprocess.PIPE,
                                         stderr=input_api.subprocess.STDOUT)
    out, _ = process.communicate()
    if process.returncode != 0:
        files_changed_process = input_api.subprocess.Popen(
            ['git', 'diff', '--name-only'],
            stdout=input_api.subprocess.PIPE,
            stderr=input_api.subprocess.STDOUT)
        files_changed, _ = files_changed_process.communicate()

        return [
            output_api.PresubmitError('You have changed files that need to be committed:'),
            output_api.PresubmitError(files_changed)
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
            input_api, output_api))
    results.extend(
        input_api.canned_checks.CheckGenderNeutral(input_api, output_api))
    return results


def _CommonChecks(input_api, output_api):
    """Checks common to both upload and commit."""
    results = []
    results.extend(
        input_api.canned_checks.CheckAuthorizedAuthor(
            input_api, output_api, bot_allowlist=[AUTOROLL_ACCOUNT]))
    results.extend(_CheckBuildGN(input_api, output_api))
    results.extend(_CheckExperimentTelemetry(input_api, output_api))
    results.extend(_CheckGeneratedFiles(input_api, output_api))
    results.extend(_CheckJSON(input_api, output_api))
    results.extend(_CheckDevToolsStyleJS(input_api, output_api))
    results.extend(_CheckDevToolsStyleCSS(input_api, output_api))
    results.extend(_CheckFormat(input_api, output_api))
    results.extend(_CheckOptimizeSVGHashes(input_api, output_api))
    results.extend(_CheckChangesAreExclusiveToDirectory(input_api, output_api))
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
    results.extend(_CheckDevtoolsLocalization(input_api, output_api))
    # Run collectStrings after localization check that cleans up unused strings
    results.extend(_CollectStrings(input_api, output_api))
    # Run checks that rely on output from other DevTool checks
    results.extend(_SideEffectChecks(input_api, output_api))
    return results


def CheckChangeOnCommit(input_api, output_api):
    results = []
    results.extend(_CommonChecks(input_api, output_api))
    results.extend(_CheckDevtoolsLocalization(input_api, output_api, True))
    # Run collectStrings after localization check that cleans up unused strings
    results.extend(_CollectStrings(input_api, output_api))
    # Run checks that rely on output from other DevTool checks
    results.extend(_SideEffectChecks(input_api, output_api))
    results.extend(input_api.canned_checks.CheckChangeHasDescription(input_api, output_api))
    return results


def _getAffectedFiles(input_api, parent_directories, excluded_actions, accepted_endings):  # pylint: disable=invalid-name
    """Return absolute file paths of affected files (not due to an excluded action)
       under a parent directory with an accepted file ending.
    """
    local_paths = [
        f.AbsoluteLocalPath() for f in input_api.AffectedFiles() if all(f.Action() != action for action in excluded_actions)
    ]
    affected_files = [
        file_name for file_name in local_paths if any(parent_directory in file_name for parent_directory in parent_directories) and
        (len(accepted_endings) is 0 or any(file_name.endswith(accepted_ending) for accepted_ending in accepted_endings))
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


def _checkWithTypeScript(input_api,
                         output_api,
                         tsc_arguments,
                         script_path,
                         script_arguments=[]):  # pylint: disable=invalid-name
    original_sys_path = sys.path
    try:
        sys.path = sys.path + [
            input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts')
        ]
        import devtools_paths
    finally:
        sys.path = original_sys_path

    # First run tsc to compile the TS script that we then run in the _ExecuteSubProcess call
    tsc_compiler_process = input_api.subprocess.Popen(
        [
            devtools_paths.node_path(),
            devtools_paths.typescript_compiler_path()
        ] + tsc_arguments,
        stdout=input_api.subprocess.PIPE,
        stderr=input_api.subprocess.STDOUT)

    out, _ = tsc_compiler_process.communicate()
    if tsc_compiler_process.returncode != 0:
        return [
            output_api.PresubmitError('Error compiling briges regenerator:\n' +
                                      str(out))
        ]

    return _checkWithNodeScript(input_api, output_api, script_path,
                                script_arguments)


def _getFilesToLint(input_api, output_api, lint_config_files,
                    default_linted_directories, accepted_endings, results):
    run_full_check = False
    files_to_lint = []

    # We are changing the lint configuration; run the full check.
    if len(lint_config_files) is not 0:
        results.append(
            output_api.PresubmitNotifyResult('Running full lint check'))
        run_full_check = True
    else:
        # Only run the linter on files that are relevant, to save PRESUBMIT time.
        files_to_lint = _getAffectedFiles(input_api,
                                          default_linted_directories, ['D'],
                                          accepted_endings)

        # Exclude front_end/third_party files.
        files_to_lint = filter(lambda path: "third_party" not in path,
                               files_to_lint)

        if len(files_to_lint) is 0:
            results.append(
                output_api.PresubmitNotifyResult(
                    'No affected files for lint check'))

    should_bail_out = len(files_to_lint) is 0 and not run_full_check
    return should_bail_out, files_to_lint
