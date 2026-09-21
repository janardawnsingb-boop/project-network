# Reflection – Dual-Panel Activity & Protocol Visualizer

## 1. AI platform/model used and why

I used __________________________ because ________________________________.

## 2. How the two panels stay synchronized

The Activity Panel starts an activity and receives structured protocol steps from the FastAPI backend. JavaScript stores those steps in a central state object and uses the same current step for the protocol message, direction indicator, timeline, progress bar, and activity status.

## 3. What the AI initially got wrong

Describe an actual issue encountered during development. For example, if the generated protocol sequence, UI state, or button behavior was incorrect, explain the specific problem here.

## 4. How the error was corrected

Explain the change made and why it better matches the required application-layer behavior.

## 5. Differences between the protocol flows

### DNS + HTTP
DNS resolves a host name before the simulated HTTP request and response. HTTP then carries the web request/response messages.

### SMTP
SMTP is a command/response conversation used for mail transfer. The visualization shows EHLO, MAIL FROM, RCPT TO, DATA, message content, the terminating period, and QUIT.

### Streaming HTTP
The streaming example first resolves the streaming host, requests a playlist/manifest, and then requests media segments. The selected quality is reflected in the simulated segment paths.

## 6. What I learned

Write 3–5 points about:
- application-layer protocols
- client/server message direction
- protocol sequencing
- synchronization of UI state
- AI-assisted software development
