# oidc-rproxy CLI

`oidc-rproxy` is a command-line tool for launching a reverse proxy protected with OpenID Connect (OIDC). It uses a JSON config file and supports environment variables.

---

## 📦 Installation

```bash
npm install -g @aaroncadillac/oidc-reverse-proxy
```

---

## 🚀 Basic Usage

```bash
oidc-rproxy run
```

This command starts the OIDC-authenticated reverse proxy server. Optionally, you can customize the host, port, and config file path:

```bash
oidc-rproxy run --host 0.0.0.0 --port 8080 --config ~/custom-config.json
```

---

## 🧾 Commands

### `run`

Starts the reverse proxy server.

#### Global Options

| Option         | Description                                 | Default value                    |
|----------------|---------------------------------------------|----------------------------------|
| `--host, -h`   | `$OIDC_RPROXY_HOST` Host to bind            | `localhost`                      |
| `--port, -p`   | `$OIDC_RPROXY_PORT` Port to listen on       | `3000`                           |
| `--config, -c` | Path to the JSON config file                | `~/oidc-rproxy.json`             |

#### Examples

```bash
oidc-rproxy run
oidc-rproxy run --host 127.0.0.1 --port 9000 --config ~/config.json
```

---

## ⚙️ Configuration File (`oidc-rproxy.json`)

The config file is a JSON file that defines how users are authenticated and how requests are routed to backend services.

### 📐 Expected Schema

```jsonc
{
  "issuer": "https://auth.example.com",
  "client_id": "my-client-id",
  "client_secret": "my-client-secret",
  "authorization_endpoint": "https://auth.example.com/oauth2/authorize",
  "token_endpoint": "https://auth.example.com/oauth2/token",
  "user_info_endpoint": "https://auth.example.com/oauth2/userinfo",
  "on_unauthenticated_request": "redirect", // or "deny"
  "scope": "openid email profile",
  "session_cookie_name": "oidc_session",
  "email_domains": ["example.com", "anotherdomain.com"],
  "paths": {
    "/foo/": {
      "upstream": "http://127.0.0.1:9003"
    },
    "/bar/": {
      "upstream": "http://localhost:5000",
      "healthcheck": "health"
    }
  }
}
```

### 📝 Notes

`paths` keys must end with `/`

### 🧪 Required Fields

- `issuer`
- `client_id`
- `client_secret`
- `authorization_endpoint`
- `token_endpoint`
- `user_info_endpoint`
- `paths`
- `paths.*.upstream`

### 🔐 Authentication

- Only users authenticated via OIDC will be allowed.
- You can restrict access to specific email domains using the `email_domains` array.
