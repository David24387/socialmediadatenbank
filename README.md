# Social Media Content Hub

Visuelle Content-Mediathek für Instagram, Facebook und LinkedIn.

## Inhalte pflegen

Die Einträge liegen in `content.json`. Bilder und Videos können in `assets/` abgelegt und anschließend im Feld `file` referenziert werden, z. B. `assets/winterreifen.jpg`.

Ein Inhalt kann mehreren Plattformen zugeordnet werden:

```json
"platforms": ["instagram", "facebook"]
```

Unterstützte Formate sind aktuell `Bild`, `Video`, `Reel` und `Story`.

## GitHub Pages

Das Projekt ist als statische Seite aufgebaut und kann direkt über GitHub Pages veröffentlicht und anschließend per Link bzw. – sofern das Intranet es erlaubt – eingebettet werden.

## Nächste Ausbaustufe

Für echtes Hochladen direkt über die Website (ohne GitHub-Dateipflege) sollte ein externer Storage plus Authentifizierung ergänzt werden. GitHub Pages selbst hat kein serverseitiges Upload-Backend.
