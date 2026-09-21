from typing import Any
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from urllib.parse import urlparse

app = FastAPI(title="Application Layer Protocol Visualizer")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


class BrowseRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)


class MailRequest(BaseModel):
    to: str = Field(min_length=3, max_length=320)
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=10000)


class StreamRequest(BaseModel):
    quality: str = Field(default="720p", pattern="^(360p|480p|720p|1080p)$")


def browser_host(raw_url: str) -> str:
    value = raw_url.strip()
    if "://" not in value:
        value = "https://" + value
    parsed = urlparse(value)
    if not parsed.hostname:
        raise ValueError("Invalid URL")
    return parsed.hostname


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/browse")
async def browse(data: BrowseRequest):
    host = browser_host(data.url)
    path = urlparse(data.url if "://" in data.url else "https://" + data.url).path or "/"
    return {
        "activity": "Browsing",
        "protocols": ["DNS", "HTTP"],
        "host": host,
        "path": path,
        "steps": [
            {
                "type": "DNS", "direction": "client-server",
                "title": "DNS Query", "description": "Client asks the DNS resolver for an A record.",
                "message": f"QUERY\\nName: {host}\\nType: A\\nClass: IN",
                "fields": ["Name", "Type", "Class"]
            },
            {
                "type": "DNS", "direction": "server-client",
                "title": "DNS Response", "description": "Resolver returns an example IPv4 address for the host.",
                "message": f"RESPONSE\\nName: {host}\\nType: A\\nAnswer: 93.184.216.34",
                "fields": ["Name", "Type", "Answer"]
            },
            {
                "type": "HTTP", "direction": "client-server",
                "title": "HTTP Request", "description": "Client requests the selected resource from the web server.",
                "message": f"GET {path} HTTP/1.1\\nHost: {host}\\nAccept: text/html\\nConnection: keep-alive",
                "fields": ["GET", "Host", "Accept", "Connection"]
            },
            {
                "type": "HTTP", "direction": "server-client",
                "title": "HTTP Response", "description": "Server returns a successful HTTP response in the simulation.",
                "message": "HTTP/1.1 200 OK\\nContent-Type: text/html\\nContent-Length: 1256\\nConnection: keep-alive",
                "fields": ["200 OK", "Content-Type", "Content-Length", "Connection"]
            }
        ]
    }


@app.post("/api/mail")
async def mail(data: MailRequest):
    recipient = data.to.strip()
    subject = data.subject.strip()
    body = data.body.strip()
    return {
        "activity": "Mail",
        "protocols": ["SMTP"],
        "steps": [
            {
                "type": "SMTP", "direction": "client-server",
                "title": "EHLO", "description": "Client introduces itself to the SMTP server.",
                "message": "EHLO mail.client.local", "fields": ["EHLO"]
            },
            {
                "type": "SMTP", "direction": "server-client",
                "title": "Server Greeting", "description": "SMTP server acknowledges the greeting.",
                "message": "250-mail.server.local\\n250 OK", "fields": ["250", "OK"]
            },
            {
                "type": "SMTP", "direction": "client-server",
                "title": "MAIL FROM", "description": "Client specifies the envelope sender.",
                "message": "MAIL FROM:<sender@example.com>", "fields": ["MAIL FROM"]
            },
            {
                "type": "SMTP", "direction": "server-client",
                "title": "Sender Accepted", "description": "Server accepts the envelope sender.",
                "message": "250 OK", "fields": ["250 OK"]
            },
            {
                "type": "SMTP", "direction": "client-server",
                "title": "RCPT TO", "description": "Client specifies the envelope recipient.",
                "message": f"RCPT TO:<{recipient}>", "fields": ["RCPT TO"]
            },
            {
                "type": "SMTP", "direction": "server-client",
                "title": "Recipient Accepted", "description": "Server accepts the recipient.",
                "message": "250 OK", "fields": ["250 OK"]
            },
            {
                "type": "SMTP", "direction": "client-server",
                "title": "DATA", "description": "Client asks to enter the message content.",
                "message": "DATA", "fields": ["DATA"]
            },
            {
                "type": "SMTP", "direction": "server-client",
                "title": "Start Mail Input", "description": "Server is ready to receive the message.",
                "message": "354 Start mail input", "fields": ["354"]
            },
            {
                "type": "SMTP", "direction": "client-server",
                "title": "Message Content", "description": "Client transmits the subject and message body.",
                "message": f"Subject: {subject}\\n\\n{body}", "fields": ["Subject"]
            },
            {
                "type": "SMTP", "direction": "client-server",
                "title": "End of Data", "description": "A single period terminates SMTP message data.",
                "message": ".", "fields": ["."]
            },
            {
                "type": "SMTP", "direction": "server-client",
                "title": "Message Accepted", "description": "Server confirms acceptance of the message.",
                "message": "250 OK: Message accepted", "fields": ["250 OK"]
            },
            {
                "type": "SMTP", "direction": "client-server",
                "title": "QUIT", "description": "Client closes the SMTP session.",
                "message": "QUIT", "fields": ["QUIT"]
            },
            {
                "type": "SMTP", "direction": "server-client",
                "title": "Session Closed", "description": "Server confirms that the SMTP session is closing.",
                "message": "221 Bye", "fields": ["221"]
            }
        ]
    }


@app.post("/api/stream")
async def stream(data: StreamRequest):
    quality = data.quality
    return {
        "activity": "Streaming",
        "protocols": ["DNS", "HTTP"],
        "quality": quality,
        "steps": [
            {
                "type": "DNS", "direction": "client-server",
                "title": "DNS Query", "description": "Client resolves the streaming host.",
                "message": "QUERY\\nName: streaming.example.com\\nType: A\\nClass: IN",
                "fields": ["Name", "Type", "Class"]
            },
            {
                "type": "DNS", "direction": "server-client",
                "title": "DNS Response", "description": "Resolver returns an example IPv4 address.",
                "message": "RESPONSE\\nName: streaming.example.com\\nType: A\\nAnswer: 203.0.113.20",
                "fields": ["Name", "Type", "Answer"]
            },
            {
                "type": "HTTP", "direction": "client-server",
                "title": "Manifest Request", "description": "Client requests an HLS-style playlist/manifest.",
                "message": "GET /video/manifest.m3u8 HTTP/1.1\\nHost: streaming.example.com\\nAccept: application/vnd.apple.mpegurl",
                "fields": ["GET", "Host", "Accept"]
            },
            {
                "type": "HTTP", "direction": "server-client",
                "title": "Manifest Response", "description": "Server returns a playlist describing available media segments.",
                "message": "HTTP/1.1 200 OK\\nContent-Type: application/vnd.apple.mpegurl\\nQuality: " + quality,
                "fields": ["200 OK", "Content-Type", "Quality"]
            },
            {
                "type": "HTTP", "direction": "client-server",
                "title": "Segment Requests", "description": "Client requests media segments progressively.",
                "message": f"GET /video/{quality}/segment001.ts\\nGET /video/{quality}/segment002.ts\\nGET /video/{quality}/segment003.ts",
                "fields": ["GET", "segment001.ts", "segment002.ts", "segment003.ts"]
            },
            {
                "type": "HTTP", "direction": "server-client",
                "title": "Segment Responses", "description": "Streaming server returns the requested media segments.",
                "message": "HTTP/1.1 200 OK\\nContent-Type: video/mp2t\\nTransfer-Encoding: chunked",
                "fields": ["200 OK", "Content-Type", "Transfer-Encoding"]
            }
        ]
    }
