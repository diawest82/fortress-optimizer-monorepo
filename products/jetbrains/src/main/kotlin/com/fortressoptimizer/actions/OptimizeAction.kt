package com.fortressoptimizer.actions

import com.fortressoptimizer.client.FortressApiException
import com.fortressoptimizer.client.FortressClient
import com.fortressoptimizer.settings.FortressSettingsState
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.Task

/**
 * Editor action that optimizes the currently selected text via the Fortress API
 * and replaces the selection with the optimized result.
 *
 * Registered in plugin.xml as `FortressOptimize`.
 */
class OptimizeAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val editor = e.getData(CommonDataKeys.EDITOR) ?: return
        val project = e.project ?: return
        val selectionModel = editor.selectionModel
        val selectedText = selectionModel.selectedText

        if (selectedText.isNullOrBlank()) {
            notify(project, "Please select text to optimize.", NotificationType.WARNING)
            return
        }

        if (FortressSettingsState.instance.apiKey.isBlank()) {
            notify(project, "Fortress API key is not configured. Go to Settings \u2192 Tools \u2192 Fortress Token Optimizer.", NotificationType.ERROR)
            return
        }

        val selStart = selectionModel.selectionStart
        val selEnd = selectionModel.selectionEnd

        ProgressManager.getInstance().run(object : Task.Backgroundable(project, "Optimizing with Fortress\u2026", true) {
            override fun run(indicator: ProgressIndicator) {
                indicator.isIndeterminate = true
                indicator.text = "Sending prompt to Fortress API\u2026"

                try {
                    val client = FortressClient()
                    val response = client.optimize(selectedText)

                    val optimized = response.optimization.optimizedPrompt
                    val savings = response.tokens.savings
                    val pct = response.tokens.savingsPercentage

                    // Replace selected text on the EDT inside a write action
                    ApplicationManager.getApplication().invokeLater {
                        WriteCommandAction.runWriteCommandAction(project) {
                            editor.document.replaceString(selStart, selEnd, optimized)
                        }
                        notify(
                            project,
                            "Optimized! Saved $savings tokens (${String.format("%.1f", pct)}%). Technique: ${response.optimization.technique}",
                            NotificationType.INFORMATION
                        )
                    }
                } catch (ex: FortressApiException) {
                    ApplicationManager.getApplication().invokeLater {
                        notify(project, "Fortress API error: ${ex.message}", NotificationType.ERROR)
                    }
                } catch (ex: Exception) {
                    ApplicationManager.getApplication().invokeLater {
                        notify(project, "Unexpected error: ${ex.message}", NotificationType.ERROR)
                    }
                }
            }
        })
    }

    override fun update(e: AnActionEvent) {
        val editor = e.getData(CommonDataKeys.EDITOR)
        e.presentation.isEnabledAndVisible = editor != null && editor.selectionModel.hasSelection()
    }

    private fun notify(project: com.intellij.openapi.project.Project, content: String, type: NotificationType) {
        try {
            NotificationGroupManager.getInstance()
                .getNotificationGroup("Fortress Notifications")
                .createNotification(content, type)
                .notify(project)
        } catch (_: Exception) {
            // Fallback: the notification group may not be registered yet during tests
            com.intellij.notification.Notification(
                "Fortress Token Optimizer",
                "Fortress Token Optimizer",
                content,
                type
            ).notify(project)
        }
    }
}
