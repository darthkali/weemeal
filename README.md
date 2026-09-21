![GitHub Release](https://img.shields.io/github/v/release/weemeal/weemeal-frontend-react)

# WeeMeal
A modern recipe management application with shopping list integration.

![Bildschirmfoto 2026-03-01 um 12.10.31.png](docs/images/Bildschirmfoto%202026-03-01%20um%2012.10.31.png)

![Bildschirmfoto 2026-03-01 um 12.11.18.png](docs/images/Bildschirmfoto%202026-03-01%20um%2012.11.18.png)

![Bildschirmfoto 2026-03-01 um 12.11.30.png](docs/images/Bildschirmfoto%202026-03-01%20um%2012.11.30.png)

![Bildschirmfoto 2026-03-01 um 12.11.43.png](docs/images/Bildschirmfoto%202026-03-01%20um%2012.11.43.png)

This README covers **running WeeMeal from the Docker image**. To work on the
code instead, see [DEVELOPMENT.md](DEVELOPMENT.md).

## Features

- Recipe CRUD operations
- Drag & drop ingredient reordering
- Section headers for ingredient grouping
- Portion scaling with localStorage persistence
- QR code generation for Bring! shopping list integration
- Markdown support for recipe instructions
- Recipe notes with auto-save
- Source attribution (book with page, URL, or free text)
- Tags
- Image upload
- Full-text search functionality
- Switchable authentication: no login, local users, or Keycloak (see below)

## What you need

- A container runtime (Docker or Podman)
- A MongoDB instance WeeMeal can reach
- A volume for the recipe images, so they survive a container restart

## Quick start

The image is `darthkali/weemeal` on
[Docker Hub](https://hub.docker.com/r/darthkali/weemeal).

```bash
docker run -d \
  --name weemeal \
  -p 3000:3000 \
  -e MONGODB_URI="mongodb://user:pass@mongo:27017/weemeal?authSource=admin" \
  -e IMAGES_DIR=/data/images \
  -v weemeal_images:/data/images \
  darthkali/weemeal:latest
```

WeeMeal is then at `http://localhost:3000`. With no `AUTH_MODE` set it runs
**without any login** — read [Authentication](#authentication) before putting it
on a network other people can reach.

### With Docker Compose

```yaml
services:
  weemeal:
    image: darthkali/weemeal:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      MONGODB_URI: mongodb://weemeal:change-me@mongodb:27017/weemeal?authSource=admin
      IMAGES_DIR: /data/images
      # Leave AUTH_MODE unset for an open instance, or configure a mode below.
      AUTH_MODE: local
      AUTH_SECRET: <openssl rand -base64 32>
      AUTH_URL: https://weemeal.example.com
      SEED_ADMIN_USER: root
      SEED_ADMIN_PASSWORD: <12-72 chars, upper + lower + digit + special>
    volumes:
      - weemeal_images:/data/images
    depends_on:
      - mongodb

  mongodb:
    image: mongo:8
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: weemeal
      MONGO_INITDB_ROOT_PASSWORD: change-me
      MONGO_INITDB_DATABASE: weemeal
    volumes:
      - mongodb_data:/data/db

volumes:
  weemeal_images:
  mongodb_data:
```

The container listens on port **3000** and runs as an unprivileged user
(uid 1001) — a mounted image directory has to be writable by it.

## Environment Variables

Only `MONGODB_URI` is always required. Everything else depends on the auth mode
you pick.

### Always

| Variable        | Required | Description                                                         |
|-----------------|----------|---------------------------------------------------------------------|
| `MONGODB_URI`   | yes      | MongoDB connection string.                                          |
| `IMAGES_DIR`    | no       | Where recipe images are stored. Default `./data/images` — point it at your mounted volume, otherwise the images go with the container. |
| `PORT`          | no       | Port inside the container. Default `3000`.                          |
| `ADMIN_SECRET`  | no       | Protects `/api/admin/migrate-images` (a one-off maintenance route). |

### Authentication

`AUTH_MODE` picks one of three modes per deployment and decides which of the
remaining variables you need. It is read at runtime, so the same image can run
any mode.

| Variable    | Values                          | Default |
|-------------|---------------------------------|---------|
| `AUTH_MODE` | `none` \| `local` \| `keycloak` | `none`  |

**`AUTH_MODE=none` — no login at all.** Every visitor sees and edits every
recipe. There is no login page, no user management and no password change. No
further variables are needed; `AUTH_SECRET`, `AUTH_URL` and `SEED_ADMIN_*` are
ignored. This is the default, so an unconfigured instance starts right up —
only run it behind your own gate (private network, VPN, authenticating reverse
proxy), **never openly on the internet**.

**`AUTH_MODE=local` — WeeMeal manages users itself** (username + password in
MongoDB, admin panel, password policy of 12–72 chars with upper, lower, digit
and special character).

| Variable              | Required       | Description                                                           |
|-----------------------|----------------|-----------------------------------------------------------------------|
| `AUTH_SECRET`         | yes            | Signs the JWT session cookie. Generate with `openssl rand -base64 32`. |
| `AUTH_URL`            | behind a proxy | Public base URL (the `https://` one behind nginx/TLS).                |
| `SEED_ADMIN_USER`     | first start    | Username of the first admin, created on startup.                      |
| `SEED_ADMIN_PASSWORD` | first start    | Its password; must satisfy the password policy.                       |

The seed only runs while **no admin exists** — it is idempotent, so changing
`SEED_ADMIN_PASSWORD` later does **not** reset an existing admin's password.
Use the admin panel for that, and keep a second admin around: an account whose
password is lost can only be reset by another admin.

Signed-in users change their own password under **Passwort ändern** in the user
menu.

**`AUTH_MODE=keycloak` — login against an existing Keycloak** (OIDC). Users
and roles live in Keycloak, so WeeMeal shows no admin panel and no password
change; the login page only offers a **Mit Keycloak anmelden** button.

| Variable                 | Required       | Description                                                            |
|--------------------------|----------------|------------------------------------------------------------------------|
| `KEYCLOAK_ISSUER`        | yes            | Realm issuer URL, e.g. `https://keycloak.example.com/realms/main`.     |
| `KEYCLOAK_CLIENT_ID`     | yes            | Client ID of the WeeMeal client.                                       |
| `KEYCLOAK_CLIENT_SECRET` | yes            | Its client secret.                                                     |
| `AUTH_SECRET`            | yes            | Signs the JWT session cookie. Generate with `openssl rand -base64 32`. |
| `AUTH_URL`               | behind a proxy | Public base URL (the `https://` one behind nginx/TLS).                 |

**Keycloak setup on your side.** WeeMeal reads roles from the token and grants
nothing by itself:

1. **Create the client.** Type *OpenID Connect*, a client ID of your choice
   (it goes into `KEYCLOAK_CLIENT_ID`), **Client authentication: On**
   (confidential) and **Standard flow** enabled. Copy the secret from the
   *Credentials* tab into `KEYCLOAK_CLIENT_SECRET`.
2. **Set the redirect URI.** Add `<AUTH_URL>/api/auth/callback/keycloak` to the
   client's *Valid redirect URIs*, e.g.
   `https://weemeal.example.com/api/auth/callback/keycloak`.
3. **Define and assign the roles.** Create the client roles **`weemeal-user`**
   and **`weemeal-admin`** on that client and assign them to your users. Realm
   roles of the same names work too.
4. **Put the roles into the ID token.** This step is easy to miss: WeeMeal
   reads the ID token, but Keycloak's built-in role mappers only fill the
   *access* token, so without this nobody gets in. On the client, go to
   *Client scopes → \<your client\>-dedicated → Add mapper → By configuration →
   User Client Role* and set:
   - *Multivalued*: On
   - *Token Claim Name*: `resource_access.${client_id}.roles`
   - *Client ID*: your client
   - *Add to ID token*: **On**

   If you assign realm roles instead, add a *User Realm Role* mapper with the
   claim name `realm_access.roles` the same way. Alternatively you can switch
   *Add to ID token* on for the mappers in the shared `roles` client scope —
   but that changes the tokens of every client in the realm.

A user without `weemeal-user` is refused entry, even with a valid Keycloak
login and even when they hold `weemeal-admin` — that role only raises an
admitted user to admin. So grant `weemeal-user` to everyone who may use
WeeMeal, and `weemeal-admin` on top to your admins.

**The WeeMeal session follows the Keycloak session.** Once the access token has
expired (Keycloak's default is 5 minutes), WeeMeal refreshes it against the
realm before serving the request. Whatever you change in Keycloak takes effect
within that window, without the user signing in again:

- ending the session, disabling the user or revoking their refresh token logs
  them out of WeeMeal — the next request lands on the login page,
- revoking `weemeal-user` locks them out the same way,
- granting or revoking `weemeal-admin` changes the role on their session.

The session cookie itself lives at most an hour of inactivity in this mode
(`local` and `none` keep the 30-day default, where there is nothing to check
against). If Keycloak is unreachable, the affected session ends at the login
page rather than erroring out.

Two things to keep in mind when you roll this out: leave the realm's *Revoke
Refresh Token* switch **off** (its default) — WeeMeal keeps the refresh token in
the session cookie and cannot always write back a rotated one — and expect
sessions that predate this version to end at the login page once, since their
cookie carries no refresh token to check with.

**Abmelden** ends the Keycloak session too (RP-initiated logout against the
realm's `end_session_endpoint`), so the next login asks for credentials instead
of silently going through via SSO. This needs no extra client configuration.

### Behind a reverse proxy

Terminate TLS in your proxy, forward `X-Forwarded-Proto` and
`X-Forwarded-Host`, and set `AUTH_URL` to the public `https://` URL — otherwise
login redirects and secure cookies point at the wrong host.

## API Endpoints

| Method | Endpoint                        | Description                      |
|--------|---------------------------------|----------------------------------|
| GET    | `/api/recipes`                  | Get all recipes (with search)    |
| POST   | `/api/recipes`                  | Create a new recipe              |
| GET    | `/api/recipes/[id]`             | Get a single recipe              |
| PUT    | `/api/recipes/[id]`             | Update a recipe                  |
| DELETE | `/api/recipes/[id]`             | Delete a recipe                  |
| PATCH  | `/api/recipes/[id]/notes`       | Update recipe notes              |
| PATCH  | `/api/recipes/[id]/source`      | Update recipe source             |
| GET    | `/api/recipes/bring/[id]`       | Get Schema.org HTML for Bring!   |
| POST   | `/api/images`                   | Upload an image                  |
| GET    | `/api/images/[id]`              | Serve an image                   |
| DELETE | `/api/images/[id]`              | Delete an image                  |
| GET    | `/api/admin/migrate-images`     | Admin: migrate images            |

Every route except `/api/auth/*`, `/api/images/*` and `/api/recipes/bring/*`
requires a session — unless `AUTH_MODE=none`, where all of them are open.

### Authentication endpoints (`AUTH_MODE=local`)

Outside the `local` mode these do not exist: a signed-in request gets `404`.
Without a session the session check answers first, with `401`.

| Method | Endpoint                    | Description                                     |
|--------|-----------------------------|-------------------------------------------------|
| GET    | `/api/admin/users`          | Admin: list users                               |
| POST   | `/api/admin/users`          | Admin: create a user (username, password, role) |
| PATCH  | `/api/admin/users/[id]`     | Admin: change role or reset password            |
| DELETE | `/api/admin/users/[id]`     | Admin: delete a user                            |
| PATCH  | `/api/account/password`     | Change your own password (session-bound)        |

## Maintenance

`GET /api/admin/migrate-images` migrates existing recipe images to filesystem
storage. Protect it with the `ADMIN_SECRET` environment variable.

## License

MIT
