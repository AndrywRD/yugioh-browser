import re
from datetime import UTC, datetime
from uuid import uuid4


def utcnow() -> datetime:
    return datetime.now(UTC)


def generate_uuid() -> str:
    return str(uuid4())


def sanitize_text(text: str) -> str:
    text = re.sub(r"<script.*?</script>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()
