from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.application.services import DashboardService
from src.application.use_cases.dashboards import (
    CreateDashboardUseCase,
    DeleteDashboardUseCase,
    DuplicateDashboardUseCase,
    GetDashboardDataUseCase,
    UpdateDashboardUseCase,
)
from src.application.use_cases.widgets import CreateWidgetUseCase
from src.domain.exceptions import EntityNotFoundError
from src.infrastructure.monitoring import dashboards_created_total
from src.presentation.api.dependencies import (
    PermissionService,
    TokenData,
    get_current_user,
    get_dashboard_repository,
    get_db,
    get_metric_repository,
    get_widget_repository,
)
from src.presentation.api.schemas import (
    DashboardCreateRequest,
    DashboardDataResponse,
    DashboardResponse,
    DashboardUpdateRequest,
    WidgetCreateRequest,
    WidgetResponse,
)

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


@router.post("", response_model=DashboardResponse, status_code=status.HTTP_201_CREATED)
def create_dashboard(
    payload: DashboardCreateRequest,
    current_user: TokenData = Depends(get_current_user),
    dashboard_repo=Depends(get_dashboard_repository),
    db: Session = Depends(get_db),
):
    use_case = CreateDashboardUseCase(dashboard_repo)
    dashboard = use_case.execute(
        user_id=current_user.user_id,
        name=payload.name,
        description=payload.description,
        layout=payload.layout,
        refresh_interval=payload.refresh_interval,
        is_public=payload.is_public,
    )
    db.commit()

    dashboards_created_total.labels(user_role=current_user.role.value).inc()
    return DashboardResponse.model_validate(dashboard)


@router.get("", response_model=list[DashboardResponse])
def list_dashboards(
    current_user: TokenData = Depends(get_current_user),
    dashboard_repo=Depends(get_dashboard_repository),
):
    dashboards = dashboard_repo.list_by_user(current_user.user_id)
    return [DashboardResponse.model_validate(item) for item in dashboards]


@router.get("/{dashboard_id}", response_model=DashboardResponse)
def get_dashboard(
    dashboard_id: str,
    current_user: TokenData = Depends(get_current_user),
    dashboard_repo=Depends(get_dashboard_repository),
):
    dashboard = dashboard_repo.get_by_id(dashboard_id)
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if not PermissionService.can_view_dashboard(current_user, dashboard):
        raise HTTPException(status_code=403, detail="You do not have permission to view this dashboard")
    return DashboardResponse.model_validate(dashboard)


@router.get("/{dashboard_id}/data", response_model=DashboardDataResponse)
def get_dashboard_data(
    dashboard_id: str,
    current_user: TokenData = Depends(get_current_user),
    dashboard_repo=Depends(get_dashboard_repository),
    widget_repo=Depends(get_widget_repository),
    metric_repo=Depends(get_metric_repository),
):
    dashboard = dashboard_repo.get_by_id(dashboard_id)
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if not PermissionService.can_view_dashboard(current_user, dashboard):
        raise HTTPException(status_code=403, detail="You do not have permission to view this dashboard")

    service = DashboardService(widget_repo, metric_repo)
    use_case = GetDashboardDataUseCase(dashboard_repo, service)
    data = use_case.execute(dashboard_id)
    return DashboardDataResponse(**data)


@router.put("/{dashboard_id}", response_model=DashboardResponse)
def update_dashboard(
    dashboard_id: str,
    payload: DashboardUpdateRequest,
    current_user: TokenData = Depends(get_current_user),
    dashboard_repo=Depends(get_dashboard_repository),
    db: Session = Depends(get_db),
):
    dashboard = dashboard_repo.get_by_id(dashboard_id)
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if not PermissionService.can_edit_dashboard(current_user, dashboard):
        raise HTTPException(status_code=403, detail="You do not have permission to edit this dashboard")

    use_case = UpdateDashboardUseCase(dashboard_repo)
    updated = use_case.execute(dashboard_id, **payload.model_dump(exclude_unset=True))
    db.commit()
    return DashboardResponse.model_validate(updated)


@router.delete("/{dashboard_id}")
def delete_dashboard(
    dashboard_id: str,
    current_user: TokenData = Depends(get_current_user),
    dashboard_repo=Depends(get_dashboard_repository),
    db: Session = Depends(get_db),
):
    dashboard = dashboard_repo.get_by_id(dashboard_id)
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if not PermissionService.can_delete_dashboard(current_user, dashboard):
        raise HTTPException(status_code=403, detail="You do not have permission to delete this dashboard")

    use_case = DeleteDashboardUseCase(dashboard_repo)
    use_case.execute(dashboard_id)
    db.commit()
    return {"message": "Dashboard deleted successfully"}


@router.post("/{dashboard_id}/duplicate", response_model=DashboardResponse)
def duplicate_dashboard(
    dashboard_id: str,
    current_user: TokenData = Depends(get_current_user),
    dashboard_repo=Depends(get_dashboard_repository),
    db: Session = Depends(get_db),
):
    use_case = DuplicateDashboardUseCase(dashboard_repo)
    duplicated = use_case.execute(dashboard_id, current_user.user_id)
    db.commit()
    return DashboardResponse.model_validate(duplicated)


@router.post("/{dashboard_id}/widgets", response_model=WidgetResponse, status_code=status.HTTP_201_CREATED)
def create_widget_for_dashboard(
    dashboard_id: str,
    payload: WidgetCreateRequest,
    current_user: TokenData = Depends(get_current_user),
    dashboard_repo=Depends(get_dashboard_repository),
    widget_repo=Depends(get_widget_repository),
    db: Session = Depends(get_db),
):
    dashboard = dashboard_repo.get_by_id(dashboard_id)
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if not PermissionService.can_edit_dashboard(current_user, dashboard):
        raise HTTPException(status_code=403, detail="You do not have permission to edit this dashboard")

    use_case = CreateWidgetUseCase(widget_repo)
    widget = use_case.execute(
        dashboard_id=dashboard_id,
        name=payload.name,
        widget_type=payload.type,
        position=payload.position,
        config=payload.config,
        data_source_id=payload.data_source_id,
        query=payload.query,
    )
    db.commit()
    return WidgetResponse.model_validate(widget)
