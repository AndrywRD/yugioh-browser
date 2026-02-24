from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.domain.entities import Alert
from src.domain.value_objects import Threshold
from src.infrastructure.persistence.models import AlertHistoryModel, AlertModel
from src.presentation.api.dependencies import (
    TokenData,
    get_alert_history_repository,
    get_alert_repository,
    get_current_user,
    get_db,
)
from src.presentation.api.schemas import AlertCreateRequest, AlertResponse, AlertUpdateRequest
from src.shared.utils import generate_uuid

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("", response_model=AlertResponse)
def create_alert(
    payload: AlertCreateRequest,
    current_user: TokenData = Depends(get_current_user),
    repo=Depends(get_alert_repository),
    db: Session = Depends(get_db),
):
    alert = Alert(
        id=generate_uuid(),
        user_id=current_user.user_id,
        widget_id=payload.widget_id,
        name=payload.name,
        threshold=Threshold(payload.condition.operator, payload.condition.threshold),
        severity=payload.severity,
        notification_channels=payload.notification_channels,
    )
    created = repo.create(alert)
    db.commit()
    return AlertResponse.model_validate(created)


@router.get("", response_model=list[AlertResponse])
def list_alerts(current_user: TokenData = Depends(get_current_user), repo=Depends(get_alert_repository)):
    rows = repo.list_by_user(current_user.user_id)
    return [AlertResponse.model_validate(item) for item in rows]


@router.put("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: str,
    payload: AlertUpdateRequest,
    current_user: TokenData = Depends(get_current_user),
    repo=Depends(get_alert_repository),
    db: Session = Depends(get_db),
):
    alert = repo.get_by_id(alert_id)
    if alert is None or alert.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Alert not found")

    data = payload.model_dump(exclude_unset=True)
    if "condition" in data and data["condition"] is not None:
        condition = data["condition"]
        alert.threshold = Threshold(condition["operator"], condition["threshold"])
    if data.get("name") is not None:
        alert.name = data["name"]
    if data.get("severity") is not None:
        alert.severity = data["severity"]
    if data.get("notification_channels") is not None:
        alert.notification_channels = data["notification_channels"]
    if data.get("is_active") is not None:
        alert.is_active = data["is_active"]

    updated = repo.update(alert)
    db.commit()
    return AlertResponse.model_validate(updated)


@router.delete("/{alert_id}")
def delete_alert(
    alert_id: str,
    current_user: TokenData = Depends(get_current_user),
    repo=Depends(get_alert_repository),
    db: Session = Depends(get_db),
):
    alert = repo.get_by_id(alert_id)
    if alert is None or alert.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Alert not found")
    repo.delete(alert_id)
    db.commit()
    return {"message": "Alert deleted successfully"}


@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: str,
    current_user: TokenData = Depends(get_current_user),
    history_repo=Depends(get_alert_history_repository),
    db: Session = Depends(get_db),
):
    rows = history_repo.list_all()
    row = next((item for item in rows if item.alert_id == alert_id and not item.acknowledged), None)
    if row is None:
        raise HTTPException(status_code=404, detail="No pending alert history entry found")

    history_repo.acknowledge(row.id, current_user.user_id)
    db.commit()
    return {"message": "Alert acknowledged", "alert_history_id": row.id}


@router.get("/history")
def alerts_history(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(AlertHistoryModel)
        .join(AlertModel, AlertHistoryModel.alert_id == AlertModel.id)
        .filter(AlertModel.user_id == current_user.user_id)
        .all()
    )
    return [
        {
            "id": row.id,
            "alert_id": row.alert_id,
            "metric_value": row.metric_value,
            "threshold": row.threshold,
            "message": row.message,
            "acknowledged": row.acknowledged,
            "triggered_at": row.triggered_at.isoformat() if row.triggered_at else None,
        }
        for row in rows
    ]
