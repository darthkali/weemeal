# Schaltbarer Auth Mode hinter einem Identity-Provider-Seam

WeeMeal unterstützt zwei Authentifizierungs-Modi hinter einem gemeinsamen `IdentityProvider`-Interface, pro Deployment per Env (`AUTH_MODE=keycloak|local`) fest gewählt: **keycloak** (OIDC gegen eine bestehende Keycloak-Instanz, User + Rollen dort verwaltet, kein App-Admin-Panel) und **local** (WeeMeal-eigene User in MongoDB mit Username + Passwort, App-Admin-Panel für User-Verwaltung, Seed-Admin beim Start). Wir bauen beides, weil der Betreiber Keycloak bereits nutzt und seine dortigen User wiederverwenden will, WeeMeal aber auch ohne externen IdP lauffähig sein soll.

## Considered Options

- **Nur Keycloak**: verworfen — zwingt jede Installation zu Keycloak-Infra.
- **Nur app-nativ**: verworfen — der Hauptnutzer betreibt Keycloak schon und will keine User doppelt pflegen.
- **Beide gleichzeitig live** (User wählt Login-Methode): verworfen — führt zu zwei Identitäten pro Person und Merge-Problemen. Stattdessen ein Modus pro Deployment.

## Consequences

- Auth.js (NextAuth v5) trägt beide Modi: Keycloak-Provider bzw. Credentials-Provider, je nach `AUTH_MODE` registriert. Role + Auth Mode landen im JWT.
- Die Admin-Invarianten (mind. 1 Admin, kein Selbst-Entzug, einziger Admin nicht löschbar) werden **nur im local-Modus** erzwungen; im keycloak-Modus verantwortet Keycloak Rollen und User-Lebenszyklus.
- Rollen im keycloak-Modus kommen aus den Client-Rollen `weemeal-user` / `weemeal-admin` als Token-Claim; ohne `weemeal-user` kein Zutritt.
