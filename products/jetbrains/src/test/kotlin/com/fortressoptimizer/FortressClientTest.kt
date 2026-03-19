package com.fortressoptimizer

import com.fortressoptimizer.client.*
import com.google.gson.Gson
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

/**
 * Unit tests for [FortressClient].
 *
 * These tests use a lightweight embedded HTTP server (com.sun.net.httpserver)
 * so they do not require any external mock library for HTTP — only JUnit.
 */
class FortressClientTest {

    private val gson = Gson()
    private lateinit var server: com.sun.net.httpserver.HttpServer
    private lateinit var client: FortressClient
    private var baseUrl: String = ""

    // ── Setup / Teardown ─────────────────────────────────────────

    @Before
    fun setUp() {
        server = com.sun.net.httpserver.HttpServer.create(java.net.InetSocketAddress(0), 0)
        server.executor = null
        server.start()
        val port = server.address.port
        baseUrl = "http://localhost:$port"
        client = FortressClient(baseUrl = baseUrl, apiKey = "test-key-123")
    }

    @org.junit.After
    fun tearDown() {
        server.stop(0)
    }

    // ── /api/optimize ────────────────────────────────────────────

    @Test
    fun `optimize returns parsed response on success`() {
        val responseJson = gson.toJson(
            mapOf(
                "request_id" to "req-001",
                "status" to "success",
                "optimization" to mapOf(
                    "optimized_prompt" to "Tell me about dogs",
                    "technique" to "compression"
                ),
                "tokens" to mapOf(
                    "original" to 50,
                    "optimized" to 30,
                    "savings" to 20,
                    "savings_percentage" to 40.0
                )
            )
        )

        server.createContext("/api/optimize") { exchange ->
            // Verify auth header is present
            val auth = exchange.requestHeaders.getFirst("Authorization")
            assertEquals("Bearer test-key-123", auth)

            // Verify Content-Type
            val ct = exchange.requestHeaders.getFirst("Content-Type")
            assertTrue(ct.contains("application/json"))

            exchange.responseHeaders.add("Content-Type", "application/json")
            exchange.sendResponseHeaders(200, responseJson.toByteArray().size.toLong())
            exchange.responseBody.use { it.write(responseJson.toByteArray()) }
        }

        val result = client.optimize("Can you please tell me all about dogs in detail?")

        assertEquals("req-001", result.requestId)
        assertEquals("success", result.status)
        assertEquals("Tell me about dogs", result.optimization.optimizedPrompt)
        assertEquals("compression", result.optimization.technique)
        assertEquals(50, result.tokens.original)
        assertEquals(30, result.tokens.optimized)
        assertEquals(20, result.tokens.savings)
        assertEquals(40.0, result.tokens.savingsPercentage, 0.01)
    }

    @Test
    fun `optimize sends correct request body`() {
        var capturedBody = ""

        server.createContext("/api/optimize") { exchange ->
            capturedBody = exchange.requestBody.bufferedReader().readText()
            val resp = gson.toJson(
                mapOf(
                    "request_id" to "req-002",
                    "status" to "success",
                    "optimization" to mapOf("optimized_prompt" to "hi", "technique" to "trim"),
                    "tokens" to mapOf("original" to 10, "optimized" to 5, "savings" to 5, "savings_percentage" to 50.0)
                )
            )
            exchange.responseHeaders.add("Content-Type", "application/json")
            exchange.sendResponseHeaders(200, resp.toByteArray().size.toLong())
            exchange.responseBody.use { it.write(resp.toByteArray()) }
        }

        client.optimize("hello world", level = "aggressive", provider = "anthropic")

        val body = gson.fromJson(capturedBody, OptimizeRequest::class.java)
        assertEquals("hello world", body.prompt)
        assertEquals("aggressive", body.level)
        assertEquals("anthropic", body.provider)
    }

    // ── /api/usage ───────────────────────────────────────────────

    @Test
    fun `getUsage returns parsed usage response`() {
        val responseJson = gson.toJson(
            mapOf(
                "tier" to "pro",
                "tokens_optimized" to 150000,
                "tokens_saved" to 45000,
                "requests" to 320,
                "tokens_limit" to 500000,
                "tokens_remaining" to 350000,
                "rate_limit" to 60,
                "reset_date" to "2026-04-01"
            )
        )

        server.createContext("/api/usage") { exchange ->
            exchange.responseHeaders.add("Content-Type", "application/json")
            exchange.sendResponseHeaders(200, responseJson.toByteArray().size.toLong())
            exchange.responseBody.use { it.write(responseJson.toByteArray()) }
        }

        val usage = client.getUsage()

        assertEquals("pro", usage.tier)
        assertEquals(150000L, usage.tokensOptimized)
        assertEquals(45000L, usage.tokensSaved)
        assertEquals(320L, usage.requests)
        assertEquals(500000L, usage.tokensLimit)
        assertEquals(350000L, usage.tokensRemaining)
        assertEquals(60, usage.rateLimit)
        assertEquals("2026-04-01", usage.resetDate)
    }

    // ── /api/providers ───────────────────────────────────────────

    @Test
    fun `getProviders returns provider list`() {
        val responseJson = gson.toJson(
            mapOf(
                "providers" to listOf(
                    mapOf("id" to "openai", "name" to "OpenAI", "enabled" to true),
                    mapOf("id" to "anthropic", "name" to "Anthropic", "enabled" to true),
                    mapOf("id" to "google", "name" to "Google", "enabled" to false)
                )
            )
        )

        server.createContext("/api/providers") { exchange ->
            exchange.responseHeaders.add("Content-Type", "application/json")
            exchange.sendResponseHeaders(200, responseJson.toByteArray().size.toLong())
            exchange.responseBody.use { it.write(responseJson.toByteArray()) }
        }

        val providers = client.getProviders()

        assertEquals(3, providers.size)
        assertEquals("openai", providers[0].id)
        assertEquals("OpenAI", providers[0].name)
        assertTrue(providers[0].enabled)
        assertFalse(providers[2].enabled)
    }

    // ── Error handling ───────────────────────────────────────────

    @Test
    fun `optimize throws FortressApiException on 401`() {
        server.createContext("/api/optimize") { exchange ->
            val body = """{"error":"unauthorized","message":"Invalid API key"}"""
            exchange.sendResponseHeaders(401, body.toByteArray().size.toLong())
            exchange.responseBody.use { it.write(body.toByteArray()) }
        }

        try {
            client.optimize("test")
            fail("Expected FortressApiException")
        } catch (e: FortressApiException) {
            assertEquals(401, e.statusCode)
            assertTrue(e.message!!.contains("Authentication failed"))
        }
    }

    @Test
    fun `optimize throws FortressApiException on 429`() {
        server.createContext("/api/optimize") { exchange ->
            val body = """{"error":"rate_limited"}"""
            exchange.sendResponseHeaders(429, body.toByteArray().size.toLong())
            exchange.responseBody.use { it.write(body.toByteArray()) }
        }

        try {
            client.optimize("test")
            fail("Expected FortressApiException")
        } catch (e: FortressApiException) {
            assertEquals(429, e.statusCode)
            assertTrue(e.message!!.contains("Rate limit"))
        }
    }

    @Test
    fun `optimize throws FortressApiException on 500 with message`() {
        server.createContext("/api/optimize") { exchange ->
            val body = """{"error":"server_error","message":"Internal failure"}"""
            exchange.sendResponseHeaders(500, body.toByteArray().size.toLong())
            exchange.responseBody.use { it.write(body.toByteArray()) }
        }

        try {
            client.optimize("test")
            fail("Expected FortressApiException")
        } catch (e: FortressApiException) {
            assertEquals(500, e.statusCode)
            assertTrue(e.message!!.contains("Internal failure"))
        }
    }

    @Test
    fun `client sends X-API-Key header alongside Bearer`() {
        var xApiKey: String? = null
        var bearer: String? = null

        server.createContext("/api/usage") { exchange ->
            xApiKey = exchange.requestHeaders.getFirst("X-API-Key")
            bearer = exchange.requestHeaders.getFirst("Authorization")
            val resp = gson.toJson(
                mapOf(
                    "tier" to "free", "tokens_optimized" to 0, "tokens_saved" to 0,
                    "requests" to 0, "tokens_limit" to 10000, "tokens_remaining" to 10000,
                    "rate_limit" to 10, "reset_date" to "2026-04-01"
                )
            )
            exchange.responseHeaders.add("Content-Type", "application/json")
            exchange.sendResponseHeaders(200, resp.toByteArray().size.toLong())
            exchange.responseBody.use { it.write(resp.toByteArray()) }
        }

        client.getUsage()

        assertEquals("test-key-123", xApiKey)
        assertEquals("Bearer test-key-123", bearer)
    }

    // ── DTO serialization ────────────────────────────────────────

    @Test
    fun `OptimizeRequest serializes correctly`() {
        val req = OptimizeRequest("hello", "balanced", "openai")
        val json = gson.toJson(req)
        assertTrue(json.contains("\"prompt\":\"hello\""))
        assertTrue(json.contains("\"level\":\"balanced\""))
        assertTrue(json.contains("\"provider\":\"openai\""))
    }

    @Test
    fun `OptimizeResponse deserializes correctly`() {
        val json = """
        {
          "request_id": "r1",
          "status": "success",
          "optimization": {
            "optimized_prompt": "short",
            "technique": "trim"
          },
          "tokens": {
            "original": 100,
            "optimized": 60,
            "savings": 40,
            "savings_percentage": 40.0
          }
        }
        """.trimIndent()
        val resp = gson.fromJson(json, OptimizeResponse::class.java)
        assertEquals("r1", resp.requestId)
        assertEquals("short", resp.optimization.optimizedPrompt)
        assertEquals(40, resp.tokens.savings)
    }
}
