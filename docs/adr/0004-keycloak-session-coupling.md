# Die WeeMeal-Session hängt im keycloak-Modus an der Keycloak-Session

Im keycloak-Modus stellt WeeMeal nach dem Login ein eigenes JWT-Cookie aus und fragte Keycloak danach nie wieder (ADR 0001). Die WeeMeal-Session überlebte damit alles, was beim Identity Provider passiert: eine dort beendete Session, einen deaktivierten User, ein entzogenes `weemeal-user` — bis zu 30 Tage lang. Zugriff entziehen wirkte nicht, Rollenänderungen griffen erst beim nächsten Login.

Die Session wird deshalb an die Keycloak-Session gekoppelt, in beide Richtungen:

- **Refresh-Prüfung.** `access_token`, `refresh_token`, `id_token` und der Ablaufzeitpunkt liegen im JWT. Ist das Access-Token abgelaufen (Keycloak-Default: 5 Minuten), tauscht WeeMeal das Refresh-Token gegen ein frisches — und löst dabei die Role über `resolveRole` neu auf. Scheitert der Tausch, liefert der `jwt`-Callback `null`: Auth.js verwirft die Session, der Request landet auf der Login-Seite. Das Fenster zwischen einer Änderung in Keycloak und ihrer Wirkung schrumpft damit von 30 Tagen auf die Lebensdauer des Access-Tokens.
- **RP-initiated Logout.** „Abmelden" beendet zusätzlich die Session im Realm über den `end_session_endpoint`. Sonst bliebe die Keycloak-Session stehen und der nächste Login ginge still per SSO durch — auf geteilten Geräten unerwartet.

Beides gilt **nur im keycloak-Modus**: im local-Modus gibt es keinen externen Provider, im none-Modus keine Session.

## Considered Options

- **Nur `session.maxAge` verkürzen**: verworfen — löst für sich genommen nichts. Ein entzogener Zugriff wirkt weiter erst, wenn die Frist abläuft, und eine kurze Frist wirft aktive Nutzer heraus, deren Keycloak-Session einwandfrei lebt. Als *zusätzliche* Obergrenze (eine Stunde, rollend) bleibt die Verkürzung trotzdem.
- **Bei jedem Request gegen Keycloak prüfen** (Introspection oder `userinfo`): verworfen — ein Netzaufruf pro Request, auch im edge-Proxy, für ein Fenster, das die Refresh-Prüfung schon auf Token-Lebensdauer bringt.
- **Backchannel Logout von Keycloak nach WeeMeal** (Keycloak ruft WeeMeal, wenn dort eine Session endet): verworfen für diesen Schritt — verlangt einen zusätzlichen Endpunkt, Client-Konfiguration beim Betreiber und einen serverseitigen Session-Speicher, den das JWT-Cookie gerade nicht hat. Die Refresh-Prüfung erreicht dasselbe Ziel ohne beides.
- **Logout per Browser-Redirect auf den `end_session_endpoint`** (mit `post_logout_redirect_uri`): verworfen — verlangt eine im Client registrierte Post-Logout-URI und einen Umweg über den Browser. WeeMeal ruft den Endpunkt stattdessen serverseitig mit `id_token_hint` auf; die Session im Realm endet genauso, die Antwort interessiert nicht.

## Consequences

- Das WeeMeal-Cookie trägt im keycloak-Modus das Refresh- und das ID-Token. Es ist signiert und verschlüsselt (Auth.js JWE), bleibt aber ein Cookie — `AUTH_SECRET` schützt damit mehr als vorher. Das Access-Token liegt bewusst **nicht** darin: WeeMeal ruft keine Keycloak-API damit auf, und das Cookie reist bei jedem Request mit.
- Das Cookie wächst trotzdem auf einige Kilobyte und wird von Auth.js gegebenenfalls auf mehrere `Set-Cookie`-Header verteilt. Ein Reverse Proxy mit knappen Header-Puffern (nginx: 4–8 KB) beantwortet den Login-Callback dann mit 502 — der README nennt die nötigen `proxy_buffer_size`-Werte.
- Ein nicht erreichbarer Realm beendet die betroffenen Sessions: der Refresh scheitert, der Nutzer landet auf der Login-Seite. Bewusst so — die Alternative wäre, im Zweifel offen zu bleiben.
- Die Refresh-Prüfung sitzt allein im Proxy (`proxyAuthConfig`), nicht in der geteilten Konfiguration. Der `jwt`-Callback läuft pro Request an mehreren Stellen, aber nur der Proxy reicht ein `Set-Cookie` durch — eine Server Component kann keine Cookies setzen. Liefe die Prüfung überall, würde dasselbe Refresh-Token mehrfach eingelöst. `auth()` und die Auth.js-Endpunkte nehmen das Token deshalb so, wie es im Cookie steht; geschützt wird der Request ohnehin am Gate.
- Jeder Aufruf an Keycloak hat ein Timeout von fünf Sekunden. Der Refresh liegt im Request-Pfad (auch im edge-Proxy); ein hängender Realm würde den Request sonst bis zum Gateway-Timeout blockieren — aus einem Login-Redirect würde ein 502.
- Die Rollen werden beim Refresh aus dem frischen ID-Token gelesen, wie schon beim Login (siehe README); liefert der Refresh kein ID-Token, muss das Access-Token herhalten.
- **Rotierende Refresh-Tokens werden nicht unterstützt.** Das neue Refresh-Token landet nur dann dauerhaft im Cookie, wenn Auth.js das JWT im selben Request neu ausstellt — ein `auth()`-Aufruf in einer Server Component kann keine Cookies schreiben. Mit *Revoke Refresh Token* im Realm liefe der nächste Refresh damit gegen ein verbrauchtes Token und der Nutzer flöge grundlos heraus. Die Einstellung muss aus bleiben (Keycloak-Default).
- Bestehende Sessions überleben das Deployment dieser Änderung nicht: in ihrem JWT fehlt das Refresh-Token, die Prüfung scheitert, der nächste Request führt zum Login.
- Der `token_endpoint` und der `end_session_endpoint` kommen aus dem Discovery-Dokument des Realms, einmal pro Issuer geholt und im Prozess gehalten. Ein Realm-Wechsel wirkt damit erst nach einem Neustart.
- `local` und `none` bleiben unverändert: kein Refresh, kein IdP-Logout, kein verkürztes `maxAge`.
