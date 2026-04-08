from anthropic import Anthropic

from backend.app.config import settings

client = (
    Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    if settings.ANTHROPIC_API_KEY
    else None
)


def call_claude(system: str, user: str, max_tokens: int = 1024) -> str:
    """Call Claude API. Returns empty string if no API key configured."""
    if client is None:
        return ""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text
