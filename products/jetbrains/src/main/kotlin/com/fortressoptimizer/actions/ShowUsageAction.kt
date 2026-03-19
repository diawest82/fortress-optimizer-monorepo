package com.fortressoptimizer.actions

import com.fortressoptimizer.client.FortressApiException
import com.fortressoptimizer.client.FortressClient
import com.fortressoptimizer.settings.FortressSettingsState
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.Task
import com.intellij.openapi.ui.Messages

/**
 * Action that fetches and displays the current account usage statistics
 * from the Fortress API in a modal dialog.
 *
 * Registered in plugin.xml as `FortressUsage` under the Tools menu.
 */
class ShowUsageAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        if (FortressSettingsState.instance.apiKey.isBlank()) {
            Messages.showErrorDialog(
                project,
                "Fortress API key is not configured.\nGo to Settings \u2192 Tools \u2192 Fortress Token Optimizer.",
                "Fortress Token Optimizer"
            )
            return
        }

        ProgressManager.getInstance().run(object : Task.Backgroundable(project, "Fetching Fortress usage\u2026", true) {
            override fun run(indicator: ProgressIndicator) {
                indicator.isIndeterminate = true
                indicator.text = "Contacting Fortress API\u2026"

                try {
                    val client = FortressClient()
                    val usage = client.getUsage()

                    val usedPct = if (usage.tokensLimit > 0) {
                        (usage.tokensOptimized.toDouble() / usage.tokensLimit * 100)
                    } else 0.0

                    val message = buildString {
                        appendLine("Plan Tier:           ${usage.tier}")
                        appendLine("Tokens Optimized:    ${formatNumber(usage.tokensOptimized)}")
                        appendLine("Tokens Saved:        ${formatNumber(usage.tokensSaved)}")
                        appendLine("Requests Made:       ${formatNumber(usage.requests)}")
                        appendLine("Token Limit:         ${formatNumber(usage.tokensLimit)}")
                        appendLine("Tokens Remaining:    ${formatNumber(usage.tokensRemaining)}")
                        appendLine("Usage:               ${String.format("%.1f", usedPct)}%")
                        appendLine("Rate Limit:          ${usage.rateLimit} req/min")
                        appendLine("Resets:              ${usage.resetDate}")
                    }

                    ApplicationManager.getApplication().invokeLater {
                        Messages.showInfoMessage(project, message, "Fortress Usage Statistics")
                    }
                } catch (ex: FortressApiException) {
                    ApplicationManager.getApplication().invokeLater {
                        Messages.showErrorDialog(project, "API error: ${ex.message}", "Fortress Token Optimizer")
                    }
                } catch (ex: Exception) {
                    ApplicationManager.getApplication().invokeLater {
                        Messages.showErrorDialog(project, "Error: ${ex.message}", "Fortress Token Optimizer")
                    }
                }
            }
        })
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }

    private fun formatNumber(n: Long): String = String.format("%,d", n)
}
