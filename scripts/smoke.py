#!/usr/bin/env python3
"""Keyless HTTP checks and an optional small, bounded extraction load probe."""
import argparse
import concurrent.futures
import json
import time
import urllib.error
import urllib.request


def request(base, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(base + path, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            return response.status, dict(response.headers), json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, dict(error.headers), json.load(error)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="http://127.0.0.1:3000")
    parser.add_argument("--requests", type=int, default=0, help="Optional load requests (max 1000); consumes the local rate limit")
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--external-url", help="Optional public HTML URL to exercise real extraction")
    args = parser.parse_args()
    if not 0 <= args.requests <= 1000 or not 1 <= args.concurrency <= 32:
        parser.error("Use 0–1000 requests and 1–32 concurrent workers")
    assert request(args.base, "/health")[2]["status"] == "ok"
    assert len(request(args.base, "/api/models")[2]["models"]) >= 3
    status, headers, document = request(args.base, "/api/extract", {"text": "# A test\n\nTokio handles asynchronous I/O.\n\n## Limits\n\nConcurrency needs resource bounds.", "title": "Smoke test"})
    assert status == 200 and document["passages"][1]["id"] == "p2"
    assert any(k.lower() == "x-request-id" for k in headers)
    for url in ["http://127.0.0.1", "http://169.254.169.254/latest/meta-data", "file:///etc/passwd"]:
        status, _, body = request(args.base, "/api/extract", {"url": url})
        assert status == 400 and "request_id" in body["error"]
    status, _, body = request(args.base, "/api/generate", {"mode": "summary", "provider": "openai", "model": "gpt-5.4-mini", "document": document})
    assert status == 400 and body["error"]["code"] == "missing_key"
    print("PASS: health, catalog, passages, request IDs, unsafe URLs, missing key")
    if args.external_url:
        status, _, body = request(args.base, "/api/extract", {"url": args.external_url})
        assert status == 200, body
        print(f"PASS: public HTML extraction ({len(body['passages'])} passages)")
    if args.requests:
        def probe(_):
            start = time.perf_counter()
            status, _, _body = request(args.base, "/api/extract", {"text": "Network waits can overlap.\n\nWork still needs limits."})
            return status, (time.perf_counter() - start) * 1000
        start = time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
            results = list(pool.map(probe, range(args.requests)))
        times = sorted(ms for _, ms in results)
        statuses = {str(s): sum(1 for status, _ in results if status == s) for s, _ in results}
        print(json.dumps({"requests": len(results), "concurrency": args.concurrency, "elapsed_s": round(time.perf_counter() - start, 3), "statuses": statuses, "p50_ms": round(times[len(times)//2], 2), "p95_ms": round(times[min(len(times)-1, int(len(times)*.95))], 2)}, indent=2))
        assert all(status in (200, 429, 503) for status, _ in results)
        print("This measures keyless local text extraction, not model throughput or production capacity.")


if __name__ == "__main__":
    main()
