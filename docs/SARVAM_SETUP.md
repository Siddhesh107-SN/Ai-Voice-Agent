# Sarvam setup for one client

This guide uses placeholders only. Replace `{CLIENT_ID}`, `{PUBLIC_API_BASE_URL}`, and `{TOKEN}` with the values shown for the client in the Talkaor platform. Never put a real token in prompts, source control, or screenshots.

> **Console limitation:** This repository cannot inspect or verify the Sarvam console UI, the names/availability of its webhook settings, how it stores secrets, or how it maps hook responses into agent variables. The configuration steps below describe the values Talkaor exposes; confirm the exact controls and supported formats in your Sarvam workspace.

## Configure the client

1. In Talkaor, open **Platform → AI agents**, link the client's Sarvam agent and phone number, then open that client's **Integration** view.
2. Set `PUBLIC_API_BASE_URL` on the Talkaor server so the integration view produces absolute URLs. Reopen Integration and copy the displayed URLs.
3. In the Sarvam console, configure the call-completed webhook using one supported option:
   - URL: `{PUBLIC_API_BASE_URL}/api/v1/webhooks/sarvam/{TOKEN}/{CLIENT_ID}/call-completed`; or
   - URL: `{PUBLIC_API_BASE_URL}/api/v1/webhooks/sarvam/{CLIENT_ID}/call-completed` and request header `X-Webhook-Token: {TOKEN}`.
   Use the URL and header name displayed by Integration rather than constructing them manually.
4. Generate a client tool token in Integration. Copy it once, save it in the Sarvam secret store as a secret (for example, `{TALKAOR_TOOL_TOKEN}`), and use the secret reference in each booking tool's request headers. For the header-based tool URLs, use `X-Tool-Token: {TALKAOR_TOOL_TOKEN}`. If the Sarvam console only supports bearer authentication, use `Authorization: Bearer {TALKAOR_TOOL_TOKEN}` if that format is supported by your configured Talkaor route. Do not paste the literal token into a prompt or agent description.
5. For each of the four tools—check-slot, book, reschedule, and cancel—copy the matching **Header-based tool URL** from Integration. Configure its request header with the current tool token. The legacy token-in-path URLs are shown only for compatibility.
6. Configure the agent's call-start/on-start hook with the displayed call-start URL and `X-Tool-Token: {TALKAOR_TOOL_TOKEN}`. Map the response's `service_active` value to an agent variable using the mapping facilities available in your Sarvam workspace.
7. Add this instruction to the agent prompt:

   > If service_active is false, apologise politely, say the service is unavailable right now, and end the call.

8. Place one test call. In Talkaor's super-admin dashboard, check **Webhook events** for the call-completed event, **Tool calls** for booking-tool requests, and **Monitoring** for usage, blocked calls, and legacy-token use.

## Retire the legacy shared token

After confirming that the client uses its own token for its tools, call-completed webhook, and call-start hook, disable the legacy shared token on the server by setting `SARVAM_LEGACY_SHARED_TOKEN_ENABLED=false`. Verify the client's test call and tool requests again after the change. The Integration screen's legacy-token notice is informational; it does not change server configuration.

## Troubleshooting

| Symptom | Check |
|---|---|
| No event arrived | Confirm the call-completed URL and its configured authentication header match Integration, the Talkaor base URL is publicly reachable, and the Sarvam console has saved the hook. Sarvam delivery/retry behavior must be checked in that console. |
| Unlinked agent warning | Confirm the provider agent ID and phone number are linked to the intended client in Talkaor, and that the event identifies the same agent or number. |
| Call not billed | Check **Webhook events** for a processed call-completed event and confirm it includes a recognized phone number and duration. Billing uses completed call records and rounds each call up to whole minutes. |
| Call-start gate blocked a call | Check the client's minutes and plan state in **Monitoring** and verify the configured call-start URL, token header, and the agent's `service_active` response mapping. Calls can be paused at the configured overage-grace threshold. |
