package com.fortressoptimizer.ui

import com.fortressoptimizer.client.FortressClient
import com.fortressoptimizer.settings.FortressSettingsState
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.wm.StatusBar
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.StatusBarWidgetFactory
import com.intellij.util.Consumer
import java.awt.Component
import java.awt.event.MouseEvent
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit

/**
 * Factory registered via `<statusBarWidgetFactory>` extension point.
 *
 * Creates [FortressStatusWidget] instances that show a compact
 * token-savings summary in the IDE status bar.
 */
class FortressStatusWidgetFactory : StatusBarWidgetFactory {

    override fun getId(): String = WIDGET_ID

    override fun getDisplayName(): String = "Fortress Token Optimizer"

    override fun isAvailable(project: Project): Boolean = true

    override fun createWidget(project: Project): StatusBarWidget =
        FortressStatusWidget(project)

    override fun disposeWidget(widget: StatusBarWidget) {
        (widget as? FortressStatusWidget)?.dispose()
    }

    override fun canBeEnabledOn(statusBar: StatusBar): Boolean = true

    companion object {
        const val WIDGET_ID = "com.fortressoptimizer.StatusWidget"
    }
}

// ── Widget implementation ────────────────────────────────────────────

class FortressStatusWidget(
    private val project: Project
) : StatusBarWidget, StatusBarWidget.TextPresentation {

    private var statusBar: StatusBar? = null
    private var displayText: String = "Fortress: \u2014"
    private var tooltipText: String = "Fortress Token Optimizer"

    private val scheduler = Executors.newSingleThreadScheduledExecutor { r ->
        Thread(r, "fortress-status-poller").apply { isDaemon = true }
    }
    private var pollFuture: ScheduledFuture<*>? = null

    // ── StatusBarWidget ──────────────────────────────────────────

    override fun ID(): String = FortressStatusWidgetFactory.WIDGET_ID

    override fun install(statusBar: StatusBar) {
        this.statusBar = statusBar
        startPolling()
    }

    override fun dispose() {
        pollFuture?.cancel(true)
        scheduler.shutdownNow()
    }

    override fun getPresentation(): StatusBarWidget.WidgetPresentation = this

    // ── TextPresentation ─────────────────────────────────────────

    override fun getText(): String = displayText

    override fun getTooltipText(): String = tooltipText

    override fun getAlignment(): Float = Component.CENTER_ALIGNMENT

    override fun getClickConsumer(): Consumer<MouseEvent>? = Consumer {
        // On click, show usage dialog (same as ShowUsageAction)
        if (FortressSettingsState.instance.apiKey.isBlank()) {
            Messages.showInfoMessage(
                project,
                "Configure your API key in Settings \u2192 Tools \u2192 Fortress Token Optimizer.",
                "Fortress Token Optimizer"
            )
            return@Consumer
        }
        ApplicationManager.getApplication().executeOnPooledThread {
            try {
                val usage = FortressClient().getUsage()
                val msg = "Tier: ${usage.tier}  |  Saved: ${formatCompact(usage.tokensSaved)} tokens  |  Remaining: ${formatCompact(usage.tokensRemaining)}"
                ApplicationManager.getApplication().invokeLater {
                    Messages.showInfoMessage(project, msg, "Fortress Usage")
                }
            } catch (ex: Exception) {
                ApplicationManager.getApplication().invokeLater {
                    Messages.showErrorDialog(project, "Could not fetch usage: ${ex.message}", "Fortress Token Optimizer")
                }
            }
        }
    }

    // ── Polling ──────────────────────────────────────────────────

    private fun startPolling() {
        pollFuture = scheduler.scheduleWithFixedDelay(::refreshStatus, 0, 60, TimeUnit.SECONDS)
    }

    private fun refreshStatus() {
        if (FortressSettingsState.instance.apiKey.isBlank()) {
            updateDisplay("Fortress: no key", "API key not configured")
            return
        }
        try {
            val usage = FortressClient().getUsage()
            val saved = formatCompact(usage.tokensSaved)
            val pct = if (usage.tokensLimit > 0) {
                String.format("%.0f%%", usage.tokensOptimized.toDouble() / usage.tokensLimit * 100)
            } else "n/a"
            updateDisplay(
                "Fortress: $saved saved",
                "Tier: ${usage.tier} | Used: $pct | Remaining: ${formatCompact(usage.tokensRemaining)} | Resets: ${usage.resetDate}"
            )
        } catch (_: Exception) {
            updateDisplay("Fortress: offline", "Unable to reach Fortress API")
        }
    }

    private fun updateDisplay(text: String, tooltip: String) {
        displayText = text
        tooltipText = tooltip
        ApplicationManager.getApplication().invokeLater {
            statusBar?.updateWidget(FortressStatusWidgetFactory.WIDGET_ID)
        }
    }

    private fun formatCompact(n: Long): String = when {
        n >= 1_000_000 -> String.format("%.1fM", n / 1_000_000.0)
        n >= 1_000 -> String.format("%.1fK", n / 1_000.0)
        else -> n.toString()
    }
}
