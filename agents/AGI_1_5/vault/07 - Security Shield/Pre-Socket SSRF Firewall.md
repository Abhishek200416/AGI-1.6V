---
tags: [agi15-security, ssrf]
aliases: [SSRF Firewall, Pre-Socket Gate]
---
# Pre-Socket SSRF Firewall

Network security gate inspecting outbound URLs prior to socket creation.

## 14,720 Intercepted Scenarios
- Loopback (`127.0.0.1`, `localhost`, `::1`)
- Link-local cloud metadata (`169.254.169.254`)
- Private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
- Octal, Hex, and Dword IP obfuscations
- Non-HTTP protocols (`file://`, `gopher://`, `dict://`)

Connected to: [[10-Stage Observable Research Pipeline]], [[AgentLAB Multi-Turn Injection Shield]]
