package com.fortressoptimizer.settings

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage

/**
 * Persistent application-level settings for the Fortress Token Optimizer.
 *
 * Stored in the IDE config directory as `FortressSettings.xml`.
 */
@State(
    name = "com.fortressoptimizer.settings.FortressSettingsState",
    storages = [Storage("FortressSettings.xml")]
)
@Service(Service.Level.APP)
class FortressSettingsState : PersistentStateComponent<FortressSettingsState> {

    var apiKey: String = ""
    var apiUrl: String = DEFAULT_API_URL
    var optimizationLevel: String = DEFAULT_OPTIMIZATION_LEVEL
    var defaultProvider: String = DEFAULT_PROVIDER

    override fun getState(): FortressSettingsState = this

    override fun loadState(state: FortressSettingsState) {
        apiKey = state.apiKey
        apiUrl = state.apiUrl.ifBlank { DEFAULT_API_URL }
        optimizationLevel = state.optimizationLevel.ifBlank { DEFAULT_OPTIMIZATION_LEVEL }
        defaultProvider = state.defaultProvider.ifBlank { DEFAULT_PROVIDER }
    }

    companion object {
        const val DEFAULT_API_URL = "https://api.fortress-optimizer.com"
        const val DEFAULT_OPTIMIZATION_LEVEL = "balanced"
        const val DEFAULT_PROVIDER = "openai"

        val OPTIMIZATION_LEVELS = arrayOf("minimal", "balanced", "aggressive", "maximum")
        val PROVIDERS = arrayOf("openai", "anthropic", "google", "cohere")

        val instance: FortressSettingsState
            get() = ApplicationManager.getApplication().getService(FortressSettingsState::class.java)
    }
}
