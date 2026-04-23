import hashlib
import hmac
import logging
import os

import mercadopago
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.limiter import limiter
from app.middleware.auth_middleware import require_auth
from app.services.database import get_analysis, get_or_create_user, mark_analysis_paid
from app.utils import is_valid_uuid

logger = logging.getLogger("security")

router = APIRouter()

MP_WEBHOOK_SECRET = os.environ.get("MP_WEBHOOK_SECRET")
MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
PRODUCT_PRICE = float(os.getenv("PRODUCT_PRICE", "4.90"))


class CreatePaymentRequest(BaseModel):
    analysis_id: str


def _verify_mp_signature(x_signature: str, x_request_id: str, data_id: str, secret: str) -> bool:
    parts = {}
    for part in x_signature.split(","):
        if "=" in part:
            k, v = part.split("=", 1)
            parts[k.strip()] = v.strip()
    ts = parts.get("ts", "")
    v1 = parts.get("v1", "")
    if not ts or not v1:
        return False
    message = f"id:{data_id};request-id:{x_request_id};ts:{ts};"
    expected = hmac.new(secret.encode(), message.encode(),
                        hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, v1)


@router.post("/payment/create")
@limiter.limit("20/hour")
async def create_payment(
    request: Request,
    body: CreatePaymentRequest,
    current_user=Depends(require_auth),
):
    if not is_valid_uuid(body.analysis_id):
        raise HTTPException(status_code=400, detail="ID de análise inválido.")

    try:
        user = get_or_create_user(current_user.email)
        record = get_analysis(body.analysis_id)

        if record is None:
            raise HTTPException(status_code=404, detail="Análise não encontrada.")
        if record["user_id"] != user["id"]:
            logger.warning(
                "Unauthorized payment attempt: user %s tried to pay for analysis %s owned by %s",
                user["id"], body.analysis_id, record["user_id"],
            )
            raise HTTPException(status_code=403, detail="Acesso negado.")
        if record.get("paid"):
            raise HTTPException(status_code=400, detail="Esta análise já foi paga.")

        sdk = mercadopago.SDK(MP_ACCESS_TOKEN)

        preference_data = {
            "items": [
                {
                    "title": "ATS Analyzer - Resultado da Análise",
                    "quantity": 1,
                    "unit_price": PRODUCT_PRICE,
                    "currency_id": "BRL",
                }
            ],
            "payment_methods": {
                "excluded_payment_types": [
                    {"id": "ticket"},
                    {"id": "atm"},
                    {"id": "prepaid_card"},
                    {"id": "digital_currency"},
                ],
                "installments": 1,
            },
            "back_urls": {
                "success": f"{FRONTEND_URL}/payment/success?analysis_id={body.analysis_id}",
                "failure": f"{FRONTEND_URL}/payment/failure",
                "pending": f"{FRONTEND_URL}/payment/pending",
            },
            "external_reference": body.analysis_id,
            "notification_url": f"{BACKEND_URL}/api/payment/webhook",
        }

        preference_response = sdk.preference().create(preference_data)
        preference = preference_response.get("response", {})

        if "init_point" not in preference:
            raise HTTPException(
                status_code=500, detail="Erro ao criar preferência de pagamento.")

        return {"payment_url": preference["init_point"]}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unexpected error in create_payment for analysis %s", body.analysis_id)
        raise


@router.post("/payment/webhook")
async def payment_webhook(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    logger.info("MP_WEBHOOK_SECRET starts with: %s", MP_WEBHOOK_SECRET[:4] if MP_WEBHOOK_SECRET else "NONE")

    # Determine format from query params only — do not read body to detect format
    data_id = request.query_params.get("data.id")
    ipn_id = request.query_params.get("id")
    ipn_topic = request.query_params.get("topic")

    if ipn_id and ipn_topic:
        # Old IPN format: ?id=xxx&topic=payment — no signature, confirm via MP API
        if ipn_topic == "merchant_order":
            return {"status": "ok"}

        if ipn_topic != "payment":
            return {"status": "ok"}

        sdk = mercadopago.SDK(MP_ACCESS_TOKEN)
        payment_info = sdk.payment().get(int(ipn_id))
        payment_data = payment_info.get("response", {})

        if payment_data.get("status") == "approved":
            analysis_id = payment_data.get("external_reference")
            if analysis_id and is_valid_uuid(str(analysis_id)):
                try:
                    mark_analysis_paid(analysis_id)
                except Exception:
                    logger.exception("Failed to mark analysis %s as paid", analysis_id)

        return {"status": "ok"}

    # v2 format: ?data.id=xxx — requires HMAC signature
    if not data_id:
        logger.warning("Webhook missing both data.id and id/topic query params from %s", client_ip)
        return {"status": "ok"}

    if not MP_WEBHOOK_SECRET:
        logger.error("MP_WEBHOOK_SECRET not configured — rejecting webhook from %s", client_ip)
        raise HTTPException(status_code=403, detail="Webhook não configurado.")

    x_signature = request.headers.get("x-signature")
    x_request_id = request.headers.get("x-request-id")

    if not x_signature or not x_request_id:
        logger.warning("Webhook v2 missing signature headers from %s", client_ip)
        raise HTTPException(status_code=403, detail="Assinatura inválida.")

    if not _verify_mp_signature(x_signature, x_request_id, data_id, MP_WEBHOOK_SECRET):
        logger.warning("Webhook signature validation failed from %s", client_ip)
        raise HTTPException(status_code=403, detail="Assinatura inválida.")

    topic = request.query_params.get("type")
    if topic == "payment":
        sdk = mercadopago.SDK(MP_ACCESS_TOKEN)
        payment_info = sdk.payment().get(int(data_id))
        payment_data = payment_info.get("response", {})

        if payment_data.get("status") == "approved":
            analysis_id = payment_data.get("external_reference")
            if analysis_id and is_valid_uuid(str(analysis_id)):
                try:
                    mark_analysis_paid(analysis_id)
                except Exception:
                    logger.exception("Failed to mark analysis %s as paid", analysis_id)

    return {"status": "ok"}


@router.get("/payment/status/{analysis_id}")
@limiter.limit("120/hour")
async def payment_status(
    request: Request,
    analysis_id: str,
    current_user=Depends(require_auth),
):
    if not is_valid_uuid(analysis_id):
        raise HTTPException(status_code=400, detail="ID de análise inválido.")

    user = get_or_create_user(current_user.email)
    record = get_analysis(analysis_id)

    if record is None:
        raise HTTPException(status_code=404, detail="Análise não encontrada.")
    if record["user_id"] != user["id"]:
        logger.warning(
            "Unauthorized status check: user %s tried to check analysis %s owned by %s",
            user["id"], analysis_id, record["user_id"],
        )
        raise HTTPException(status_code=403, detail="Acesso negado.")

    return {"paid": bool(record.get("paid"))}
