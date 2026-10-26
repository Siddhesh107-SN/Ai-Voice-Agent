from pydantic import BaseModel, EmailStr, Field


class ContactSubmitRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    email: EmailStr
    phone: str | None = Field(None, max_length=32)
    message: str = Field(..., min_length=1, max_length=2000)
    website: str | None = None  # honeypot field: must be empty
