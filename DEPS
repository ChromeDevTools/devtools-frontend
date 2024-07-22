# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

use_relative_paths = True
git_dependencies = 'SYNC'
gclient_gn_args_file = 'build/config/gclient_args.gni'
gclient_gn_args = [
]

vars = {
  'build_with_chromium': False,

  'build_url': 'https://chromium.googlesource.com/chromium/src/build.git',
  'build_revision': '7a8285c06acd753e6228263f48e5595e20ca1577',

  'buildtools_url': 'https://chromium.googlesource.com/chromium/src/buildtools.git',
  'buildtools_revision': '3ef44a2b92d5dd1faa5189a06f3a5febe6db2d58',

  'depot_tools_url': 'https://chromium.googlesource.com/chromium/tools/depot_tools.git',
  'depot_tools_revision': 'cba7859885743d3c9865e4f1c076a6f2b698932d',

  'inspector_protocol_url': 'https://chromium.googlesource.com/deps/inspector_protocol',
  'inspector_protocol_revision': '2915acabcf62efd7257c57bb8a443a7c389c65cb',

  # Keeping track of the last time we rollerd the browser protocol files.
  'chromium_browser_protocol_revision' : 'a51d9c64b04a596df7ca3a57a88d5427746fcda2',

  'clang_format_url': 'https://chromium.googlesource.com/external/github.com/llvm/llvm-project/clang/tools/clang-format.git',
  'clang_format_revision': '3c0acd2d4e73dd911309d9e970ba09d58bf23a62',

  'emscripten_tag': 'ade9d780ff17c88d81aa13860361743e3c1e1396',

  # GN CIPD package version.
  'gn_version': 'git_revision:b2afae122eeb6ce09c52d63f67dc53fc517dbdc8',

  'cmake_version': 'version:2@3.21.3',

  'llvm_url': 'https://chromium.googlesource.com/external/github.com/llvm/llvm-project/',
  'llvm_revision': '3c51ea3619e488db19cd26840ed46d58cfc7062f',

  'lldb_eval_url': 'https://chromium.googlesource.com/external/github.com/google/lldb-eval.git',
  'lldb_eval_revision': 'e87123a7e639bf1d86f24c37079570fb7fa00b72',

  # ninja CIPD package version.
  # https://chrome-infra-packages.appspot.com/p/infra/3pp/build_support/ninja-1_11_1/
  'ninja_version': 'version:2@1.11.1.chromium.2',

  # Chrome version used for tests. It should be regularly updated to
  # match the Canary version listed here:
  # https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json
  'chrome': '128.0.6611.0',

  # 'magic' text to tell depot_tools that git submodules should be accepted but
  # but parity with DEPS file is expected.
  'SUBMODULE_MIGRATION': 'True',

  # condition to allowlist deps for non-git-source processing.
  'non_git_source': 'True',
}

# Only these hosts are allowed for dependencies in this DEPS file.
# If you need to add a new host, contact chrome infrastracture team.
allowed_hosts = [ 'chromium.googlesource.com', 'chrome-infra-packages.appspot.com' ]

deps = {
  'third_party/clang-format/script': {
    'url': Var('clang_format_url') + '@' + Var('clang_format_revision'),
    'condition': 'build_with_chromium == False',
  },
  'third_party/cmake': {
    'packages': [{
      'package': 'infra/3pp/tools/cmake/${{platform}}',
      'version': Var('cmake_version')
    }],
    'dep_type':
      'cipd',
    'condition': 'checkout_cxx_debugging_extension_deps == True',
  },
  'extensions/cxx_debugging/third_party/llvm/src': {
    'url': Var('llvm_url') + '@' + Var('llvm_revision'),
    'condition': 'checkout_cxx_debugging_extension_deps == True',
  },
  'extensions/cxx_debugging/third_party/lldb-eval/src': {
    'url': Var('lldb_eval_url') + '@' + Var('lldb_eval_revision'),
    'condition': 'checkout_cxx_debugging_extension_deps == True',
  },

  'buildtools': {
    'url': Var('buildtools_url') + '@' + Var('buildtools_revision'),
    'condition': 'build_with_chromium == False',
  },

  'buildtools/linux64': {
    'packages': [
      {
        'package': 'gn/gn/linux-${{arch}}',
        'version': Var('gn_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'host_os == "linux" and build_with_chromium == False',
  },
  'buildtools/mac': {
    'packages': [
      {
        'package': 'gn/gn/mac-${{arch}}',
        'version': Var('gn_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'host_os == "mac" and build_with_chromium == False',
  },
  'buildtools/win': {
    'packages': [
      {
        'package': 'gn/gn/windows-amd64',
        'version': Var('gn_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'host_os == "win" and build_with_chromium == False',
  },
  'third_party/esbuild': {
    'packages': [
      {
        'package': 'infra/3pp/tools/esbuild/${{platform}}',
        'version': 'version:2@0.14.13.chromium.2',
      }
    ],
    'dep_type': 'cipd',
    'condition': 'non_git_source',
  },

  'build': {
    'url': Var('build_url') + '@' + Var('build_revision'),
    'condition': 'build_with_chromium == False',
  },
  'third_party/depot_tools': {
    'url': Var('depot_tools_url') + '@' + Var('depot_tools_revision'),
    'condition': 'build_with_chromium == False',
  },
  'third_party/inspector_protocol': {
    'url': Var('inspector_protocol_url') + '@' + Var('inspector_protocol_revision'),
    'condition': 'build_with_chromium == False',
  },
  'third_party/ninja': {
    'packages': [
      {
        'package': 'infra/3pp/build_support/ninja-1_11_1/${{platform}}',
        'version': Var('ninja_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'build_with_chromium == False',
  },
}

hooks = [
  # Pull down Node binaries for WebUI toolchain.
  {
    'name': 'node_linux64',
    'pattern': '.',
    'condition': 'host_os == "linux" and build_with_chromium == False',
    'action': [ 'python3',
                'third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--extract',
                '--no_auth',
                '--bucket', 'chromium-nodejs/20.11.0',
                '-s', 'third_party/node/linux/node-linux-x64.tar.gz.sha1',
    ],
  },
  {
    'name': 'node_mac',
    'pattern': '.',
    'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu != "arm64"',
    'action': [ 'python3',
                'third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--extract',
                '--no_auth',
                '--bucket', 'chromium-nodejs/20.11.0',
                '-s', 'third_party/node/mac/node-darwin-x64.tar.gz.sha1',
    ],
  },
    {
    'name': 'node_mac',
    'pattern': '.',
    'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu == "arm64"',
    'action': [ 'python3',
                'third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--extract',
                '--no_auth',
                '--bucket', 'chromium-nodejs/20.11.0',
                '-s', 'third_party/node/mac/node-darwin-arm64.tar.gz.sha1',
    ],
  },
  {
    'name': 'node_win',
    'pattern': '.',
    'condition': 'host_os == "win" and build_with_chromium == False',
    'action': [ 'python3',
                'third_party/depot_tools/download_from_google_storage.py',
                '--no_resume',
                '--no_auth',
                '--bucket', 'chromium-nodejs/20.11.0',
                '-s', 'third_party/node/win/node.exe.sha1',
    ],
  },

  {
    # Ensure that the DEPS'd "depot_tools" has its self-update capability
    # disabled.
    'name': 'disable_depot_tools_selfupdate',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': [
        'python3',
        'third_party/depot_tools/update_depot_tools_toggle.py',
        '--disable',
    ],
  },

  # Pull Chrome binaries from CfT buckets.
  {
    'name': 'download_chrome_win',
    'pattern': '.',
    'condition': 'host_os == "win" and build_with_chromium == False',
    'action': [ 'python3',
                'scripts/deps/download_chrome.py',
                '--url=https://storage.googleapis.com/chrome-for-testing-public/' + Var('chrome') + '/win64/chrome-win64.zip',
                '--target=third_party/chrome',
                '--rename_from=chrome-win64',
                '--rename_to=chrome-win',
                '--path_to_binary=chrome-win/chrome.exe',
                '--version_number=' + Var('chrome'),
    ],
  },
  {
    'name': 'download_chrome_mac',
    'pattern': '.',
    'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu != "arm64"',
    'action': [ 'python3',
                'scripts/deps/download_chrome.py',
                '--url=https://storage.googleapis.com/chrome-for-testing-public/' + Var('chrome') + '/mac-x64/chrome-mac-x64.zip',
                '--target=third_party/chrome',
                '--rename_from=chrome-mac-x64',
                '--rename_to=chrome-mac',
                '--path_to_binary=chrome-mac/Google Chrome for Testing.app/Contents',
                '--version_number=' + Var('chrome'),
    ],
  },
  {
    'name': 'download_chrome_mac',
    'pattern': '.',
    'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu == "arm64"',
    'action': [ 'python3',
                'scripts/deps/download_chrome.py',
                '--url=https://storage.googleapis.com/chrome-for-testing-public/' + Var('chrome') + '/mac-arm64/chrome-mac-arm64.zip',
                '--target=third_party/chrome',
                '--rename_from=chrome-mac-arm64',
                '--rename_to=chrome-mac',
                '--path_to_binary=chrome-mac/Google Chrome for Testing.app/Contents',
                '--version_number=' + Var('chrome'),
    ],
  },
  {
    'name': 'download_chrome_linux',
    'pattern': '.',
    'condition': 'host_os == "linux" and build_with_chromium == False',
    'action': [ 'python3',
                'scripts/deps/download_chrome.py',
                '--url=https://storage.googleapis.com/chrome-for-testing-public/' + Var('chrome') + '/linux64/chrome-linux64.zip',
                '--target=third_party/chrome',
                '--rename_from=chrome-linux64',
                '--rename_to=chrome-linux',
                '--path_to_binary=chrome-linux/chrome',
                '--version_number=' + Var('chrome'),
    ],
  },

  {
    # Update LASTCHANGE for build script timestamps
    'name': 'lastchange',
    'condition': 'build_with_chromium == False',
    'pattern': '.',
    'action': ['python3', 'build/util/lastchange.py',
               '-o', 'build/util/LASTCHANGE'],
  },
  {
    'name': 'emscripten',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': ['python3', 'scripts/deps/download_emscripten.py', Var('emscripten_tag'), 'third_party/emscripten-releases'],
  },
  {
    'name': 'VS Code settings',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': ['python3', 'third_party/node/node.py', '--output', 'scripts/deps/sync-vscode-settings.js']
  },
]

recursedeps = [
  'build',
  'buildtools',
]
