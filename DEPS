# Copyright 2019 The Chromium Authors
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
  'build_revision': 'db1a1d1949500378f7586c94db75f207513660ea',

  'buildtools_url': 'https://chromium.googlesource.com/chromium/src/buildtools.git',
  'buildtools_revision': '50a7d12f66862195dc016dcf7c2ae251f4bab60b',

  'depot_tools_url': 'https://chromium.googlesource.com/chromium/tools/depot_tools.git',
  'depot_tools_revision': '8ab2a5350f71bb76f9fbc049e40e3504e79f3661',

  'inspector_protocol_url': 'https://chromium.googlesource.com/deps/inspector_protocol',
  'inspector_protocol_revision': '1ac1ec6d0c61c081cc73793e491b987beecccde1',

  # Keeping track of the last time we rolled the browser protocol files.
  'chromium_browser_protocol_revision' : '4f6641ccf734dca86f4994f2eb09775a34d441b1',

  'clang_format_url': 'https://chromium.googlesource.com/external/github.com/llvm/llvm-project/clang/tools/clang-format.git',
  'clang_format_revision': '37f6e68a107df43b7d7e044fd36a13cbae3413f2',

  'emscripten_tag': 'ade9d780ff17c88d81aa13860361743e3c1e1396',

  # GN CIPD package version.
  'gn_version': 'git_revision:81b24e01531ecf0eff12ec9359a555ec3944ec4e',

  'cmake_version': 'version:2@3.21.3',

  'llvm_url': 'https://chromium.googlesource.com/external/github.com/llvm/llvm-project/',
  'llvm_revision': '3c51ea3619e488db19cd26840ed46d58cfc7062f',

  'lldb_eval_url': 'https://chromium.googlesource.com/external/github.com/google/lldb-eval.git',
  'lldb_eval_revision': 'e87123a7e639bf1d86f24c37079570fb7fa00b72',

  # ninja CIPD package version.
  # https://chrome-infra-packages.appspot.com/p/infra/3pp/tools/ninja
  'ninja_version': 'version:3@1.12.1.chromium.4',

  # Chrome version used for tests. It should be regularly updated to
  # match the Canary version listed here:
  # https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json
  'chrome': '142.0.7420.5',

  # 'magic' text to tell depot_tools that git submodules should be accepted but
  # but parity with DEPS file is expected.
  'SUBMODULE_MIGRATION': 'True',

  # condition to allowlist deps for non-git-source processing.
  'non_git_source': 'True',

  # siso CIPD package version
  'siso_version': 'git_revision:e1e6b655eeb5da6f764ea736e9f5b1dbbd2859d6',
}

# Only these hosts are allowed for dependencies in this DEPS file.
# If you need to add a new host, contact chrome infrastructure team.
allowed_hosts = [
  'chromium.googlesource.com',
  'chrome-infra-packages.appspot.com',

  # TODO(b/337061377): Move into a separate allowed gcs bucket list.
  'chromium-nodejs',
]

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
        'version': 'version:3@0.25.1.chromium.2',
      }
    ],
    'dep_type': 'cipd',
    'condition': 'non_git_source',
  },

  'build': {
    'url': Var('build_url') + '@' + Var('build_revision'),
    'condition': 'build_with_chromium == False',
  },
  'third_party/siso': {
    'packages': [
      {
        'package': 'build/siso/${{platform}}',
        'version': Var('siso_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'not build_with_chromium and host_cpu != "s390" and host_os != "zos" and host_cpu != "ppc"',
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
        'package': 'infra/3pp/tools/ninja/${{platform}}',
        'version': Var('ninja_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'build_with_chromium == False',
  },
  # Pull down Node binaries for WebUI toolchain.
  'third_party/node/linux': {
    'dep_type': 'gcs',
    'condition': 'host_os == "linux" and build_with_chromium == False and non_git_source',
    'bucket': 'chromium-nodejs',
    'objects': [
        {
            'object_name': 'fa98c6432de572206bc5519f85e9c96bd518b039',
            'sha256sum': 'fb563633b5bfe2d4307075c54c6bb54664a3b5ec6bc811f5b15742720549007a',
            'size_bytes': 50288755,
            'generation': 1730835522207929,
            'output_file': 'node-linux-x64.tar.gz',
        },
    ],
  },
  'third_party/node/mac': {
      'dep_type': 'gcs',
      'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu != "arm64" and non_git_source',
      'bucket': 'chromium-nodejs',
      'objects': [
          {
              'object_name': '4c8952a65a1ce7a2e4cff6db68f9b7454c46349f',
              'sha256sum': 'fadb4530fbe6e35ed298848c66102a0aa7d92974789e6222c4eadee26a381e7e',
              'size_bytes': 45672893,
              'generation': 1730835514382259,
              'output_file': 'node-darwin-x64.tar.gz',
          },
      ],
  },
  'third_party/node/mac_arm64': {
      'dep_type': 'gcs',
      'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu == "arm64" and non_git_source',
      'bucket': 'chromium-nodejs',
      'objects': [
          {
              'object_name': '0886aa6a146cb5c213cb09b59ed1075982e4cb57',
              'sha256sum': 'd39e2d44d58bb89740b9aca1073959fc92edbdbbe810a5e48448e331cf72c196',
              'size_bytes': 44929037,
              'generation': 1730835518292126,
              'output_file': 'node-darwin-arm64.tar.gz',
          },
      ],
  },
  "scripts/ai_assistance/suite/outputs": {
    "dep_type": "gcs",
    'condition': 'checkout_ai_evals == True',
    "bucket": "chrome-devtools-ai-evals",
    "objects": [
      {
        "object_name": "8aaaea341cac9e6dad90a0685f4eeae39fabb9f655761eed9c3af16795a40f14",
        "sha256sum": "c2e5b18a77095451dbaae27cea913aace1fc267e8e9e0f0b4f297a6215eb5299",
        "size_bytes": 6801,
        "generation": 1756718606230139
      }
    ]
  },
  'third_party/node/win': {
      'dep_type': 'gcs',
      'condition': 'host_os == "win" and build_with_chromium == False and non_git_source',
      'bucket': 'chromium-nodejs',
      'objects': [
          {
              'object_name': '907d7e104e7389dc74cec7d32527c1db704b7f96',
              'sha256sum': '7447c4ece014aa41fb2ff866c993c708e5a8213a00913cc2ac5049ea3ffc230d',
              'size_bytes': 80511640,
              'generation': 1730835526374028,
              'output_file': 'node.exe',
          },
      ],
  },
}

hooks = [
  {
    # Ensure that the DEPS'd "depot_tools" has its self-update capability
    # disabled.
    'name': 'disable_depot_tools_selfupdate',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': [
        'vpython3',
        'third_party/depot_tools/update_depot_tools_toggle.py',
        '--disable',
    ],
  },

  # Pull Chrome binaries from CfT buckets.
  {
    'name': 'download_chrome_win',
    'pattern': '.',
    'condition': 'host_os == "win" and build_with_chromium == False',
    'action': [ 'vpython3',
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
    'action': [ 'vpython3',
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
    'action': [ 'vpython3',
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
    'action': [ 'vpython3',
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
    'action': ['vpython3', 'build/util/lastchange.py',
               '-o', 'build/util/LASTCHANGE'],
  },
  {
    'name': 'emscripten',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': ['vpython3', 'scripts/deps/download_emscripten.py', Var('emscripten_tag'), 'third_party/emscripten-releases'],
  },
  {
    'name': 'VS Code settings',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': [
      'vpython3',
      'third_party/node/node.py',
      '--output',
      # Silence the "Importing JSON modules" warning
      '--no-warnings=ExperimentalWarning',
      'scripts/deps/sync-vscode-settings.mjs'
    ]
  },
  {
    'name': 'configure_siso',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': ['python3',
               'build/config/siso/configure_siso.py',
               '--rbe_instance',
               'projects/rbe-chrome-untrusted/instances/default_instance',
               ],
  },
]

recursedeps = [
  'build',
  'buildtools',
]
