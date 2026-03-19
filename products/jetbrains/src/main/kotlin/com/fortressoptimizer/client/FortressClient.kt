package com.fortressoptimizer.client

import com.fortressoptimizer.settings.FortressSettingsState
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

// ── Request / Response DTOs ──────────────────────────────────────────

data class OptimizeRequest(
    val prompt: String,
    val level: String = "balanced",
    val provider: String = "openai"
)

data class TokenStats(
    val original: Int,
    val optimized: Int,
    val savings: Int,
    @SerializedName("savings_percentage") val savingsPercentage: Double
)

data class OptimizationResult(
    @SerializedName("optimized_prompt") val optimizedPrompt: String,
    val technique: String
)

data class OptimizeResponse(
    @SerializedName("request_id") val requestId: String,
    val status: String,
    val optimization: OptimizationResult,
    val tokens: TokenStats
)

data class UsageResponse(
    val tier: String,
    @SerializedName("tokens_optimized") val tokensOptimized: Long,
    @SerializedName("tokens_saved") val tokensSaved: Long,
    val requests: Long,
    @SerializedName("tokens_limit") val tokensLimit: Long,
    @SerializedName("tokens_remaining") val tokensRemaining: Long,
    @SerializedName("rate_limit") val rateLimit: Int,
    @SerializedName("reset_date") val resetDate: String
)

data class ProviderInfo(
    val id: String,
    val name: String,
    val enabled: Boolean = true
)

data class ProvidersResponse(
    val providers: List<ProviderInfo>
)

data class ApiError(
    val error: String,
    val message: String? = null
)

class FortressApiException(message: String, val statusCode: Int = 0) : Exception(message)

// ── HTTP Client ──────────────────────────────────────────────────────

class FortressClient(
    private val baseUrl: String? = null,
    private val apiKey: String? = null
) {
    private val gson = Gson()
    private val httpClient: HttpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build()

    private fun resolvedBaseUrl(): String =
        (baseUrl ?: FortressSettingsState.instance.apiUrl).trimEnd('/')

    private fun resolvedApiKey(): String =
        apiKey ?: FortressSettingsState.instance.apiKey

    // ── Public API ───────────────────────────────────────────────────

    /**
     * Optimize a prompt via the Fortress backend.
     */
    fun optimize(
        prompt: String,
        level: String? = null,
        provider: String? = null
    ): OptimizeResponse {
        val settings = FortressSettingsState.instance
        val body = OptimizeRequest(
            prompt = prompt,
            level = level ?: settings.optimizationLevel,
            provider = provider ?: settings.defaultProvider
        )
        return post("/api/optimize", body, OptimizeResponse::class.java)
    }

    /**
     * Retrieve current usage statistics for the authenticated account.
     */
    fun getUsage(): UsageResponse {
        return get("/api/usage", UsageResponse::class.java)
    }

    /**
     * List available LLM providers.
     */
    fun getProviders(): List<ProviderInfo> {
        return get("/api/providers", ProvidersResponse::class.java).providers
    }

    // ── Internal helpers ─────────────────────────────────────────────

    private fun <T> get(path: String, responseType: Class<T>): T {
        val request = buildRequest(path)
            .GET()
            .build()
        return execute(request, responseType)
    }

    private fun <T> post(path: String, body: Any, responseType: Class<T>): T {
        val json = gson.toJson(body)
        val request = buildRequest(path)
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .header("Content-Type", "application/json")
            .build()
        return execute(request, responseType)
    }

    private fun buildRequest(path: String): HttpRequest.Builder {
        val key = resolvedApiKey()
        val url = "${resolvedBaseUrl()}$path"
        val builder = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(Duration.ofSeconds(30))
        if (key.isNotBlank()) {
            builder.header("Authorization", "Bearer $key")
            builder.header("X-API-Key", key)
        }
        return builder
    }

    private fun <T> execute(request: HttpRequest, responseType: Class<T>): T {
        val response: HttpResponse<String> = try {
            httpClient.send(request, HttpResponse.BodyHandlers.ofString())
        } catch (e: java.net.http.HttpConnectTimeoutException) {
            throw FortressApiException("Connection timed out. Check your network and API URL.")
        } catch (e: java.io.IOException) {
            throw FortressApiException("Network error: ${e.message}")
        }

        if (response.statusCode() == 401 || response.statusCode() == 403) {
            throw FortressApiException("Authentication failed. Please check your API key.", response.statusCode())
        }
        if (response.statusCode() == 429) {
            throw FortressApiException("Rate limit exceeded. Please wait and try again.", 429)
        }
        if (response.statusCode() !in 200..299) {
            val errorBody = try {
                gson.fromJson(response.body(), ApiError::class.java)
            } catch (_: Exception) { null }
            val msg = errorBody?.message ?: errorBody?.error ?: "HTTP ${response.statusCode()}"
            throw FortressApiException(msg, response.statusCode())
        }

        return gson.fromJson(response.body(), responseType)
    }
}
