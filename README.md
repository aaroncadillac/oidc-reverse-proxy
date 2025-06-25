# oidc-reverse-proxy

`oidc-rproxy` is a command-line utility that launches a reverse proxy secured with **OpenID Connect (OIDC)**. It reads a JSON configuration file that can be fully parameterised via environment variables.

## Installation

```bash
npm install -g @aaroncadillac/oidc-reverse-proxy
```

## Basic usage

```bash
oidc-rproxy run
```

This command starts the OIDC-authenticated reverse-proxy server. You can override the default host, port and config file path:

```bash
oidc-rproxy run --host 0.0.0.0 --port 8080 --config ~/custom-config.json
```

> For every successful request the proxy injects an `Authorization: Bearer <access_token>` header containing the user’s OIDC access-token. Your upstream services can therefore handle sessions without additional middleware.

## Commands

### run

Starts the reverse-proxy server.

#### Global options

| Option | Description | Default |
|--------|-------------|---------|
| `--host, -h` | `$OIDC_RPROXY_HOST` Host interface to bind | `localhost` |
| `--port, -p` | `$OIDC_RPROXY_PORT` TCP port to listen on | `3000` |
| `--config, -c` | Path to the JSON config file | `~/oidc-rproxy.json` |

#### Examples

```bash
oidc-rproxy run
oidc-rproxy run --host 127.0.0.1 --port 9000 --config ~/config.json
```

## Configuration file (`oidc-rproxy.json`)

The configuration file is a JSON array, where each object defines how users are authenticated and how requests are routed to backend services.

It assumes that your issuer supports the [OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) protocol, so you don't need to manually specify:

- `authorization_endpoint`
- `token_endpoint`
- `user_info_endpoint`

Each object in the array maps one or more path prefixes to a single OIDC provider, meaning you can protect different paths with different identity providers in a single configuration.

### Example configuration

```jsonc
[
  {
    "issuer": "https://auth.example.com",
    "client_id": "example-client",
    "client_secret": "••••••••••",
    "scope": "openid email profile",
    "session_cookie_name": "oidc_session",
    "email_domains": ["example.com"],
    "paths": {
      "/api/": { "upstream": "http://127.0.0.1:4000" },
      "/docs/": { "upstream": "http://127.0.0.1:4001", "healthcheck": "health" }
    }
  },
  {
    "issuer": "https://login.partner.com",
    "client_id": "partner-client",
    "client_secret": "••••••••••",
    "paths": {
      "/partner/": { "upstream": "https://partner-backend.internal" }
    }
  }
]
```

### Required fields (per array element)

- `issuer`
- `client_id`
- `client_secret`
- `session_cookie_secret` - Secret key for session cookie encryption
- `session_cookie_name` – name of the session cookie (default: `oidc_session`)
- `paths`
  - each key in `paths` must end with a `/` and must define an `upstream` URL

### Optional fields

- `scope` – OIDC scopes to request (default: `openid email profile`)
- `email_domains` – restrict access to specified email domains
- `on_unauthenticated_request` – action when a request is unauthenticated (`"deny"`, `"redirect"`, etc.)
- `paths.*.healthcheck` – relative health-check path (e.g. `"health"`)

## Authentication flow

1. A user lands on a protected path.
2. The proxy initiates the OIDC Authorisation Code flow with PKCE.
3. After a successful login the user is redirected back with an ID-token and access-token.
4. The proxy stores the ID-token in an encrypted session cookie (`session_cookie_name`).
5. For every subsequent request the proxy:
   - validates the cookie,
   - refreshes tokens if necessary,
   - adds `Authorization: <access_token>` to the outgoing request, and
   - forwards the request to the configured upstream service.

## Health checks

If a `healthcheck` property is defined for a path, the proxy will periodically poll `upstream/healthcheck` and mark the backend as unavailable when the endpoint does not return HTTP `2xx`.

## Licence

Licensed under the [MPL-2.0](LICENSE).
