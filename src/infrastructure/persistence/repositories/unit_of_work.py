from contextlib import AbstractContextManager

from sqlalchemy.orm import Session


class UnitOfWork(AbstractContextManager):
    def __init__(self, session: Session) -> None:
        self.session = session

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        if exc_type:
            self.session.rollback()
        else:
            self.session.commit()
        return False
