from app.core.security import hash_password, verify_password


def test_hash_is_salted_and_verifies():
    h1, h2 = hash_password("Passw0rdX"), hash_password("Passw0rdX")
    assert h1 != h2
    assert verify_password("Passw0rdX", h1)
    assert not verify_password("passw0rdx", h1)


def test_verify_handles_malformed_hash():
    assert verify_password("x", "not-a-hash") is False
