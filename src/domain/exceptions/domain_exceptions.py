class DomainError(Exception):
    """Base exception for domain errors."""


class InvalidMetricError(DomainError):
    pass


class InvalidThresholdError(DomainError):
    pass


class EntityNotFoundError(DomainError):
    pass


class PermissionDeniedError(DomainError):
    pass


class DataSourceConnectionError(DomainError):
    pass


class ValidationError(DomainError):
    pass
