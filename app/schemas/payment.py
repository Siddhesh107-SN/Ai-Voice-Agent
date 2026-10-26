from pydantic import BaseModel


class PaymentManualSubmitResponse(BaseModel):
    success: bool = True
    submissionId: str
    message: str
    status: str
    source: str = "backend"
