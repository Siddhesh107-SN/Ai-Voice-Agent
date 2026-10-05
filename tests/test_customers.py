from tests.helpers import (PASSWORD, auth_headers, create_staff, login_token, make_appointment,
                           make_customer, register_ok)


def _admin(client):
    return register_ok(client, "admin@a.com", "Tenant A")["tokens"]["access_token"]


def test_create_get_update_delete_customer(client):
    token = _admin(client)
    headers = auth_headers(token)
    created = make_customer(client, token, "  Asha  ", "+91 98765-43210")
    assert created["name"] == "Asha" and created["phone"] == "+919876543210"

    got = client.get(f"/api/v1/customers/{created['id']}", headers=headers)
    assert got.status_code == 200 and got.json()["data"]["id"] == created["id"]

    upd = client.patch(f"/api/v1/customers/{created['id']}", headers=headers,
                       json={"name": "Asha K", "email": "ASHA@Example.com"})
    assert upd.json()["data"]["name"] == "Asha K"
    assert upd.json()["data"]["email"] == "asha@example.com"

    assert client.delete(f"/api/v1/customers/{created['id']}", headers=headers).status_code == 200
    assert client.get(f"/api/v1/customers/{created['id']}", headers=headers).status_code == 404


def test_invalid_phone_and_missing_fields_rejected(client):
    headers = auth_headers(_admin(client))
    for body in ({"name": "X", "phone": "abc"}, {"name": "X", "phone": "123"}, {"phone": "+919876543210"}):
        assert client.post("/api/v1/customers", headers=headers, json=body).status_code == 422


def test_duplicate_phone_in_same_tenant_conflicts(client):
    token = _admin(client)
    make_customer(client, token, "One", "+919876543210")
    resp = client.post("/api/v1/customers", headers=auth_headers(token),
                       json={"name": "Two", "phone": "+91 98765 43210"})
    assert resp.status_code == 409 and resp.json()["error_code"] == "CUSTOMER_PHONE_EXISTS"


def test_update_to_existing_phone_conflicts(client):
    token = _admin(client)
    make_customer(client, token, "One", "+919876543210")
    two = make_customer(client, token, "Two", "+919876543211")
    resp = client.patch(f"/api/v1/customers/{two['id']}", headers=auth_headers(token),
                        json={"phone": "+919876543210"})
    assert resp.status_code == 409


def test_list_search_and_pagination(client):
    token = _admin(client)
    for i in range(5):
        make_customer(client, token, f"Cust {i}", f"+91987654321{i}")
    headers = auth_headers(token)
    page = client.get("/api/v1/customers?page=2&limit=2", headers=headers).json()
    assert page["pagination"] == {"page": 2, "limit": 2, "total": 5} and len(page["data"]) == 2
    found = client.get("/api/v1/customers?search=Cust 3", headers=headers).json()
    assert [c["name"] for c in found["data"]] == ["Cust 3"]
    assert client.get("/api/v1/customers?limit=101", headers=headers).status_code == 422
    assert client.get("/api/v1/customers?page=0", headers=headers).status_code == 422


def test_staff_can_view_but_not_change_customers(client):
    admin_token = _admin(client)
    cust = make_customer(client, admin_token)
    create_staff(client, admin_token, "staff@a.com")
    staff = auth_headers(login_token(client, "staff@a.com"))
    assert client.get("/api/v1/customers", headers=staff).status_code == 200
    assert client.get(f"/api/v1/customers/{cust['id']}", headers=staff).status_code == 200
    assert client.post("/api/v1/customers", headers=staff,
                       json={"name": "N", "phone": "+919000000000"}).status_code == 403
    assert client.patch(f"/api/v1/customers/{cust['id']}", headers=staff,
                        json={"name": "N"}).status_code == 403
    assert client.delete(f"/api/v1/customers/{cust['id']}", headers=staff).status_code == 403


def test_customer_with_appointments_cannot_be_deleted(client):
    token = _admin(client)
    cust = make_customer(client, token)
    make_appointment(client, token, cust["id"])
    resp = client.delete(f"/api/v1/customers/{cust['id']}", headers=auth_headers(token))
    assert resp.status_code == 409 and resp.json()["error_code"] == "CUSTOMER_HAS_RECORDS"
    assert client.get(f"/api/v1/customers/{cust['id']}", headers=auth_headers(token)).status_code == 200


def test_customers_require_authentication(client):
    assert client.get("/api/v1/customers").status_code == 401
