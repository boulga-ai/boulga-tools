"""Webhook FedaPay — squelette, non actif en V1.

FedaPay n'est pas encore branche : les paliers sont attribues manuellement par l'admin
(PATCH /api/v1/admin/users/{id}/tier) le temps que le paiement soit integre. Ce squelette
est pret a etre complete : verification de signature (FEDAPAY_WEBHOOK_SECRET), creation de
la ligne subscriptions, mise a jour de profiles.current_tier.
"""

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/webhooks/fedapay", tags=["webhooks"])


@router.post("")
async def handle_fedapay_webhook(request: Request) -> JSONResponse:
    # TODO lors du branchement reel :
    # 1. Verifier la signature de la requete avec FEDAPAY_WEBHOOK_SECRET.
    # 2. Parser l'evenement (transaction.approved, transaction.declined, ...).
    # 3. Sur transaction.approved : inserer dans subscriptions, mettre a jour
    #    profiles.current_tier et quotas via service_role.
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={"detail": "Webhook FedaPay pas encore branche (V1.1)."},
    )
