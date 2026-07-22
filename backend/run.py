"""백엔드 실행 엔트리포인트.

Windows에서 psycopg async가 ProactorEventLoop를 지원하지 않으므로
SelectorEventLoop를 loop_factory로 지정해 서버를 띄운다.

실행: python run.py  (또는 .venv/Scripts/python run.py)
"""

import asyncio
import sys

import uvicorn


def main() -> None:
    config = uvicorn.Config("src.api.main:app", host="127.0.0.1", port=8000)
    server = uvicorn.Server(config)
    if sys.platform == "win32":
        asyncio.run(server.serve(), loop_factory=asyncio.SelectorEventLoop)
    else:
        asyncio.run(server.serve())


if __name__ == "__main__":
    main()
