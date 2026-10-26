from pydantic import BaseModel, Field


class PinVerifyRequest(BaseModel):
    pin: str = Field(min_length=1, max_length=32)


class PinVerifyResponse(BaseModel):
    ok: bool = True
    elevation_token: str
    expires_in: int = 900


class PinChangeRequest(BaseModel):
    currentPin: str = ""
    newPin: str = Field(min_length=1, max_length=32)
    confirmPin: str = Field(min_length=1, max_length=32)


class PinChangeResponse(BaseModel):
    ok: bool = True
    message: str = "PIN changed successfully"
