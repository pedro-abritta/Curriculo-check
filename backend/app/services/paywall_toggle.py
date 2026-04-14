import os

# True = paywall ativo, False = resultado completo liberado sem pagamento
PAYWALL_ENABLED = os.getenv("PAYMENT_ENABLED", "true").lower() == "true"
