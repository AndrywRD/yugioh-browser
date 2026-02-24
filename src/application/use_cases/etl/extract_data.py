class ExtractDataUseCase:
    def __init__(self, extractor) -> None:
        self.extractor = extractor

    def execute(self, config: dict):
        return self.extractor.extract(config)
