from src.application.use_cases.widgets.get_widget_data import GetWidgetDataUseCase


class RefreshWidgetUseCase:
    def __init__(self, get_widget_data_use_case: GetWidgetDataUseCase) -> None:
        self.get_widget_data_use_case = get_widget_data_use_case

    def execute(self, widget_id: str) -> dict:
        return self.get_widget_data_use_case.execute(widget_id)
