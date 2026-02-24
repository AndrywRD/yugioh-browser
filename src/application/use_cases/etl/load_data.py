class LoadDataUseCase:
    def __init__(self, loader) -> None:
        self.loader = loader

    def execute(self, dataframe, destination: str) -> int:
        return self.loader.load(dataframe, destination)
