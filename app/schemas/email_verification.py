from pydantic import BaseModel, Field


class EmailVerifyConfirmRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")


class EmailVerifyResponse(BaseModel):
    message: str
