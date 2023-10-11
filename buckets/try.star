load(
    "//lib/builders.star",
    "acls",
    "builder",
    "builder_coverage",
    "cq_acls",
    "cq_retry_config",
    "default_timeout",
    "defaults",
    "dimensions",
)

BUCKET_NAME = "try"
SERVICE_ACCOUNT = "devtools-frontend-try-builder@chops-service-accounts.iam.gserviceaccount.com"

luci.bucket(
    name = BUCKET_NAME,
    acls = [
        acls.readers,
        acl.entry(
            roles = acl.BUILDBUCKET_TRIGGERER,
            groups = [
                "project-devtools-tryjob-access",
                "service-account-cq",
            ],
        ),
    ],
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
        service_account = SERVICE_ACCOUNT,
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
        execution_timeout = 5 * time.minute,
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
        "parallel": True,
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
    properties = {"run_experimental_steps": True, "parallel": True},
)

builder_coverage(
    covered_oss = ["mac"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_%s_rel",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout,
    properties = {"clobber": True, "parallel": True},
)

builder_coverage(
    covered_oss = ["linux", "win64"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_%s_rel",
    recipe_name = "devtools/devtools-frontend",
    properties = {"parallel": True},
)

builder_coverage(
    covered_oss = ["linux", "mac"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_sequential_%s_rel",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout + 15 * time.minute,
    priority = 50,
    properties = {"parallel": False},
)

builder_coverage(
    covered_oss = ["linux", "win64", "mac"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_shuffled_parallel_%s_rel",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout + 15 * time.minute,
    priority = 50,
    properties = {"parallel": True},
)

builder_coverage(
    covered_oss = ["win64"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_sequential_%s_rel",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout + 15 * time.minute,
    priority = 50,
    properties = {"parallel": False},
)

builder_coverage(
    covered_oss = ["linux"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_%s_dbg",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout,
    properties = {"builder_config": "Debug", "parallel": True},
)

builder_coverage(
    covered_oss = ["linux", "win64", "mac"],
    builder_factory = try_builder,
    builder_name_pattern = "e2e_stressor_%s",
    recipe_name = "devtools/dtf-e2e-stress",
    execution_timeout = default_timeout,
    priority = 50,
    properties = {"parallel": True},
)

builder_coverage(
    covered_oss = ["linux", "win64", "mac"],
    builder_factory = try_builder,
    builder_name_pattern = "e2e_stressor_sequential_%s",
    recipe_name = "devtools/dtf-e2e-stress",
    execution_timeout = default_timeout,
    priority = 50,
    properties = {"parallel": False},
)

builder_coverage(
    covered_oss = ["linux", "mac", "win64"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_screenshot_%s_rel",
    recipe_name = "devtools/dtf-screenshots",
    execution_timeout = 2 * time.hour,
)

luci.list_view(
    name = "tryserver",
    title = "Tryserver",
    favicon = defaults.favicon,
    entries = [luci.list_view_entry(builder = b) for b in try_builders],
)

cq_main = struct(
    builders = [
        "devtools_frontend_linux_blink_light_rel",
        "devtools_frontend_linux_blink_light_rel_fastbuild",
        "devtools_frontend_linux_dbg",
        "devtools_frontend_linux_dbg_fastbuild",
        "devtools_frontend_linux_rel",
        "devtools_frontend_sequential_linux_rel",
        "devtools_frontend_sequential_mac_rel",
        "devtools_frontend_sequential_win64_rel",
        "devtools_frontend_mac_rel",
        "devtools_frontend_win64_rel",
        "dtf_presubmit_linux",
        "dtf_presubmit_win64",
    ],
    experiment_builders = [
        # Quarantine a builder here
        # This will make them experiment 100%
        "devtools_frontend_mac_rel",
    ],
    includable_only_builders = [
        "devtools_frontend_linux_blink_light_rel",
        "devtools_screenshot_linux_rel",
        "devtools_screenshot_mac_rel",
        "devtools_screenshot_win64_rel",
        "devtools_frontend_sequential_linux_rel",
        "devtools_frontend_sequential_mac_rel",
        "devtools_frontend_sequential_win64_rel",
        "devtools_frontend_shuffled_parallel_linux_rel",
        "devtools_frontend_shuffled_parallel_mac_rel",
        "devtools_frontend_shuffled_parallel_win64_rel",
    ],
)

def experiment_builder(builder):
    if builder in cq_main.experiment_builders:
        return 100
    else:
        return None

def includable_only_builder(builder):
    return builder in cq_main.includable_only_builders

luci.cq_group(
    name = "main",
    watch = cq.refset(
        repo = "https://chromium.googlesource.com/devtools/devtools-frontend",
        refs = ["refs/heads/main"],
    ),
    acls = cq_acls,
    tree_status_host = "devtools-status.appspot.com",
    retry_config = cq_retry_config,
    verifiers = [
        luci.cq_tryjob_verifier(
            builder = builder,
            disable_reuse = ("presubmit" in builder),
            experiment_percentage = experiment_builder(builder),
            includable_only = includable_only_builder(builder),
        )
        for builder in cq_main.builders
    ],
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
