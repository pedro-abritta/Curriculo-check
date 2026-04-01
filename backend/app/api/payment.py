import os
import traceback

import mercadopago
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.middleware.auth_middleware import require_auth
from app.services.database import get_analysis, get_or_create_user, mark_analysis_paid

router = APIRouter()


class CreatePaymentRequest(BaseModel):
    analysis_id: str


@router.post("/payment/create")
async def create_payment(
    body: CreatePaymentRequest,
    current_user=Depends(require_auth),
):
    print(">>> PAYMENT CREATE CHAMADO")
    try:
        print(">>> 1. Pegando usuário...")
        user = get_or_create_user(current_user.email)
        print(f">>> 2. Usuário: {user}")

        print(f">>> 3. Buscando análise: {body.analysis_id}")
        record = get_analysis(body.analysis_id)
        print(f">>> 4. Análise encontrada: {record is not None}")

        if record is None:
            raise HTTPException(
                status_code=404, detail="Análise não encontrada.")
        if record["user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Acesso negado.")
        if record.get("paid"):
            raise HTTPException(
                status_code=400, detail="Esta análise já foi paga.")

        print(">>> 5. Criando SDK Mercado Pago...")
        sdk = mercadopago.SDK(os.environ["PROD_MP_ACCESS_TOKEN"])

        preference_data = {
            "items": [
                {
                    "title": "ATS Analyzer - Resultado da Análise",
                    "quantity": 1,
                    "unit_price": 9.90,
                    "currency_id": "BRL",
                }
            ],
            "payment_methods": {
                "excluded_payment_types": [
                    {"id": "credit_card"},
                    {"id": "debit_card"},
                    {"id": "ticket"},
                    {"id": "atm"},
                    {"id": "prepaid_card"},
                    {"id": "digital_currency"},
                ],
                "installments": 1
            },
            "back_urls": {
                "success": f"http://localhost:3000/payment/success?analysis_id={body.analysis_id}",
                "failure": "http://localhost:3000/payment/failure",
                "pending": "http://localhost:3000/payment/pending",
            },
            "external_reference": body.analysis_id,
        }

        print(">>> 6. Chamando MP preference().create()...")
        preference_response = sdk.preference().create(preference_data)
        print(f">>> 7. Resposta MP: {preference_response}")
        preference = preference_response.get("response", {})

        if "init_point" not in preference:
            raise HTTPException(
                status_code=500, detail="Erro ao criar preferência de pagamento.")

        print(f">>> 8. init_point: {preference['init_point']}")
        return {"payment_url": preference["init_point"]}
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERRO PAYMENT CREATE: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise


@router.post("/payment/webhook")
async def payment_webhook(request: Request):
    try:
        body = await request.json()
    except Exception:
        return {"status": "ok"}

    topic = body.get("type") or body.get("topic")

    if topic == "payment":
        payment_id = body.get("data", {}).get("id") or body.get("id")
        if payment_id:
            sdk = mercadopago.SDK(os.environ["PROD_MP_ACCESS_TOKEN"])
            payment_info = sdk.payment().get(payment_id)
            payment_data = payment_info.get("response", {})

            if payment_data.get("status") == "approved":
                analysis_id = payment_data.get("external_reference")
                if analysis_id:
                    try:
                        mark_analysis_paid(analysis_id)
                    except Exception:
                        pass

    return {"status": "ok"}


@router.get("/payment/status/{analysis_id}")
async def payment_status(
    analysis_id: str,
    current_user=Depends(require_auth),
):
    user = get_or_create_user(current_user.email)
    record = get_analysis(analysis_id)

    if record is None:
        raise HTTPException(status_code=404, detail="Análise não encontrada.")
    if record["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Acesso negado.")

    return {"paid": bool(record.get("paid"))}
