import json
import os
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


HOST = "0.0.0.0"
PORT = 8080
LOG_PATH = os.environ.get("WEBHOOK_SINK_LOG_PATH", "/data/requests.jsonl")


def append_request_log(payload: dict) -> None:
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    with open(LOG_PATH, "a", encoding="utf-8") as log_file:
        log_file.write(json.dumps(payload, ensure_ascii=True) + "\n")


class AlertWebhookHandler(BaseHTTPRequestHandler):
    server_version = "lab-webhook-sink/1.0"

    def _read_json_body(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length == 0:
            return None, ""

        body_text = self.rfile.read(content_length).decode("utf-8")
        try:
            return json.loads(body_text), body_text
        except json.JSONDecodeError:
            return None, body_text

    def _write_json(self, status_code: int, payload: dict) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self):
        if self.path == "/health":
            self._write_json(200, {"ok": True})
            return

        self._write_json(
            200,
            {
                "ok": True,
                "message": "lab webhook sink is running",
                "path": self.path,
            },
        )

    def do_POST(self):
        json_body, raw_body = self._read_json_body()
        request_log = {
            "received_at": datetime.now(timezone.utc).isoformat(),
            "method": self.command,
            "path": self.path,
            "headers": {key: value for key, value in self.headers.items()},
            "json": json_body,
            "raw_body": raw_body,
        }
        append_request_log(request_log)
        print(json.dumps(request_log, ensure_ascii=True), flush=True)
        self._write_json(200, {"ok": True, "path": self.path})

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    httpd = ThreadingHTTPServer((HOST, PORT), AlertWebhookHandler)
    print(
        json.dumps(
            {
                "event": "server_started",
                "host": HOST,
                "port": PORT,
                "log_path": LOG_PATH,
            },
            ensure_ascii=True,
        ),
        flush=True,
    )
    httpd.serve_forever()
