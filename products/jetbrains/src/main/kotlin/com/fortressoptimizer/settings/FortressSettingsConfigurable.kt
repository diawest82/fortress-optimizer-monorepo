package com.fortressoptimizer.settings

import com.intellij.openapi.options.Configurable
import java.awt.BorderLayout
import java.awt.Dimension
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import java.awt.Insets
import javax.swing.*

/**
 * Settings UI that appears under Preferences > Tools > Fortress Token Optimizer.
 */
class FortressSettingsConfigurable : Configurable {

    private var panel: JPanel? = null
    private var apiKeyField: JPasswordField? = null
    private var apiUrlField: JTextField? = null
    private var levelCombo: JComboBox<String>? = null
    private var providerCombo: JComboBox<String>? = null

    override fun getDisplayName(): String = "Fortress Token Optimizer"

    override fun createComponent(): JComponent {
        val form = JPanel(GridBagLayout())
        val gbc = GridBagConstraints().apply {
            fill = GridBagConstraints.HORIZONTAL
            insets = Insets(6, 8, 6, 8)
            anchor = GridBagConstraints.WEST
        }

        var row = 0

        // ── API Key ──────────────────────────────────────────────
        gbc.gridx = 0; gbc.gridy = row; gbc.weightx = 0.0
        form.add(JLabel("API Key:"), gbc)

        apiKeyField = JPasswordField(40).also {
            it.preferredSize = Dimension(300, it.preferredSize.height)
        }
        gbc.gridx = 1; gbc.weightx = 1.0
        form.add(apiKeyField, gbc)

        // ── API URL ──────────────────────────────────────────────
        row++
        gbc.gridx = 0; gbc.gridy = row; gbc.weightx = 0.0
        form.add(JLabel("API URL:"), gbc)

        apiUrlField = JTextField(40)
        gbc.gridx = 1; gbc.weightx = 1.0
        form.add(apiUrlField, gbc)

        // ── Optimization Level ───────────────────────────────────
        row++
        gbc.gridx = 0; gbc.gridy = row; gbc.weightx = 0.0
        form.add(JLabel("Optimization Level:"), gbc)

        levelCombo = JComboBox(FortressSettingsState.OPTIMIZATION_LEVELS)
        gbc.gridx = 1; gbc.weightx = 1.0
        form.add(levelCombo, gbc)

        // ── Default Provider ─────────────────────────────────────
        row++
        gbc.gridx = 0; gbc.gridy = row; gbc.weightx = 0.0
        form.add(JLabel("Default Provider:"), gbc)

        providerCombo = JComboBox(FortressSettingsState.PROVIDERS)
        gbc.gridx = 1; gbc.weightx = 1.0
        form.add(providerCombo, gbc)

        // ── Spacer ───────────────────────────────────────────────
        row++
        gbc.gridx = 0; gbc.gridy = row; gbc.weighty = 1.0
        form.add(JPanel(), gbc)

        // Wrap in a panel that pushes the form to the top
        panel = JPanel(BorderLayout()).apply {
            add(form, BorderLayout.NORTH)
        }

        reset() // populate fields from persisted state
        return panel!!
    }

    override fun isModified(): Boolean {
        val state = FortressSettingsState.instance
        return String(apiKeyField?.password ?: charArrayOf()) != state.apiKey
                || apiUrlField?.text != state.apiUrl
                || levelCombo?.selectedItem as? String != state.optimizationLevel
                || providerCombo?.selectedItem as? String != state.defaultProvider
    }

    override fun apply() {
        val state = FortressSettingsState.instance
        state.apiKey = String(apiKeyField?.password ?: charArrayOf())
        state.apiUrl = apiUrlField?.text?.ifBlank { FortressSettingsState.DEFAULT_API_URL }
            ?: FortressSettingsState.DEFAULT_API_URL
        state.optimizationLevel = levelCombo?.selectedItem as? String
            ?: FortressSettingsState.DEFAULT_OPTIMIZATION_LEVEL
        state.defaultProvider = providerCombo?.selectedItem as? String
            ?: FortressSettingsState.DEFAULT_PROVIDER
    }

    override fun reset() {
        val state = FortressSettingsState.instance
        apiKeyField?.text = state.apiKey
        apiUrlField?.text = state.apiUrl
        levelCombo?.selectedItem = state.optimizationLevel
        providerCombo?.selectedItem = state.defaultProvider
    }

    override fun disposeUIResources() {
        panel = null
        apiKeyField = null
        apiUrlField = null
        levelCombo = null
        providerCombo = null
    }
}
