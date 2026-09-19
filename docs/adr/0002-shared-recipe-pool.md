# Shared Pool statt Per-User-Ownership für Recipes

WeeMeal behandelt alle Recipes als gemeinsamen Pool: jeder angemeldete User sieht und bearbeitet alle Recipes, es gibt kein Ownership. Damit entfällt das früher reservierte `recipe.userId` und der bisherige, aus einem Query-Parameter gespeiste `userId`-Filter im RecipeRepository. Authentifizierung ist ein reines Zugangs-Gate, keine Sichtbarkeitsgrenze.

Dies kehrt die frühere Absicht um, `userId` am Recipe für Per-User-Rezepte vorzuhalten. Der Betreiber will explizit einen geteilten Bestand für einen kleinen, vertrauten Nutzerkreis, keine privaten Rezeptsammlungen.

## Consequences

- `recipe.userId` wird aus Type, Mongoose-Schema, Validierung, Repository und API entfernt.
- Der frühere `?userId=`-Filter (nie an eine Session gebunden, ein Sicherheitsloch) verschwindet vollständig; Zugriff wird stattdessen durch eine gültige Session in der Middleware erzwungen.
- Das spätere **Share-Feature** (anonymer, read-only Zugriff auf ein einzelnes Recipe) wird kein Ownership brauchen, sondern einen separaten öffentlichen Share-Token — bewusst außerhalb dieser Entscheidung, eigene spätere Session.
