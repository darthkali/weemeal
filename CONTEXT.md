# WeeMeal

WeeMeal ist eine Rezeptverwaltung. Fachlich zentrales Aggregat ist das **Recipe**; alles daran ist eingebettet, ein Value Object oder ein reines UI-/Laufzeit-Konzept. Daneben existiert **User** als zweites Konzept — rein als Zugangs-Gate, nicht mit Recipes verknüpft. Wo der User lebt, hängt vom **Auth Mode** ab.

## Language

### Recipe

**Recipe**:
Ein Rezept. Das einzige persistierte Aggregat der Anwendung. Bündelt Name, Zutaten, Zubereitung, Portionsangabe, Bild, Tags, Notizen und Herkunft.

**Recipe ID**:
Eindeutiger Bezeichner eines Recipe, in der Domänensprache immer `id` und zugegriffen über `recipe.id`. Underscores gehören nicht in die Domänensprache.
_Avoid_: `_id`, `recipeId`

**Recipe Instructions**:
Der Freitext der Zubereitungsschritte eines Recipe.

**Tags**:
Freie Schlagwörter zur Kategorisierung und Suche eines Recipe.

**Notes**:
Freitext-Notizen an einem Recipe, unabhängig von der Zubereitung.

### Ingredient List

**IngredientList**:
Die geordnete Liste der Bestandteile eines Recipe. Reihenfolge ergibt sich aus `position`.
_Avoid_: ingredient content, content list

**Line Item**:
Ein Eintrag in der IngredientList. Polymorph: entweder ein **Ingredient** oder ein **Section Header**. Trägt eine `position`, die seinen Platz in der Liste bestimmt.
_Avoid_: IngredientListContent, content, entry, row

**Ingredient**:
Ein Line Item, das eine Zutat beschreibt: Name, optional Amount und Unit.

**Amount**:
Die Menge einer Ingredient. Immer eine Zahl oder leer — nie nicht-numerisch. Eine nicht bezifferbare Menge ("etwas Salz") wird als Ingredient **ohne** Amount ausgedrückt.
_Avoid_: quantity (mehrdeutig, siehe Bring)

**Unit**:
Die Einheit einer Ingredient (z.B. g, ml, Stück). Freitext, kaum eingeschränkt.

**Section Header**:
Ein Line Item, das die Zutaten optisch gruppiert (z.B. "Für den Teig"). Reine positionale Marke ohne Zugehörigkeit — Zutaten "gehören" keinem Section Header, sie liegen nur an einer Position darunter. Darf leer sein.
_Avoid_: Section Caption, sectionName, group

### Portions & Scaling

**Recipe Yield**:
Die Basis-Portionszahl, für die die Amounts eines Recipe erfasst sind. Persistiert als `recipeYield` (aus Schema.org übernommen).
_Avoid_: base portions, defaultPortions

**Selected Portions**:
Die Portionszahl, die beim Kochen angefordert wird. Rein zur Laufzeit gewählt (nicht in der Datenbank), steuert die Skalierung.
_Avoid_: portions, defaultPortions, requestedQuantity

**Scaling Factor**:
Verhältnis Selected Portions / Recipe Yield. Faktor, mit dem Amounts umgerechnet werden.

**Scaled Amount**:
Das Ergebnis aus Amount × Scaling Factor. Wird angezeigt und an Bring übergeben. Ein Line Item ohne Amount (und jeder Section Header) wird nie skaliert. Kommazahlen werden erst bei der Anzeige gerundet, intern roh gerechnet.

### Source

**Source**:
Die optionale Herkunft eines Recipe. Genau eine der drei Varianten oder keine.
_Avoid_: RecipeSource, RecipeSourceInput

**URL Source**:
Eine Source vom Typ `url`: ein klick- bzw. öffenbarer Link.

**Book Source**:
Eine Source vom Typ `book`: strukturiert als Buchtitel und Seitenzahl.

**Text Source**:
Eine Source als beliebiger Freitext (z.B. "Rezept meiner Oma", "Verpackung der Milchreis-Packung"). Für Herkünfte, die weder Link noch strukturiertes Buch sind.

### Integrations

**Bring**:
Externe Einkaufslisten-App. Ein Recipe wird als Schema.org-`Recipe` exportiert und per Deeplink an Bring übergeben. An dieser Grenze heißen die Portionsangaben `baseQuantity` (= Recipe Yield) und `requestedQuantity` (= Selected Portions) — diese Namen sind von Bring vorgegeben und gelten nur an der Bring-Grenze.

**Image**:
Das Bild eines Recipe. Im Dateisystem gespeichert (nicht in MongoDB), am Recipe nur als `imageUrl` referenziert.

---

_Reserviert, noch ungenutzt:_ ~~`userId` am Recipe~~. **Entfernt** — WeeMeal ist ein Shared Pool: jeder angemeldete User sieht alle Recipes, es gibt kein Ownership (siehe ADR 0002). Recipes tragen keinen Bezug zu einem User.

## User & Auth

**User**:
Ein Zugangsberechtigter. Trägt genau eine **Role** und dient allein dem Login — er besitzt keine Recipes und hat keine weitere fachliche Bedeutung. Persistenz hängt vom **Auth Mode** ab: im local-Modus in WeeMeal gespeichert, im keycloak-Modus in Keycloak.
_Avoid_: Account, Member, Konto

**Username**:
Der Login-Bezeichner eines User. Im local-Modus die Identität (Username + Passwort). Im keycloak-Modus der `preferred_username`-Claim.

**Role**:
Die Rolle eines User: `user` oder `admin`. Ein **Admin** ist immer auch `user`. Es kann mehrere Admins geben.
_Avoid_: Permission, Grant, Berechtigung

**Admin**:
Ein User mit Role `admin`. Darf im local-Modus andere User verwalten. Es muss **immer mindestens einen Admin** geben — ein Admin kann sich die Admin-Rolle nicht selbst entziehen, und der einzige verbleibende Admin ist nicht löschbar (Invarianten gelten nur im local-Modus; im keycloak-Modus verantwortet Keycloak die Rollen).

**Auth Mode**:
Der pro Deployment fest gewählte Authentifizierungs-Modus: **`keycloak`** (Login über Keycloak als externen Identity Provider) oder **`local`** (WeeMeal-eigene User mit Username + Passwort). Genau einer pro Instanz.
_Avoid_: auth strategy, login type

**Identity Provider**:
Die austauschbare Quelle von Authentifizierung und Rollen hinter dem Auth Mode. Im keycloak-Modus ist es Keycloak, im local-Modus WeeMeal selbst. Beide erfüllen denselben Vertrag (Login prüfen, Role liefern; User-Verwaltung nur local).
_Avoid_: IdP-Provider, AuthProvider

**Claim**:
Eine Aussage im Token, die WeeMeal nach dem Login liest — insbesondere die **Role**. Im keycloak-Modus stammt sie aus den Keycloak-Rollen `weemeal-user` / `weemeal-admin`; ohne `weemeal-user` kein Zutritt.

**Session**:
Der angemeldete Zustand eines User nach erfolgreichem Login. Trägt Username, Role und Auth Mode. Ohne Session ist nichts sichtbar (auch keine Recipes).

**Seed Admin**:
Der beim Start automatisch angelegte erste Admin im local-Modus, aus Konfiguration. Wird nur erzeugt, wenn noch kein Admin existiert (idempotent). Im keycloak-Modus existiert kein Seed.
_Avoid_: root user, default admin