from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class OnboardingStatusResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    payment_status: str = Field(..., serialization_alias="paymentStatus")
    onboarding_stage: str | None = Field(None, serialization_alias="onboardingStage")
    business_name: str = Field(..., serialization_alias="businessName")
    package_name: str | None = Field(None, serialization_alias="packageName")
    amount: int | None = Field(None, serialization_alias="amount")
    currency: str = Field("INR", serialization_alias="currency")
    submitted_at: datetime | None = Field(None, serialization_alias="submittedAt")
    transaction_ref: str | None = Field(None, serialization_alias="transactionRef")
    rejection_reason: str | None = Field(None, serialization_alias="rejectionReason")
    dashboard_access_granted: bool = Field(..., serialization_alias="dashboardAccessGranted")
