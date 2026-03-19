/**
 * Tests for Fortress Token Optimizer - JetBrains Plugin
 *
 * Validates plugin.xml configuration, build.gradle settings,
 * Kotlin class structure, API client DTOs, and settings schema.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Load config files
// ---------------------------------------------------------------------------

const BASE = path.resolve(__dirname);

const pluginXml = fs.readFileSync(
  path.join(BASE, 'src/main/resources/META-INF/plugin.xml'),
  'utf-8',
);
const buildGradle = fs.readFileSync(path.join(BASE, 'build.gradle'), 'utf-8');
const clientKt = fs.readFileSync(
  path.join(BASE, 'src/main/kotlin/com/fortressoptimizer/client/FortressClient.kt'),
  'utf-8',
);
const settingsKt = fs.readFileSync(
  path.join(BASE, 'src/main/kotlin/com/fortressoptimizer/settings/FortressSettingsState.kt'),
  'utf-8',
);
const optimizeActionKt = fs.readFileSync(
  path.join(BASE, 'src/main/kotlin/com/fortressoptimizer/actions/OptimizeAction.kt'),
  'utf-8',
);
const showUsageActionKt = fs.readFileSync(
  path.join(BASE, 'src/main/kotlin/com/fortressoptimizer/actions/ShowUsageAction.kt'),
  'utf-8',
);

// =========================================================================
// plugin.xml - Identity
// =========================================================================

describe('plugin.xml - identity', () => {
  it('should have plugin id com.fortressoptimizer.intellij', () => {
    expect(pluginXml).toContain('<id>com.fortressoptimizer.intellij</id>');
  });

  it('should have name Fortress Token Optimizer', () => {
    expect(pluginXml).toContain('<name>Fortress Token Optimizer</name>');
  });

  it('should have vendor email', () => {
    expect(pluginXml).toContain('email="support@fortress-optimizer.com"');
  });

  it('should have vendor url', () => {
    expect(pluginXml).toContain('url="https://fortress-optimizer.com"');
  });

  it('should depend on com.intellij.modules.platform', () => {
    expect(pluginXml).toContain('<depends>com.intellij.modules.platform</depends>');
  });

  it('should have a non-empty description in CDATA', () => {
    expect(pluginXml).toContain('<![CDATA[');
    expect(pluginXml).toContain('Optimize your prompts');
  });
});

// =========================================================================
// plugin.xml - Actions
// =========================================================================

describe('plugin.xml - actions', () => {
  it('should define FortressGroup action group', () => {
    expect(pluginXml).toContain('id="FortressGroup"');
  });

  it('should add FortressGroup to ToolsMenu', () => {
    expect(pluginXml).toContain('group-id="ToolsMenu"');
  });

  it('should define FortressOptimize action', () => {
    expect(pluginXml).toContain('id="FortressOptimize"');
  });

  it('should map OptimizeAction class', () => {
    expect(pluginXml).toContain(
      'class="com.fortressoptimizer.actions.OptimizeAction"',
    );
  });

  it('should add FortressOptimize to EditorPopupMenu', () => {
    expect(pluginXml).toContain('group-id="EditorPopupMenu"');
  });

  it('should define keyboard shortcut ctrl shift O', () => {
    expect(pluginXml).toContain('first-keystroke="ctrl shift O"');
  });

  it('should define FortressUsage action', () => {
    expect(pluginXml).toContain('id="FortressUsage"');
  });

  it('should map ShowUsageAction class', () => {
    expect(pluginXml).toContain(
      'class="com.fortressoptimizer.actions.ShowUsageAction"',
    );
  });

  it('should have Lightning icon for OptimizeAction', () => {
    expect(pluginXml).toContain('icon="AllIcons.Actions.Lightning"');
  });
});

// =========================================================================
// plugin.xml - Extensions
// =========================================================================

describe('plugin.xml - extensions', () => {
  it('should register applicationService for settings', () => {
    expect(pluginXml).toContain('serviceImplementation="com.fortressoptimizer.settings.FortressSettingsState"');
  });

  it('should register settings configurable under tools', () => {
    expect(pluginXml).toContain('parentId="tools"');
    expect(pluginXml).toContain('displayName="Fortress Token Optimizer"');
  });

  it('should register status bar widget factory', () => {
    expect(pluginXml).toContain('id="com.fortressoptimizer.StatusWidget"');
    expect(pluginXml).toContain('FortressStatusWidgetFactory');
  });

  it('should define notification group with BALLOON display type', () => {
    expect(pluginXml).toContain('id="Fortress Notifications"');
    expect(pluginXml).toContain('displayType="BALLOON"');
  });

  it('should order status widget after encodingWidget', () => {
    expect(pluginXml).toContain('order="after encodingWidget"');
  });
});

// =========================================================================
// build.gradle
// =========================================================================

describe('build.gradle', () => {
  it('should use Kotlin JVM plugin', () => {
    expect(buildGradle).toContain("org.jetbrains.kotlin.jvm");
  });

  it('should use IntelliJ Gradle plugin', () => {
    expect(buildGradle).toContain("org.jetbrains.intellij");
  });

  it('should target Java 17', () => {
    expect(buildGradle).toContain('JavaVersion.VERSION_17');
  });

  it('should use Kotlin JVM toolchain 17', () => {
    expect(buildGradle).toContain('jvmToolchain(17)');
  });

  it('should depend on Gson', () => {
    expect(buildGradle).toContain('com.google.code.gson:gson');
  });

  it('should include JUnit 4 for testing', () => {
    expect(buildGradle).toContain('junit:junit:4.13.2');
  });

  it('should include Mockito for testing', () => {
    expect(buildGradle).toContain('mockito-core');
  });

  it('should target IntelliJ Community 2024.1', () => {
    expect(buildGradle).toContain("version = '2024.1'");
    expect(buildGradle).toContain("type = 'IC'");
  });

  it('should set group to com.fortressoptimizer', () => {
    expect(buildGradle).toContain("group 'com.fortressoptimizer'");
  });

  it('should set version to 1.0.0', () => {
    expect(buildGradle).toContain("version '1.0.0'");
  });

  it('should set sinceBuild to 241', () => {
    expect(buildGradle).toContain("sinceBuild.set(\"241\")");
  });

  it('should disable buildSearchableOptions', () => {
    expect(buildGradle).toContain('enabled = false');
  });
});

// =========================================================================
// FortressClient.kt - DTOs
// =========================================================================

describe('FortressClient.kt - DTOs', () => {
  it('should define OptimizeRequest data class', () => {
    expect(clientKt).toContain('data class OptimizeRequest');
  });

  it('OptimizeRequest should have prompt, level, provider fields', () => {
    expect(clientKt).toMatch(/val prompt:\s*String/);
    expect(clientKt).toMatch(/val level:\s*String/);
    expect(clientKt).toMatch(/val provider:\s*String/);
  });

  it('OptimizeRequest should default level to balanced', () => {
    expect(clientKt).toContain('level: String = "balanced"');
  });

  it('OptimizeRequest should default provider to openai', () => {
    expect(clientKt).toContain('provider: String = "openai"');
  });

  it('should define TokenStats data class with savings fields', () => {
    expect(clientKt).toContain('data class TokenStats');
    expect(clientKt).toContain('val savings: Int');
    expect(clientKt).toContain('val savingsPercentage: Double');
  });

  it('should define OptimizationResult with optimizedPrompt', () => {
    expect(clientKt).toContain('data class OptimizationResult');
    expect(clientKt).toContain('val optimizedPrompt: String');
  });

  it('should define OptimizeResponse with requestId and status', () => {
    expect(clientKt).toContain('data class OptimizeResponse');
    expect(clientKt).toContain('val requestId: String');
    expect(clientKt).toContain('val status: String');
  });

  it('should define UsageResponse with all usage fields', () => {
    expect(clientKt).toContain('data class UsageResponse');
    expect(clientKt).toContain('val tokensSaved: Long');
    expect(clientKt).toContain('val tokensLimit: Long');
    expect(clientKt).toContain('val rateLimit: Int');
  });

  it('should define ProviderInfo data class', () => {
    expect(clientKt).toContain('data class ProviderInfo');
    expect(clientKt).toContain('val id: String');
    expect(clientKt).toContain('val name: String');
  });

  it('should define FortressApiException with statusCode', () => {
    expect(clientKt).toContain('class FortressApiException');
    expect(clientKt).toContain('val statusCode: Int');
  });
});

// =========================================================================
// FortressClient.kt - HTTP Client
// =========================================================================

describe('FortressClient.kt - HTTP client', () => {
  it('should define FortressClient class', () => {
    expect(clientKt).toContain('class FortressClient');
  });

  it('should use Gson for JSON serialization', () => {
    expect(clientKt).toContain('private val gson = Gson()');
  });

  it('should set connect timeout to 10 seconds', () => {
    expect(clientKt).toContain('Duration.ofSeconds(10)');
  });

  it('should set request timeout to 30 seconds', () => {
    expect(clientKt).toContain('Duration.ofSeconds(30)');
  });

  it('should send both Authorization and X-API-Key headers', () => {
    expect(clientKt).toContain('"Authorization"');
    expect(clientKt).toContain('"X-API-Key"');
  });

  it('should have optimize() method posting to /api/optimize', () => {
    expect(clientKt).toContain('fun optimize(');
    expect(clientKt).toContain('"/api/optimize"');
  });

  it('should have getUsage() method getting /api/usage', () => {
    expect(clientKt).toContain('fun getUsage()');
    expect(clientKt).toContain('"/api/usage"');
  });

  it('should have getProviders() method', () => {
    expect(clientKt).toContain('fun getProviders()');
    expect(clientKt).toContain('"/api/providers"');
  });

  it('should handle 401/403 as auth errors', () => {
    expect(clientKt).toContain('response.statusCode() == 401');
    expect(clientKt).toContain('response.statusCode() == 403');
    expect(clientKt).toContain('Authentication failed');
  });

  it('should handle 429 as rate limit error', () => {
    expect(clientKt).toContain('response.statusCode() == 429');
    expect(clientKt).toContain('Rate limit exceeded');
  });

  it('should handle timeout exceptions', () => {
    expect(clientKt).toContain('HttpConnectTimeoutException');
    expect(clientKt).toContain('Connection timed out');
  });

  it('should handle IO exceptions as network errors', () => {
    expect(clientKt).toContain('java.io.IOException');
    expect(clientKt).toContain('Network error');
  });

  it('should resolve base URL from settings when not provided', () => {
    expect(clientKt).toContain('FortressSettingsState.instance.apiUrl');
  });

  it('should resolve API key from settings when not provided', () => {
    expect(clientKt).toContain('FortressSettingsState.instance.apiKey');
  });

  it('should trim trailing slash from base URL', () => {
    expect(clientKt).toContain("trimEnd('/')");
  });

  it('should set Content-Type to application/json for POST', () => {
    expect(clientKt).toContain('"Content-Type", "application/json"');
  });
});

// =========================================================================
// FortressSettingsState.kt
// =========================================================================

describe('FortressSettingsState.kt', () => {
  it('should be annotated with @State', () => {
    expect(settingsKt).toContain('@State(');
  });

  it('should store settings in FortressSettings.xml', () => {
    expect(settingsKt).toContain('Storage("FortressSettings.xml")');
  });

  it('should be an application-level service', () => {
    expect(settingsKt).toContain('Service.Level.APP');
  });

  it('should implement PersistentStateComponent', () => {
    expect(settingsKt).toContain('PersistentStateComponent<FortressSettingsState>');
  });

  it('should have apiKey field defaulting to empty string', () => {
    expect(settingsKt).toContain('var apiKey: String = ""');
  });

  it('should have default API URL', () => {
    expect(settingsKt).toContain('DEFAULT_API_URL = "https://api.fortress-optimizer.com"');
  });

  it('should have default optimization level balanced', () => {
    expect(settingsKt).toContain('DEFAULT_OPTIMIZATION_LEVEL = "balanced"');
  });

  it('should have default provider openai', () => {
    expect(settingsKt).toContain('DEFAULT_PROVIDER = "openai"');
  });

  it('should define 4 optimization levels', () => {
    expect(settingsKt).toContain('"minimal"');
    expect(settingsKt).toContain('"balanced"');
    expect(settingsKt).toContain('"aggressive"');
    expect(settingsKt).toContain('"maximum"');
  });

  it('should define supported providers', () => {
    expect(settingsKt).toContain('"openai"');
    expect(settingsKt).toContain('"anthropic"');
    expect(settingsKt).toContain('"google"');
    expect(settingsKt).toContain('"cohere"');
  });

  it('should provide singleton instance via companion object', () => {
    expect(settingsKt).toContain('val instance: FortressSettingsState');
    expect(settingsKt).toContain('ApplicationManager.getApplication().getService');
  });

  it('should restore defaults for blank values in loadState', () => {
    expect(settingsKt).toContain('ifBlank { DEFAULT_API_URL }');
    expect(settingsKt).toContain('ifBlank { DEFAULT_OPTIMIZATION_LEVEL }');
    expect(settingsKt).toContain('ifBlank { DEFAULT_PROVIDER }');
  });
});

// =========================================================================
// OptimizeAction.kt
// =========================================================================

describe('OptimizeAction.kt', () => {
  it('should extend AnAction', () => {
    expect(optimizeActionKt).toContain('class OptimizeAction : AnAction()');
  });

  it('should override actionPerformed', () => {
    expect(optimizeActionKt).toContain('override fun actionPerformed');
  });

  it('should override update for presentation', () => {
    expect(optimizeActionKt).toContain('override fun update');
  });

  it('should check for editor data', () => {
    expect(optimizeActionKt).toContain('CommonDataKeys.EDITOR');
  });

  it('should get selected text from selection model', () => {
    expect(optimizeActionKt).toContain('selectionModel.selectedText');
  });

  it('should warn when no text is selected', () => {
    expect(optimizeActionKt).toContain('Please select text to optimize');
  });

  it('should check API key before optimizing', () => {
    expect(optimizeActionKt).toContain('apiKey.isBlank()');
  });

  it('should run optimization as background task', () => {
    expect(optimizeActionKt).toContain('Task.Backgroundable');
  });

  it('should use WriteCommandAction to replace text', () => {
    expect(optimizeActionKt).toContain('WriteCommandAction.runWriteCommandAction');
  });

  it('should replace selected text with optimized result', () => {
    expect(optimizeActionKt).toContain('editor.document.replaceString');
  });

  it('should handle FortressApiException', () => {
    expect(optimizeActionKt).toContain('catch (ex: FortressApiException)');
  });

  it('should handle generic exceptions', () => {
    expect(optimizeActionKt).toContain('catch (ex: Exception)');
  });

  it('should only enable action when editor has selection', () => {
    expect(optimizeActionKt).toContain('editor.selectionModel.hasSelection()');
  });

  it('should show notification with savings details', () => {
    expect(optimizeActionKt).toContain('Optimized! Saved');
    expect(optimizeActionKt).toContain('tokens');
  });
});

// =========================================================================
// ShowUsageAction.kt
// =========================================================================

describe('ShowUsageAction.kt', () => {
  it('should extend AnAction', () => {
    expect(showUsageActionKt).toContain('class ShowUsageAction : AnAction()');
  });

  it('should check API key before fetching usage', () => {
    expect(showUsageActionKt).toContain('apiKey.isBlank()');
  });

  it('should fetch usage in background task', () => {
    expect(showUsageActionKt).toContain('Task.Backgroundable');
  });

  it('should display usage in info dialog', () => {
    expect(showUsageActionKt).toContain('Messages.showInfoMessage');
  });

  it('should show plan tier in usage message', () => {
    expect(showUsageActionKt).toContain('usage.tier');
  });

  it('should show tokens optimized', () => {
    expect(showUsageActionKt).toContain('usage.tokensOptimized');
  });

  it('should show tokens saved', () => {
    expect(showUsageActionKt).toContain('usage.tokensSaved');
  });

  it('should show rate limit', () => {
    expect(showUsageActionKt).toContain('usage.rateLimit');
  });

  it('should show reset date', () => {
    expect(showUsageActionKt).toContain('usage.resetDate');
  });

  it('should calculate usage percentage', () => {
    expect(showUsageActionKt).toContain('usedPct');
    expect(showUsageActionKt).toContain('tokensLimit');
  });

  it('should handle API exceptions', () => {
    expect(showUsageActionKt).toContain('catch (ex: FortressApiException)');
  });

  it('should format numbers with commas', () => {
    expect(showUsageActionKt).toContain('String.format("%,d"');
  });

  it('should only be visible when project is available', () => {
    expect(showUsageActionKt).toContain('e.project != null');
  });
});
