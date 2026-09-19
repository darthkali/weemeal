# Auth Mode `none`: Betrieb ganz ohne Authentifizierung

Neben `keycloak` und `local` (ADR 0001) gibt es den dritten Auth Mode **`none`**: WeeMeal läuft ohne jede Authentifizierung. Es gibt keine Session, keinen User, keine Login-Seite, kein Admin-Panel und kein „Passwort ändern" — jeder Besucher sieht und bearbeitet alle Recipes. Gedacht ist der Modus für eine Instanz, die bereits davor abgesichert ist (privates Netz, VPN, Reverse Proxy mit eigener Auth) oder für die der Betreiber bewusst keinen Zugangsschutz will.

`none` ist zugleich der **Default**: ist `AUTH_MODE` nicht (oder leer) gesetzt, läuft WeeMeal ohne Login. Zugangsschutz ist damit eine bewusste Konfigurationsentscheidung des Betreibers, kein Nebenprodukt eines halb ausgefüllten `.env`.

Das Auth-Modul wird in diesem Modus nicht nur übersprungen, sondern gar nicht erst angefasst: der Proxy initialisiert Auth.js nicht, `app/layout.tsx` ruft `auth()` nicht auf, und die Auth.js-Endpunkte unter `/api/auth/*` antworten mit 404. Ein Deployment im none-Modus startet damit ohne `AUTH_SECRET`, `AUTH_URL` und `SEED_ADMIN_*` — ohne diese Abschaltung liefe jeder Request in `MissingSecret`.

## Considered Options

- **Kein none-Modus, stattdessen ein local-Admin mit geteiltem Passwort**: verworfen — erzwingt einen Login-Schritt, den der Betreiber hinter seinem eigenen Gate nicht will, und verleitet zu einem schwachen, geteilten Passwort.
- **Auth.js mit einem Auto-Login-Provider** (anonyme Session für jeden Request): verworfen — baut eine Scheinidentität auf, die nichts trägt, und verlangt weiter `AUTH_SECRET` plus Cookie-Handling. Die Guards müssten eine Session behandeln, die fachlich niemanden meint.
- **Modus über den Matcher der Middleware zur Build-Zeit**: verworfen — der Matcher wird beim Build ausgewertet; dasselbe Docker-Image könnte dann nicht jeden Modus fahren. Der Modus entscheidet deshalb zur Laufzeit.
- **Name `public`**: verworfen — kollidiert begrifflich mit dem geplanten öffentlichen Share-Link für ein einzelnes Recipe.

## Consequences

- `sessionGuard` lässt im none-Modus jeden Request durch, ohne nach einer Session zu fragen; die Recipe-APIs sind damit offen.
- Endpunkte und Seiten, die es nur im local-Modus gibt (Benutzerverwaltung, eigenes Passwort), antworten außerhalb davon mit **404** statt 401/403 — via `localAuthGuard` bzw. `isLocalAuth()`. 404 statt 403, damit der Auth Mode nicht durchscheint.
- Kein Seed-Admin: `instrumentation.ts` seedet weiterhin nur im local-Modus.
- Die Navbar zeigt ohne Session kein Benutzermenü; `/login`, `/admin` und `/account` leiten im none-Modus auf `/` um.
- **Der Default ist offen, nicht geschlossen.** Ein Deployment, das `AUTH_MODE` vergisst, hat keinen Zugangsschutz — bewusst so gewählt, damit WeeMeal ohne Konfiguration sofort läuft. Wer die Instanz ins Internet stellt, muss `AUTH_MODE` aktiv auf `local` oder `keycloak` setzen.
- **Der Modus ist bewusst unsicher.** Eine Instanz im none-Modus gehört nicht ungeschützt ins offene Internet: wer die URL kennt, kann alle Recipes lesen, ändern und löschen. Die Verantwortung für das Gate davor liegt beim Betreiber.
