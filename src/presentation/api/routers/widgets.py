from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.application.use_cases.widgets import (
    ConfigureWidgetUseCase,
    CreateWidgetUseCase,
    DeleteWidgetUseCase,
    GetWidgetDataUseCase,
    RefreshWidgetUseCase,
    UpdateWidgetUseCase,
)
from src.presentation.api.dependencies import (
    TokenData,
    get_current_user,
    get_db,
    get_metric_repository,
    get_widget_repository,
)
from src.presentation.api.schemas import WidgetCreateRequest, WidgetResponse, WidgetUpdateRequest

router = APIRouter(prefix="/widgets", tags=["widgets"])


@router.post("", response_model=WidgetResponse, status_code=status.HTTP_201_CREATED)
def create_widget(
    payload: WidgetCreateRequest,
    current_user: TokenData = Depends(get_current_user),
    widget_repo=Depends(get_widget_repository),
    db: Session = Depends(get_db),
):
    if payload.dashboard_id is None:
        raise HTTPException(status_code=400, detail="dashboard_id is required")
    use_case = CreateWidgetUseCase(widget_repo)
    widget = use_case.execute(
        dashboard_id=payload.dashboard_id,
        name=payload.name,
        widget_type=payload.type,
        position=payload.position,
        config=payload.config,
        data_source_id=payload.data_source_id,
        query=payload.query,
    )
    db.commit()
    return WidgetResponse.model_validate(widget)


@router.get("/{widget_id}", response_model=WidgetResponse)
def get_widget(widget_id: str, widget_repo=Depends(get_widget_repository)):
    widget = widget_repo.get_by_id(widget_id)
    if widget is None:
        raise HTTPException(status_code=404, detail="Widget not found")
    return WidgetResponse.model_validate(widget)


@router.put("/{widget_id}", response_model=WidgetResponse)
def update_widget(
    widget_id: str,
    payload: WidgetUpdateRequest,
    widget_repo=Depends(get_widget_repository),
    db: Session = Depends(get_db),
):
    use_case = UpdateWidgetUseCase(widget_repo)
    updated = use_case.execute(widget_id, **payload.model_dump(exclude_unset=True))
    db.commit()
    return WidgetResponse.model_validate(updated)


@router.delete("/{widget_id}")
def delete_widget(widget_id: str, widget_repo=Depends(get_widget_repository), db: Session = Depends(get_db)):
    use_case = DeleteWidgetUseCase(widget_repo)
    use_case.execute(widget_id)
    db.commit()
    return {"message": "Widget deleted successfully"}


@router.post("/{widget_id}/refresh")
def refresh_widget(
    widget_id: str,
    widget_repo=Depends(get_widget_repository),
    metric_repo=Depends(get_metric_repository),
):
    data_use_case = GetWidgetDataUseCase(widget_repo, metric_repo)
    use_case = RefreshWidgetUseCase(data_use_case)
    return use_case.execute(widget_id)


@router.put("/{widget_id}/config", response_model=WidgetResponse)
def configure_widget(
    widget_id: str,
    config: dict,
    widget_repo=Depends(get_widget_repository),
    db: Session = Depends(get_db),
):
    use_case = ConfigureWidgetUseCase(widget_repo)
    configured = use_case.execute(widget_id, config)
    db.commit()
    return WidgetResponse.model_validate(configured)
