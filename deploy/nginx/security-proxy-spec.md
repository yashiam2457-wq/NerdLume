# Production Reverse Proxy & TLS 1.3 Architecture Specification

Target System: NerdLume (NerdyBro) Production Ingress  
Date: November 2026  
Status: Architecture Ready • Staged for Future Deployment  

---

## 1. Scope & Operating Boundary

This specification defines the production ingress architecture for NerdLume. Local development continues to run directly on loopback (`http://127.0.0.1:5050`) without requiring Nginx, Cloudflare, or local certificate infrastructure.

The requirements detailed herein apply exclusively when transitioning the service to public internet staging or production environments.

---

## 2. Ingress Topology & Network Segmentation

The production architecture enforces strict perimeter defense:

```
External Traffic (HTTPS :443)
       │
       ▼
[Edge Firewall / Reverse Proxy] (Nginx / Cloudflare)
       │  • Enforces TLS 1.3 Termination
       │  • Enforces HSTS (63,072,000 seconds)
       │  • Scrubs client-forged proxy headers
       │  • Strips untrusted hop-by-hop headers
       │  • Appends trusted client IP: X-Forwarded-For: $remote_addr
       │
       ▼ (Internal Private VPC / Loopback Socket :5050)
[NerdyBro Backend Engine] (Python ThreadingHTTPServer)
       │  • Validates direct IP against NERDYBRO_TRUSTED_PROXIES
       │  • Accepts forwarded client IP only from trusted proxy IP
       │  • Executes application rate limiting on verified client IP
       │  • Disallows wildcard proxy trust
```

### Communication Boundary Rules
1. Public Network Exposure: Only ports 80 (HTTP) and 443 (HTTPS) of the reverse proxy are accessible to external networks.
2. Backend Isolation: Port 5050 must bind strictly to `127.0.0.1` or internal VPC private interface. It must never be exposed to public interfaces (`0.0.0.0`).
3. Socket Alternative: For single-host server deployments, communicating via Unix domain sockets (`unix:/run/nerdybro.sock`) provides kernel-level process isolation and eliminates internal TCP socket attacks entirely.

---

## 3. TLS 1.3 & Cryptographic Standards

Production deployments must terminate TLS using modern cryptographic suites:

### Protocol Configuration
- Mandatory Minimum: TLS 1.3.
- Deprecated Protocols: TLS 1.0, TLS 1.1, and TLS 1.2 should be disabled unless legacy compatibility with specific mobile clients is strictly required. SSLv2 and SSLv3 are forbidden.
- Forward Secrecy: Mandatory ephemeral key exchange using ECDHE (X25519, P-256, P-384).

### Cryptographic Parameters
```nginx
ssl_protocols TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;
```

### HSTS & Transport Defense
- Header: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- HTTP Redirection: Permanent 301 redirection from port 80 to port 443 for all unencrypted requests.
- OCSP Stapling: Enabled with trusted upstream resolvers (`1.1.1.1`, `8.8.8.8`) to verify certificate revocation status without client latency.

---

## 4. Header Validation & Spoofing Immunity

When operating behind a reverse proxy, client IP resolution is susceptible to spoofing unless strictly controlled:

### 1. Reverse Proxy Responsibilities
The reverse proxy must never accept arbitrary incoming `X-Forwarded-For` headers from untrusted clients. It must construct the chain using `$proxy_add_x_forwarded_for`, appending the authentic TCP socket remote address:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

### 2. Backend Responsibilities
The backend server (`server.py` and `server.js`) strictly verifies:
- `NERDYBRO_TRUSTED_PROXIES`: A comma-separated list of exact IP addresses or subnets representing authorized reverse proxies (e.g., `127.0.0.1,10.0.4.10`).
- Zero Wildcard Trust: Wildcard entries (`*`, `all`, `0.0.0.0/0`, `::/0`) are rejected at startup.
- Non-Trusted Sources: If a request arrives from an address not in `NERDYBRO_TRUSTED_PROXIES`, the socket address is used directly, and any client-supplied `X-Forwarded-For` header is ignored.
- Header Sanitization: Extracted IP candidates are validated against IPv4 and IPv6 syntax rules, discarding malformed strings or injection payloads.

---

## 5. Deployment Checklist for Future Production Launch

Prior to switching DNS records to the production environment:

1. Confirm Reverse Proxy Configuration: Deploy [`deploy/nginx/nerdybro.conf`](file:///c:/Users/Loq/Documents/programs/NerdyBro/deploy/nginx/nerdybro.conf) to `/etc/nginx/sites-available/nerdybro.conf` and verify with `nginx -t`.
2. Issue Valid Certificates: Run Certbot / Let's Encrypt for `nerdybro.in` to generate verified chain and private keys.
3. Configure Environment Variables:
   - `NERDYBRO_CORS_ORIGIN=https://nerdybro.in`
   - `NERDYBRO_TRUSTED_PROXIES=127.0.0.1` (or internal VPC IP of proxy)
   - `PORT=5050`
4. Production API Keys: Replace placeholder values in production `.env` with production keys generated directly from provider consoles.
5. Verify SSL Labs Rating: Run Qualys SSL Labs test targeting the domain to confirm an A+ rating with full TLS 1.3 enforcement.

