from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from app.core.rate_limit import limiter
from app.otp_service import EmailConfigurationError, send_otp, verify_otp

router = APIRouter(prefix="/auth", tags=["otp"])

class EmailIn(BaseModel):
    email: EmailStr

class VerifyIn(BaseModel):
    email: EmailStr
    otp: str

@router.post("/send-otp")
@limiter.limit("5/minute")
def send_otp_route(request: Request, body: EmailIn):
    try:
        send_otp(body.email)
    except ValueError as e:
        raise HTTPException(429, str(e))
    except EmailConfigurationError:
        raise HTTPException(503, "OTP email service is not configured")
    except Exception:
        raise HTTPException(502, "Could not send email, try again")
    return {"message": "If the email is valid, a code has been sent."}

@router.post("/verify-otp")
@limiter.limit("10/minute")
def verify_otp_route(request: Request, body: VerifyIn):
    if not verify_otp(body.email, body.otp):
        raise HTTPException(400, "Invalid or expired code")
    # TODO: mark this user's email as verified in your database here
    return {"verified": True}