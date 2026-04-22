"""
pytest configuration — sets asyncio mode and ensures app/ is importable.
"""
import sys
import os

# Make sure `app` package is importable from within tests/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
