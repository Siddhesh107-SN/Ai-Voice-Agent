def test_response_includes_request_id_header(client):
    resp = client.get("/api/v1/health")
    assert "X-Request-ID" in resp.headers and len(resp.headers["X-Request-ID"]) > 0


def test_inbound_request_id_is_echoed_back(client):
    resp = client.get("/api/v1/health", headers={"X-Request-ID": "my-trace-id-123"})
    assert resp.headers["X-Request-ID"] == "my-trace-id-123"


def test_two_requests_without_inbound_id_get_different_ids(client):
    first = client.get("/api/v1/health").headers["X-Request-ID"]
    second = client.get("/api/v1/health").headers["X-Request-ID"]
    assert first != second
