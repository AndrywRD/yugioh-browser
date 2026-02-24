class TransformDataUseCase:
    def __init__(self, transformer) -> None:
        self.transformer = transformer

    def execute(self, dataframe):
        return self.transformer.transform(dataframe)
