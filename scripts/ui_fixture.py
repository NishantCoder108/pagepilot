#!/usr/bin/env python3
"""LOCAL TEST ONLY: deterministic SSE for manual UI checks, never an AI provider.

Start Rust on 127.0.0.1:3000 and build web/dist first. This server listens only
on 127.0.0.1:3001, accepts only the literal pagepilot-fixture-key credential,
and never forwards generation requests or credentials to a model provider.
"""
import json
import time
import urllib.error
import urllib.request
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class Fixture(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "web" / "dist"), **kwargs)

    def log_message(self, *_args):
        pass

    def forward(self, body=None):
        path = self.path.split("?")[0]
        if path not in ("/health", "/api/models", "/api/extract"):
            self.send_error(404)
            return
        req = urllib.request.Request("http://127.0.0.1:3000" + path, data=body, headers={"Content-Type": "application/json"})
        try:
            response = urllib.request.urlopen(req, timeout=25)
        except urllib.error.HTTPError as error:
            response = error
        except urllib.error.URLError:
            self.send_error(502, "Start the Rust server on port 3000 first")
            return
        with response:
            self.send_response(response.status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(response.read())

    def do_GET(self):
        if self.path.startswith(("/api/", "/health")):
            self.forward()
        else:
            super().do_GET()

    def do_POST(self):
        size = int(self.headers.get("Content-Length", "0"))
        if size > 1_000_000:
            self.send_error(413)
            return
        body = self.rfile.read(size)
        if self.path == "/api/extract":
            self.forward(body)
            return
        if self.path != "/api/generate":
            self.send_error(404)
            return
        if self.headers.get("x-provider-key") != "pagepilot-fixture-key":
            self.send_error(400, "TEST ONLY: use the literal pagepilot-fixture-key, never a real key")
            return
        request = json.loads(body)
        passages = request["document"]["passages"]
        allowed = request.get("passage_ids")
        if allowed is not None:
            passages = [p for p in passages if p["id"] in allowed]
        passage = passages[0]
        question = request.get("question", "").lower()
        answer = (
            "## Overview\n\n**Local streaming test fixture — no AI request was made.**\n\n"
            + passage["text"] + " [" + passage["id"] + "]\n\n"
            + "## Key takeaways\n\n- Citation buttons should open the source. [" + passage["id"] + "]\n"
            + "- This is deterministic test content, not a model-generated summary.\n\n"
            + "<script>window.fixtureInjection = true</script>\n\n"
            + "![Remote images must not load](https://example.com/tracking.png)\n"
        ) if request["mode"] == "summary" else (
            "**Local test answer.** The first selected passage says:\n\n> " + passage["text"]
            + "\n\nRead the source [" + passage["id"] + "]. An invented [p9999] must remain plain text."
        )
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

        def event(name, data):
            self.wfile.write((f"event: {name}\ndata: {json.dumps(data)}\n\n").encode())
            self.wfile.flush()

        try:
            event("progress", {"message": "LOCAL TEST FIXTURE — no provider request"})
            for i in range(0, len(answer), 24):
                event("delta", {"text": answer[i:i + 24]})
                time.sleep(0.3 if "slow" in question else 0.025)
                if "interrupt" in question and i > 48:
                    return
            if "error" in question:
                event("error", {"error": {"code": "fixture_error", "message": "Intentional local fixture failure", "request_id": str(uuid.uuid4())}})
            else:
                event("complete", {"citations": [passage["id"]]})
        except (BrokenPipeError, ConnectionResetError):
            pass


if __name__ == "__main__":
    print("LOCAL TEST ONLY at http://127.0.0.1:3001 — use pagepilot-fixture-key; no model calls", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 3001), Fixture).serve_forever()
