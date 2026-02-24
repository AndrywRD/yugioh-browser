from dataclasses import dataclass


@dataclass(slots=True)
class DashboardDTO:
    id: str
    name: str
    description: str | None
    layout: dict
    refresh_interval: int
    is_public: bool
    is_favorite: bool
