"""Shared model helpers: mixins, column types and enum helper."""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, JSON, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

# JSONB on PostgreSQL, plain JSON elsewhere (e.g. SQLite in quick tests).
JsonType = JSON().with_variant(JSONB(), "postgresql")


def str_enum(enum_cls: type[enum.Enum], name: str) -> Enum:
    """Store enums as VARCHAR (not native PG enums) so adding values needs no ALTER TYPE."""
    return Enum(
        enum_cls,
        name=name,
        native_enum=False,
        length=32,
        values_callable=lambda e: [m.value for m in e],
        validate_strings=True,
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
