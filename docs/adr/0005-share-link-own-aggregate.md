# Share Link als eigenes Aggregat neben dem Recipe

Ein **Share Link** (widerrufbarer Lesezugriff auf ein einzelnes Recipe ohne Session) wird als eigenes, persistiertes Aggregat in einer eigenen Collection geführt: Share Token, Recipe ID und Erstellzeitpunkt. Das Recipe selbst erfährt nichts davon und trägt kein Share-Feld. Damit ist das Recipe nicht mehr das einzige persistierte Aggregat — ADR 0002 hatte den separaten Share-Token bereits angekündigt, ohne die Form festzulegen.

Widerrufbarkeit ist die treibende Anforderung: ein einmal geleakter Link muss sich beenden lassen, ohne das Recipe zu löschen. Das schließt einen zustandslosen, signierten Link aus und verlangt einen gespeicherten Token.

## Considered Options

- **Feld `shareToken` am Recipe**: verworfen — das Bearbeitungsformular schickt das ganze Recipe; die Recipe-API müsste das Feld aktiv vor dem Überschreiben schützen. Ein späterer Ausbau auf mehrere Links pro Recipe oder eine Übersicht aller Share Links wäre ein Schema-Umbau. Vorteil wäre gewesen: Löschen räumt automatisch auf, die Markierung „geteilt" in der Übersicht käme ohne zweite Abfrage.
- **Signierte URL ohne Speicherung** (HMAC über Recipe ID): verworfen — nicht widerrufbar, außer durch Löschen des Recipe oder Rotation des Schlüssels für alle Links zugleich.

## Consequences

- Löschen eines Recipe muss dessen Share Link mitlöschen; sonst zeigt der Token ins Leere (für den Share Recipient ohnehin nicht unterscheidbar von „widerrufen").
- Die Markierung „geteilt" auf der RecipeCard braucht eine zweite Abfrage (welche Recipe IDs haben einen Share Link).
- Heute höchstens ein Share Link pro Recipe — als fachliche Regel, nicht als Schema-Zwang. Mehrere Links pro Recipe wären ohne Migration möglich.
- Der Share Recipient bekommt nie die Recipe ID zu sehen; auch der Bring-Export für ihn läuft über den Share Token, damit ein Widerruf auch diesen Weg schließt.
