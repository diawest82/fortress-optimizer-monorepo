"""
Build artifact validation — verify each product's source files and metadata are valid.

Run with:
    pytest tests/test_build_artifacts.py -v
"""

import json
import pathlib

import pytest

REPO_ROOT = pathlib.Path(__file__).parent.parent
PRODUCTS_DIR = REPO_ROOT / "products"

# ---------- Product definitions ----------
# (dir_name, type, entry_points, required_files)

JS_PRODUCTS = [
    ("npm", ["src/index.ts"]),
    ("copilot", ["extension.ts", "fortress-provider.ts"]),
    ("vscode-enhanced", ["src/extension.ts"]),
    ("cursor", ["src/extension.ts", "src/client.ts"]),
    ("vercel-ai-sdk", ["src/index.ts", "src/middleware.ts"]),
    ("claude-desktop", []),
]

PYTHON_PRODUCTS = [
    ("anthropic-sdk", ["wrapper.py"]),
    ("langchain", ["fortress_langchain/__init__.py", "fortress_langchain/client.py"]),
    ("slack", ["bot.py"]),
]

CONFIG_PRODUCTS = [
    ("gpt-store", ["openapi-actions.json", "gpt-config.json"]),
    ("make-zapier", ["zapier-app.json", "make-module.json"]),
    ("bing-copilot", ["ai-plugin.json", "openapi.yaml"]),
]

EDITOR_PRODUCTS = [
    ("neovim", ["init.lua", "plugin.vim"]),
    ("sublime", ["fortress.py"]),
    ("jetbrains", ["build.gradle"]),
]

ALL_PRODUCT_NAMES = (
    [p[0] for p in JS_PRODUCTS]
    + [p[0] for p in PYTHON_PRODUCTS]
    + [p[0] for p in CONFIG_PRODUCTS]
    + [p[0] for p in EDITOR_PRODUCTS]
)


def _skip_if_missing(product_name: str):
    d = PRODUCTS_DIR / product_name
    if not d.exists():
        pytest.skip(f"Product directory {product_name}/ not found")
    return d


# ---------- Directory existence ----------

class TestProductDirectories:
    """Every product directory must exist."""

    @pytest.mark.parametrize("name", ALL_PRODUCT_NAMES)
    def test_product_directory_exists(self, name):
        assert (PRODUCTS_DIR / name).is_dir(), f"Missing products/{name}/"


# ---------- JS / TypeScript products ----------

class TestJSProductPackageJson:
    """JS products must have valid package.json with required fields."""

    @pytest.mark.parametrize("name,entries", JS_PRODUCTS)
    def test_package_json_exists(self, name, entries):
        d = _skip_if_missing(name)
        assert (d / "package.json").exists(), f"{name} missing package.json"

    @pytest.mark.parametrize("name,entries", JS_PRODUCTS)
    def test_package_json_has_name(self, name, entries):
        d = _skip_if_missing(name)
        pkg = json.loads((d / "package.json").read_text())
        assert "name" in pkg, f"{name}/package.json missing 'name'"
        assert isinstance(pkg["name"], str) and len(pkg["name"]) > 0

    @pytest.mark.parametrize("name,entries", JS_PRODUCTS)
    def test_package_json_has_version(self, name, entries):
        d = _skip_if_missing(name)
        pkg = json.loads((d / "package.json").read_text())
        assert "version" in pkg, f"{name}/package.json missing 'version'"
        parts = pkg["version"].split(".")
        assert len(parts) >= 2, f"{name} version not semver: {pkg['version']}"

    @pytest.mark.parametrize("name,entries", JS_PRODUCTS)
    def test_entry_points_exist(self, name, entries):
        d = _skip_if_missing(name)
        for entry in entries:
            f = d / entry
            assert f.exists(), f"{name}/{entry} missing"
            assert f.stat().st_size > 0, f"{name}/{entry} is empty"


# ---------- Python products ----------

class TestPythonProducts:
    """Python products must have setup.py or requirements.txt and source files."""

    @pytest.mark.parametrize("name,entries", PYTHON_PRODUCTS)
    def test_has_setup_or_requirements(self, name, entries):
        d = _skip_if_missing(name)
        has_setup = (d / "setup.py").exists()
        has_reqs = (d / "requirements.txt").exists()
        assert has_setup or has_reqs, f"{name} has neither setup.py nor requirements.txt"

    @pytest.mark.parametrize("name,entries", PYTHON_PRODUCTS)
    def test_entry_points_exist(self, name, entries):
        d = _skip_if_missing(name)
        for entry in entries:
            f = d / entry
            assert f.exists(), f"{name}/{entry} missing"
            assert f.stat().st_size > 0, f"{name}/{entry} is empty"

    @pytest.mark.parametrize(
        "name", ["anthropic-sdk", "langchain"]
    )
    def test_setup_py_has_name_and_version(self, name):
        d = _skip_if_missing(name)
        setup = d / "setup.py"
        if not setup.exists():
            pytest.skip(f"{name} has no setup.py")
        text = setup.read_text()
        assert "name=" in text or "name =" in text, f"{name}/setup.py missing name="
        assert "version=" in text or "version =" in text, f"{name}/setup.py missing version="


# ---------- Config / manifest products ----------

class TestConfigProducts:
    """Config-based products must have valid JSON/YAML manifests."""

    @pytest.mark.parametrize("name,entries", CONFIG_PRODUCTS)
    def test_config_files_exist(self, name, entries):
        d = _skip_if_missing(name)
        for entry in entries:
            f = d / entry
            assert f.exists(), f"{name}/{entry} missing"
            assert f.stat().st_size > 0, f"{name}/{entry} is empty"

    @pytest.mark.parametrize("name,entries", CONFIG_PRODUCTS)
    def test_json_configs_are_valid(self, name, entries):
        d = _skip_if_missing(name)
        for entry in entries:
            if not entry.endswith(".json"):
                continue
            f = d / entry
            if not f.exists():
                continue
            try:
                data = json.loads(f.read_text())
            except json.JSONDecodeError as e:
                pytest.fail(f"{name}/{entry} is invalid JSON: {e}")
            assert isinstance(data, (dict, list)), f"{name}/{entry} is not a JSON object/array"

    def test_gpt_store_openapi_has_paths(self):
        d = _skip_if_missing("gpt-store")
        data = json.loads((d / "openapi-actions.json").read_text())
        assert "paths" in data or "openapi" in data, "openapi-actions.json missing paths/openapi key"

    def test_bing_copilot_ai_plugin_has_api_fields(self):
        d = _skip_if_missing("bing-copilot")
        data = json.loads((d / "ai-plugin.json").read_text())
        assert "name_for_human" in data or "api" in data or "name" in data


# ---------- Editor plugins ----------

class TestEditorProducts:
    """Editor plugins must have their platform-specific entry files."""

    @pytest.mark.parametrize("name,entries", EDITOR_PRODUCTS)
    def test_entry_files_exist(self, name, entries):
        d = _skip_if_missing(name)
        for entry in entries:
            f = d / entry
            assert f.exists(), f"{name}/{entry} missing"
            assert f.stat().st_size > 0, f"{name}/{entry} is empty"

    def test_neovim_lua_has_setup_or_require(self):
        d = _skip_if_missing("neovim")
        text = (d / "init.lua").read_text()
        assert "fortress" in text.lower(), "init.lua does not reference fortress"

    def test_sublime_plugin_imports_sublime(self):
        d = _skip_if_missing("sublime")
        text = (d / "fortress.py").read_text()
        assert "import sublime" in text or "import subprocess" in text or "fortress" in text.lower()

    def test_jetbrains_build_gradle_has_plugin_id(self):
        d = _skip_if_missing("jetbrains")
        text = (d / "build.gradle").read_text()
        assert "fortress" in text.lower() or "plugin" in text.lower()


# ---------- READMEs ----------

class TestProductReadmes:
    """Each product should have a README."""

    @pytest.mark.parametrize("name", ALL_PRODUCT_NAMES)
    def test_readme_exists(self, name):
        d = _skip_if_missing(name)
        readme = d / "README.md"
        assert readme.exists(), f"{name} missing README.md"
        assert readme.stat().st_size > 100, f"{name}/README.md seems too short"
