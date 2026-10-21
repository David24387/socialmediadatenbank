# Apps Script aktualisieren

1. Bestehendes Apps-Script-Projekt öffnen und den bisherigen Code durch Code.gs aus diesem Ordner ersetzen.
2. Im Editor einmal setupDatabase ausführen und die Berechtigungen bestätigen. Der erste Aufbau kann dauern. Erst nach erfolgreicher Ausführung fortfahren.
3. Bereitstellen → Bereitstellungen verwalten → bestehende Web-App bearbeiten → Neue Version → Bereitstellen. Bestehende URL beibehalten. Als Eigentümer ausführen und bisherige Zugriffsregel beibehalten.
4. Die /exec-URL öffnen: Die Antwort muss updatedAt und content enthalten. Auf der Website neu laden.

setupDatabase installiert einen Trigger für refreshDatabase alle fünf Minuten. Neue, geänderte und entfernte Dateien erscheinen nach dem nächsten erfolgreichen Lauf und einem erneuten Abruf der Website. Die geöffnete Website hat weiterhin kein automatisches Polling. Im Apps-Script-Bereich Ausführungen Fehler und Laufzeit kontrollieren; der Trigger ist keine Garantie für exakt fünf Minuten.

Bei einem fehlgeschlagenen Aufbau bleibt der letzte vollständige Index erhalten. Unveränderte Carousel-ZIPs werden anhand ID, Änderungsdatum und Name wiederverwendet. Der Web-Aufruf liest nur den vorbereiteten Index. Indexdateien werden privat im Drive des ausführenden Kontos angelegt; die vorherige Generation bleibt für laufende Anfragen erhalten. Keine Freigaben werden geändert.

Carousel-Vorschauen bleiben zur Kompatibilität Base64-Bilder und vergrößern daher weiterhin die Antwort. Das ZIP-Entpacken liegt jedoch nicht mehr im Seitenaufruf. Normale Bildvorschauen verwenden 600 statt 1600 Pixel. Für eine weitere Verkleinerung der Carousel-Antwort wären separate Vorschaudateien sinnvoll.

Der ungenutzte ?file-Endpunkt des Alt-Scripts wird nicht übernommen; die vorhandene Website verwendet direkte Drive-Downloads und Drive-Video-Embeds.

Validierung lokal mit Apps-Script-Mocks: zehn Aufrufe ohne Ordnerscan/ZIP-Entpacken, unverändertes ZIP wiederverwendet, Trigger nicht doppelt angelegt, Löschung übernommen, fehlgeschlagener Refresh überschreibt den Index nicht. Kein Live-Test im Google-Konto und keine gemessene Live-Ladezeit.
