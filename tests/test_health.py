def test_health(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["status"] == "healthy" and data["database"] == "up"


def test_health_needs_no_authentication(client):
    assert client.get("/api/v1/health").status_code == 200


def test_health_reports_down_database_as_503(client, monkeypatch):
    from app.api.routes import health as health_module

    def broken_execute(*args, **kwargs):
        raise Exception("connection refused")

    monkeypatch.setattr("sqlalchemy.orm.Session.execute", broken_execute)
    r = client.get("/api/v1/health")
    assert r.status_code == 503
    assert r.json()["data"] == {"status": "unhealthy", "database": "down"}
    assert "connection refused" not in r.text
