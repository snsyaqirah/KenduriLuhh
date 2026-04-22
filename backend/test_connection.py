"""
Day 1 smoke test — verifies Azure OpenAI connection and Mak Tok agent responds.
Run from the backend/ directory:
  cd backend
  python test_connection.py
"""
import asyncio
import sys
import os

# Force UTF-8 output on Windows (handles emoji and Malay characters)
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# Allow imports from app/ without installing as a package
sys.path.insert(0, os.path.dirname(__file__))

from autogen_agentchat.messages import TextMessage
from autogen_core import CancellationToken

from app.config import settings
from app.agents.mak_tok import create_mak_tok


async def main():
    print("=" * 60)
    print("KenduriLuhh — Day 1 Connection Test")
    print("=" * 60)
    print(f"Endpoint : {settings.AZURE_OPENAI_ENDPOINT}")
    print(f"Deployment: {settings.AZURE_OPENAI_DEPLOYMENT}")
    print()

    print("Mencipta Mak Tok (mode: katering)...")
    mak_tok = create_mak_tok(mode="katering")
    print("Mak Tok siap!")
    print()

    prompt = (
        "Mak Tok, tolong cadangkan menu lengkap untuk majlis perkahwinan "
        "200 orang. Bajet sekitar RM25 per kepala untuk bahan. "
        "Majlis pada waktu tengahari."
    )
    print(f"Soalan: {prompt}")
    print("-" * 60)

    result = await mak_tok.on_messages(
        [TextMessage(content=prompt, source="user")],
        CancellationToken(),
    )

    print("Jawapan Mak Tok:")
    print(result.chat_message.content)
    print("=" * 60)
    print("Test LULUS — Azure OpenAI dan Mak Tok berfungsi!")


if __name__ == "__main__":
    asyncio.run(main())
