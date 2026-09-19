# WeeMeal

WeeMeal ist eine Rezeptverwaltung. Es gibt genau ein persistiertes Aggregat — das **Recipe**; alles andere ist eingebettet, ein Value Object oder ein reines UI-/Laufzeit-Konzept.

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

_Reserviert, noch ungenutzt:_ `userId` am Recipe. User/Auth ist noch nicht modelliert und kommt in einer eigenen Session ins Glossar.