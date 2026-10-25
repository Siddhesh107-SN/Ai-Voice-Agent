"""Application errors and centralized handlers producing one consistent JSON shape."""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base class for expected, user-facing errors."""

    status_code = 500
    error_code = "INTERNAL_ERROR"
    message = "Internal server error"

    def __init__(self, message: str | None = None, *, error_code: str | None = None,
                 headers: dict[str, str] | None = None) -> None:
        self.message = message or self.message
        self.error_code = error_code or self.error_code
        self.headers = headers
        super().__init__(self.message)


class BadRequestError(AppError):
    status_code, error_code, message = 400, "BAD_REQUEST", "Bad request"


class UnauthorizedError(AppError):
    status_code, error_code, message = 401, "NOT_AUTHENTICATED", "Not authenticated"

    def __init__(self, message: str | None = None, *, error_code: str | None = None) -> None:
        super().__init__(message, error_code=error_code, headers={"WWW-Authenticate": "Bearer"})


class TokenExpiredError(UnauthorizedError):
    error_code, message = "TOKEN_EXPIRED", "Token has expired"


class InvalidTokenError(UnauthorizedError):
    error_code, message = "INVALID_TOKEN", "Invalid token"


class ForbiddenError(AppError):
    status_code, error_code, message = 403, "FORBIDDEN", "You do not have permission to do this"


class NotFoundError(AppError):
    status_code, error_code, message = 404, "NOT_FOUND", "Resource not found"


class UnprocessableError(AppError):
    """Well-formed request that breaks a business rule (e.g. a date in the past)."""

    status_code, error_code, message = 422, "UNPROCESSABLE", "Request cannot be processed"


class ConflictError(AppError):
    status_code, error_code, message = 409, "CONFLICT", "Resource already exists"


_STATUS_CODES = {
    400: "BAD_REQUEST", 401: "NOT_AUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED", 409: "CONFLICT", 422: "VALIDATION_ERROR", 429: "RATE_LIMITED",
}


def _error_body(message: str, error_code: str, errors: list | None = None) -> dict:
    body: dict = {"success": False, "message": message, "error_code": error_code}
    if errors:
        body["errors"] = errors
    return body


async def _app_error(request: Request, exc: AppError) -> JSONResponse:
    _log_rejected(request, exc.status_code, exc.error_code, exc.message)
    return JSONResponse(_error_body(exc.message, exc.error_code), exc.status_code,
                        headers=exc.headers)


async def _validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Only field + message are returned: never echo submitted values (may hold passwords).
    errors = [
        {"field": ".".join(str(p) for p in e["loc"] if p != "body"), "message": e["msg"]}
        for e in exc.errors()
    ]
    _log_rejected(request, 422, "VALIDATION_ERROR", errors, getattr(exc, "body", None))
    return JSONResponse(_error_body("Validation failed", "VALIDATION_ERROR", errors), 422)


async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = _STATUS_CODES.get(exc.status_code, "HTTP_ERROR")
    return JSONResponse(_error_body(str(exc.detail), code), exc.status_code,
                        headers=getattr(exc, "headers", None))


async def _rate_limited(_: Request, __: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(_error_body("Too many requests, please slow down", "RATE_LIMITED"), 429)


async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(getattr(request, "state", None), "request_id", None)
    logger.error("Unhandled error [request_id=%s]", request_id, exc_info=exc)
    return JSONResponse(_error_body("Internal server error", "INTERNAL_ERROR"), 500)


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(RateLimitExceeded, _rate_limited)
    app.add_exception_handler(Exception, _unhandled)


def _log_rejected(request, status, code, detail, body=None):
    if status != 422:
        return
    import re
    path = re.sub(r"(/sarvam/)[^/]+", r"\1<token>", request.url.path)
    logger.warning("422 %s code=%s detail=%s body=%s", path, code, detail, None)
