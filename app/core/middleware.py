"""Request correlation: every response carries an X-Request-ID, so a report from a user or a
line in the logs can be tied back to one specific request. Accepts an inbound id from a
trusted upstream proxy (e.g. a load balancer) so a trace can span multiple services."""
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

REQUEST_ID_HEADER = "X-Request-ID"


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers[REQUEST_ID_HEADER] = request_id
        return response
