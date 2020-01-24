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

EXCLUSIVE_CHANGE_DIRECTORIES = [
    [ 'third_party', 'v8' ],
    [ 'node_modules' ],
    [ 'OWNERS' ],
]

AUTOROLL_ACCOUNT = "devtools-ci-autoroll-builder@chops-service-accounts.iam.gserviceaccount.com"

def _CheckChangesAreExclusiveToDirectory(input_api, output_api):
    if input_api.change.DISABLE_THIRD_PARTY_CHECK != None:
        return []

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
            return [
                output_api
                .PresubmitError(('CLs that affect files in "%s" should be limited to these files/directories.' % dir_list) +
                                ' You can disable this check by adding DISABLE_THIRD_PARTY_CHECK=<reason> to your commit message')
            ]
    return []


def _CheckBuildGN(input_api, output_api):
    script_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts', 'check_gn.js')
    return _checkWithNodeScript(input_api, output_api, script_path)


def _CheckJSON(input_api, output_api):
    script_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts', 'json_validator', 'validate_module_json.js')
    return _checkWithNodeScript(input_api, output_api, script_path)


def _CheckLicenses(input_api, output_api):
    script_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts', 'test', 'run_license_header_check.js')
    return _checkWithNodeScript(input_api, output_api, script_path)


def _CheckUnitTests(input_api, output_api):
    unittest_root = input_api.os_path.join(input_api.PresubmitLocalPath(), 'test')
    affected_unittest_files = _getAffectedFiles(input_api, [unittest_root], ['D'], ['.ts'])
    if len(affected_unittest_files) == 0:
        return []

    script_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts', 'test', 'check_for_unittest_onlys.js')
    return _checkWithNodeScript(input_api, output_api, script_path, affected_unittest_files)


def _CheckFormat(input_api, output_api):

    def popen(args):
        return input_api.subprocess.Popen(args=args, stdout=input_api.subprocess.PIPE, stderr=input_api.subprocess.STDOUT)

    affected_files = _getAffectedJSFiles(input_api)
    if len(affected_files) == 0:
        return []
    original_sys_path = sys.path
    try:
        sys.path = sys.path + [input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts')]
        import devtools_paths
    finally:
        sys.path = original_sys_path

    ignore_files = []
    eslint_ignore_path = input_api.os_path.join(input_api.PresubmitLocalPath(), '.eslintignore')
    with open(eslint_ignore_path, 'r') as ignore_manifest:
        for line in ignore_manifest:
            ignore_files.append(input_api.os_path.normpath(line.strip()))
    formattable_files = [
        affected_file for affected_file in affected_files if all(ignore_file not in affected_file for ignore_file in ignore_files)
    ]
    if len(formattable_files) == 0:
        return []

    check_formatting_process = popen(['git', 'cl', 'format', '--js', '--dry-run'] + formattable_files)
    check_formatting_process.communicate()
    if check_formatting_process.returncode == 0:
        return []

    format_args = ['git', 'cl', 'format', '--js'] + formattable_files
    format_process = popen(format_args)
    format_out, _ = format_process.communicate()
    if format_process.returncode != 0:
        return [output_api.PresubmitError(format_out)]

    return [
        output_api.PresubmitError('ERROR: Found formatting violations.\n'
                                  'Ran clang-format on diff\n'
                                  'Use git status to check the formatting changes'),
        output_api.PresubmitError(format_out),
    ]


def _CheckDevtoolsLocalization(input_api, output_api, check_all_files=False):  # pylint: disable=invalid-name
    devtools_root = input_api.PresubmitLocalPath()
    script_path = input_api.os_path.join(devtools_root, 'scripts', 'test', 'run_localization_check.py')
    if check_all_files == True:
        # Scan all files and fix any errors
        args = ['--autofix', '--all']
    else:
        devtools_front_end = input_api.os_path.join(devtools_root, 'front_end')
        affected_front_end_files = _getAffectedFiles(input_api, [devtools_front_end], ['D'],
                                                     ['.js', '.grdp', '.grd', 'module.json'])

        if len(affected_front_end_files) == 0:
            return []
        # Scan only added or modified files with specific extensions.
        args = [
            '--autofix',
            '--files',
        ] + affected_front_end_files
    process = input_api.subprocess.Popen(
        [input_api.python_executable, script_path] + args, stdout=input_api.subprocess.PIPE, stderr=input_api.subprocess.STDOUT)
    out, _ = process.communicate()
    if process.returncode != 0:
        return [output_api.PresubmitError(out)]
    return [output_api.PresubmitNotifyResult(out)]


def _CheckDevtoolsStyle(input_api, output_api):
    lint_path = input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts', 'test', 'run_lint_check.py')
    process = input_api.subprocess.Popen([input_api.python_executable, lint_path],
                                         stdout=input_api.subprocess.PIPE,
                                         stderr=input_api.subprocess.STDOUT)
    out, _ = process.communicate()
    if process.returncode != 0:
        return [output_api.PresubmitError(out)]
    return [output_api.PresubmitNotifyResult(out)]


def _CheckOptimizeSVGHashes(input_api, output_api):
    if not input_api.platform.startswith('linux'):
        return []

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
        return []
    invalid_hash_file_names = [input_api.os_path.basename(file_path) for file_path in invalid_hash_file_paths]
    file_paths_str = ', '.join(invalid_hash_file_names)
    error_message = 'The following SVG files should be optimized using optimize_svg_images script before uploading: \n  - %s' % file_paths_str
    return [output_api.PresubmitError(error_message)]


def _CheckCSSViolations(input_api, output_api):
    results = []
    for f in input_api.AffectedFiles(include_deletes=False):
        if not f.LocalPath().endswith('.css'):
            continue
        for line_number, line in f.ChangedContents():
            if '/deep/' in line:
                results.append(output_api.PresubmitError(('%s:%d uses /deep/ selector') % (f.LocalPath(), line_number)))
            if '::shadow' in line:
                results.append(output_api.PresubmitError(('%s:%d uses ::shadow selector') % (f.LocalPath(), line_number)))
    return results


def _CheckNoUncheckedFiles(input_api, output_api):
    results = []
    process = input_api.subprocess.Popen(['git', 'diff', '--exit-code'],
                                         stdout=input_api.subprocess.PIPE,
                                         stderr=input_api.subprocess.STDOUT)
    out, _ = process.communicate()
    if process.returncode != 0:
        return [output_api.PresubmitError('You have changed files that need to be committed.')]
    return []


def _CommonChecks(input_api, output_api):
    """Checks common to both upload and commit."""
    results = []
    results.extend(input_api.canned_checks.CheckAuthorizedAuthor(input_api, output_api,
        bot_whitelist=[AUTOROLL_ACCOUNT]
    ))
    results.extend(input_api.canned_checks.CheckOwnersFormat(input_api, output_api))
    results.extend(input_api.canned_checks.CheckOwners(input_api, output_api))
    results.extend(input_api.canned_checks.CheckChangeHasNoCrAndHasOnlyOneEol(input_api, output_api))
    results.extend(input_api.canned_checks.CheckChangeHasNoStrayWhitespace(input_api, output_api))
    results.extend(input_api.canned_checks.CheckGenderNeutral(input_api, output_api))
    results.extend(_CheckBuildGN(input_api, output_api))
    results.extend(_CheckJSON(input_api, output_api))
    results.extend(_CheckLicenses(input_api, output_api))
    results.extend(_CheckDevtoolsStyle(input_api, output_api))
    results.extend(_CheckFormat(input_api, output_api))
    results.extend(_CheckOptimizeSVGHashes(input_api, output_api))
    results.extend(_CheckCSSViolations(input_api, output_api))
    results.extend(_CheckChangesAreExclusiveToDirectory(input_api, output_api))
    results.extend(_CheckUnitTests(input_api, output_api))
    results.extend(_CheckNoUncheckedFiles(input_api, output_api))
    return results


def CheckChangeOnUpload(input_api, output_api):
    results = []
    results.extend(_CommonChecks(input_api, output_api))
    results.extend(_CheckDevtoolsLocalization(input_api, output_api))
    return results


def CheckChangeOnCommit(input_api, output_api):
    results = []
    results.extend(_CommonChecks(input_api, output_api))
    results.extend(_CheckDevtoolsLocalization(input_api, output_api, True))
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
        file_name for file_name in local_paths
        if any(parent_directory in file_name for parent_directory in parent_directories) and any(
            file_name.endswith(accepted_ending) for accepted_ending in accepted_endings)
    ]
    return affected_files


def _getAffectedFrontEndFiles(input_api):
    devtools_root = input_api.PresubmitLocalPath()
    devtools_front_end = input_api.os_path.join(devtools_root, 'front_end')
    affected_front_end_files = _getAffectedFiles(input_api, [devtools_front_end], ['D'], ['.js'])
    return [input_api.os_path.relpath(file_name, devtools_root) for file_name in affected_front_end_files]


def _getAffectedJSFiles(input_api):
    devtools_root = input_api.PresubmitLocalPath()
    devtools_front_end = input_api.os_path.join(devtools_root, 'front_end')
    devtools_scripts = input_api.os_path.join(devtools_root, 'scripts')
    affected_js_files = _getAffectedFiles(input_api, [devtools_front_end, devtools_scripts], ['D'], ['.js'])
    return [input_api.os_path.relpath(file_name, devtools_root) for file_name in affected_js_files]


def _checkWithNodeScript(input_api, output_api, script_path, script_arguments=None):  # pylint: disable=invalid-name
    original_sys_path = sys.path
    try:
        sys.path = sys.path + [input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts')]
        import devtools_paths
    finally:
        sys.path = original_sys_path

    node_path = devtools_paths.node_path()

    if script_arguments is None:
        script_arguments = []

    process = input_api.subprocess.Popen(
        [node_path, script_path] + script_arguments, stdout=input_api.subprocess.PIPE, stderr=input_api.subprocess.STDOUT)
    out, _ = process.communicate()

    if process.returncode != 0:
        return [output_api.PresubmitError(out)]
    return [output_api.PresubmitNotifyResult(out)]
