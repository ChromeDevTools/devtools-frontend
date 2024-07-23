load(
    "//lib/builders.star",
    "TRY_ACCOUNT",
    "acls",
    "bucket",
    "builder",
    "builder_coverage",
    "cq_acls",
    "cq_retry_config",
    "default_timeout",
    "defaults",
    "dimensions",
    "recipe",
)

BUCKET_NAME = "try"

bucket(
    name = BUCKET_NAME,
    acls = [
        acls.readers,
        acl.entry(
            roles = acl.BUILDBUCKET_TRIGGERER,
            groups = [
                "project-devtools-tryjob-access",
                "service-account-cq",
            ],
            users = [TRY_ACCOUNT],
        ),
    ],
    led_service_accounts = [TRY_ACCOUNT],
    builders_can_led_trigger = True,
)

try_builders = []

def try_builder(properties = None, **kwargs):
    properties = properties or {}
    properties["$build/reclient"] = {
        "instance": "rbe-chromium-untrusted",
        "metrics_project": "chromium-reclient-metrics",
    }
    builder(
        bucket = BUCKET_NAME,
        builder_group = "tryserver.devtools-frontend",
        service_account = TRY_ACCOUNT,
        properties = properties,
        **kwargs
    )
    try_builders.append(kwargs["name"])

def presubmit_builder(name, dimensions, **kvargs):
    try_builder(
        name = name,
        recipe_name = "run_presubmit",
        dimensions = dimensions,
        properties = {
            "runhooks": True,
            "solution_name": "devtools-frontend",
        },
        priority = 25,
        execution_timeout = 10 * time.minute,
        **kvargs
    )

builder_coverage(
    covered_oss = ["linux", "win64"],
    builder_factory = presubmit_builder,
    builder_name_pattern = "dtf_presubmit_%s",
)

try_builder(
    name = "devtools_frontend_linux_blink_rel",
    recipe_name = "chromium_trybot",
    dimensions = dimensions.default_ubuntu,
    execution_timeout = 2 * time.hour,
    build_numbers = True,
)

try_builder(
    name = "devtools_frontend_linux_blink_light_rel",
    recipe_name = "chromium_trybot",
    dimensions = dimensions.beefy_ubuntu,
    execution_timeout = 2 * time.hour,
    build_numbers = True,
)

try_builder(
    name = "devtools_frontend_linux_blink_light_rel_fastbuild",
    recipe_name = "chromium_trybot",
    dimensions = dimensions.beefy_ubuntu,
    execution_timeout = 2 * time.hour,
    build_numbers = True,
    description_html = """
This is the same with <a href="https://ci.chromium.org/p/devtools-frontend/builders/try/devtools_frontend_linux_blink_light_rel">
devtools_frontend_linux_blink_light_rel</a> but has
devtools_skip_typecheck=True.""",
)

try_builder(
    name = "devtools_frontend_linux_dbg_fastbuild",
    recipe_name = "devtools/devtools-frontend",
    dimensions = dimensions.default_ubuntu,
    execution_timeout = default_timeout,
    properties = {
        "builder_config": "Debug",
        "devtools_skip_typecheck": True,
        "coverage": False,
    },
    description_html = """
This is the same with <a href="https://ci.chromium.org/p/devtools-frontend/builders/try/devtools_frontend_linux_dbg">
devtools_frontend_linux_dbg</a> but has devtools_skip_typecheck=True.""",
)

builder_coverage(
    covered_oss = ["linux", "win64", "mac"],
    builder_factory = try_builder,
    builder_name_pattern = "dtf_%s_experiments",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout,
    build_numbers = True,
    properties = {"run_experimental_steps": True},
)

builder_coverage(
    covered_oss = ["mac"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_%s_rel",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout,
    properties = {"clobber": True},
)

builder_coverage(
    covered_oss = ["mac_arm64"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_%s_rel",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout,
)

builder_coverage(
    covered_oss = ["linux", "win64"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_%s_rel",
    recipe_name = "devtools/devtools-frontend",
)

builder_coverage(
    covered_oss = ["linux", "win64", "mac", "mac_arm64"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_shuffled_%s_rel",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout + 15 * time.minute,
    priority = 50,
)

builder_coverage(
    covered_oss = ["linux"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_%s_dbg",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout,
    properties = {"builder_config": "Debug"},
)

builder_coverage(
    covered_oss = ["linux", "win64", "mac", "mac_arm64"],
    builder_factory = try_builder,
    builder_name_pattern = "e2e_stressor_%s",
    recipe_name = "devtools/dtf-e2e-stress",
    execution_timeout = default_timeout,
    priority = 50,
)

builder_coverage(
    covered_oss = ["linux", "mac", "win64"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_screenshot_%s_rel",
    recipe_name = "devtools/dtf-screenshots",
    execution_timeout = 2 * time.hour,
)

def try_pair(
        name,
        suffix,
        compiler_dimensions,
        swarming_target_os,
        swarming_target_cpu,
        properties = None):
    compilator_name = "%s_compile_%s" % (name, suffix)
    tester_properties = properties or {}
    tester_properties.update({
        "compilator_name": compilator_name,
        "target_os": swarming_target_os,
        "target_cpu": swarming_target_cpu,
    })
    try_builder(
        name = "%s_%s" % (name, suffix),
        recipe_name = "devtools/trybot_tester",
        dimensions = dimensions.multibot,
        build_numbers = True,
        properties = tester_properties,
    )
    try_builder(
        name = compilator_name,
        recipe_name = "devtools/compilator",
        dimensions = compiler_dimensions,
        build_numbers = True,
        properties = properties,
    )

try_pair("dtf_linux", "rel", dimensions.default_ubuntu, "Ubuntu-22.04", "x86-64")
try_pair("dtf_win64", "rel", dimensions.win10, "Windows-10-19045", "x86-64")
try_pair("dtf_mac", "rel", dimensions.mac, "Mac-14", "x86-64")
try_pair("dtf_mac_arm64", "rel", dimensions.mac, "Mac-14", "arm64")
try_pair(
    "dtf_linux",
    "dbg",
    dimensions.default_ubuntu,
    "Ubuntu-22.04",
    "x86-64",
    properties = {"builder_config": "Debug"},
)
try_pair(
    "dtf_linux",
    "dbg_fastbuild",
    dimensions.default_ubuntu,
    "Ubuntu-22.04",
    "x86-64",
    properties = {
        "builder_config": "Debug",
        "devtools_skip_typecheck": True,
    },
)

def cpp_debug_extension_try(suffix, extra_properties):
    properties = {"$build/reclient": {
        "instance": "rbe-chrome-trusted",
        "metrics_project": "chromium-reclient-metrics",
    }}
    properties.update(extra_properties or {})
    luci.builder(
        name = "cpp_debug_extension_%s" % suffix,
        bucket = "try",
        executable = recipe("devtools/backend"),
        service_account = TRY_ACCOUNT,
        dimensions = dimensions.default_ubuntu,
        properties = dict(
            upload_dwarf_binary = False,
            **properties
        ),
        build_numbers = True,
    )

cpp_debug_extension_try("e2e_dbg", extra_properties = {"e2e_builder": True, "builder_config": "Debug"})
cpp_debug_extension_try("e2e_rel", extra_properties = {"e2e_builder": True, "builder_config": "Release"})

luci.list_view(
    name = "tryserver",
    title = "Tryserver",
    favicon = defaults.favicon,
    entries = [luci.list_view_entry(builder = b) for b in try_builders],
)

cq_builders = struct(
    devtools_builders = [
        "cpp_debug_extension_e2e_dbg",
        "cpp_debug_extension_e2e_rel",
        "devtools_frontend_linux_dbg",
        "devtools_frontend_linux_dbg_fastbuild",
        "devtools_frontend_linux_rel",
        "devtools_frontend_mac_rel",
        "devtools_frontend_mac_arm64_rel",
        "devtools_frontend_win64_rel",
        "dtf_linux_dbg",
        "dtf_linux_dbg_fastbuild",
        "dtf_linux_rel",
        "dtf_mac_arm64_rel",
        "dtf_mac_rel",
        "dtf_win64_rel",
        "dtf_presubmit_linux",
        "dtf_presubmit_win64",
    ],
    chromium_builders = [
        "devtools_frontend_linux_blink_light_rel",
        "devtools_frontend_linux_blink_light_rel_fastbuild",
    ],
    experiment_builders = {
        # Quarantine a builder here
        # This will make them experiment with the given percentage
        "dtf_mac_arm64_rel": 100,
        "dtf_linux_dbg": 20,
        "dtf_linux_dbg_fastbuild": 20,
    },
    includable_only_builders = [
        "cpp_debug_extension_e2e_dbg",
        "cpp_debug_extension_e2e_rel",
        "devtools_frontend_linux_blink_light_rel",
        "devtools_frontend_linux_rel",
        "devtools_frontend_mac_rel",
        "devtools_frontend_mac_arm64_rel",
        "devtools_screenshot_linux_rel",
        "devtools_screenshot_mac_rel",
        "devtools_screenshot_mac_arm64_rel",
        "devtools_screenshot_win64_rel",
        "devtools_frontend_shuffled_linux_rel",
        "devtools_frontend_shuffled_mac_rel",
        "devtools_frontend_shuffled_win64_rel",
    ],
)

def experiment_builder(builder):
    return cq_builders.experiment_builders.get(builder, None)

def includable_only_builder(builder):
    return builder in cq_builders.includable_only_builders

def branch_verifiers(with_chromium = True):
    return [
        luci.cq_tryjob_verifier(
            builder = builder,
            disable_reuse = ("presubmit" in builder),
            experiment_percentage = experiment_builder(builder),
            includable_only = includable_only_builder(builder),
            location_filters = None if includable_only_builder(builder) else [
                cq.location_filter(path_regexp = "docs/.+", exclude = True),
                cq.location_filter(path_regexp = ".+\\.md", exclude = True),
            ],
        )
        for builder in cq_builders.devtools_builders + (
            cq_builders.chromium_builders if with_chromium else []
        )
    ]

luci.cq_group(
    name = "main",
    watch = cq.refset(
        repo = "https://chromium.googlesource.com/devtools/devtools-frontend",
        refs = ["refs/heads/main"],
    ),
    acls = cq_acls,
    tree_status_host = "devtools-status.appspot.com",
    retry_config = cq_retry_config,
    verifiers = branch_verifiers(),
)

luci.cq_group(
    name = "infra_config",
    watch = cq.refset(
        repo = "https://chromium.googlesource.com/devtools/devtools-frontend",
        refs = ["refs/heads/infra/config"],
    ),
    acls = cq_acls,
    retry_config = cq_retry_config,
    verifiers = [
        luci.cq_tryjob_verifier(builder = "dtf_presubmit_linux", disable_reuse = True),
    ],
)

luci.cq_group(
    name = "branch-cq",
    watch = cq.refset(
        repo = "https://chromium.googlesource.com/devtools/devtools-frontend",
        refs = ["refs/heads/chromium/.+"],
    ),
    retry_config = cq_retry_config,
    acls = cq_acls,
    verifiers = branch_verifiers(with_chromium = False),
)
