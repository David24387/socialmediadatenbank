# Apps Script aktualisieren

1. Bestehendes Apps-Script-Projekt öffnen und den bisherigen Code durch Code.gs aus diesem Ordner ersetzen.
2. Im Editor einmal setupDatabase ausführen und die Berechtigungen bestätigen. Der erste Aufbau kann dauern. Erst nach erfolgreicher Ausführung fortfahren.
3. Bereitstellen → Bereitstellungen verwalten → bestehende Web-App bearbeiten → Neue Version → Bereitstellen. Bestehende URL beibehalten. Als Eigentümer ausführen und bisherige Zugriffsregel beibehalten.
4. Die /exec-URL öffnen: Die Antwort muss updatedAt und content enthalten. Auf der Website neu laden.

setupDatabase installiert einen Trigger für refreshDatabase alle fünf Minuten. Neue, geänderte und entfernte Dateien erscheinen nach dem nächsten erfolgreichen Lauf und einem erneuten Abruf der Website. Die geöffnete Website hat weiterhin kein automatisches Polling. Im Apps-Script-Bereich Ausführungen Fehler und Laufzeit kontrollieren; der Trigger ist keine Garantie für exakt fünf Minuten.

Bei einem fehlgeschlagenen Aufbau bleibt der letzte vollständige Index erhalten. Unveränderte Carousel-ZIPs werden anhand ID, Änderungsdatum und Name wiederverwendet. Der Web-Aufruf liest nur den vorbereiteten Index. Indexdateien werden privat im Drive des ausführenden Kontos angelegt; die vorherige Generation bleibt für laufende Anfragen erhalten. Keine Freigaben werden geändert.

Die Website fordert ?view=compact an. Diese Antwort enthält keine eingebetteten Carousel-Bilder. Der kompakte Index wird separat gespeichert und bis 90 KB optional im Script-Cache gehalten; Cache-Ausfall oder Verdrängung fallen auf die gespeicherte Datei zurück. Carousel-Bilder werden als private JSON-Dateien vorbereitet und nur für sichtbare Karten über ?preview=CAROUSEL_ID nachgeladen (maximal drei Anfragen gleichzeitig). Der Endpunkt akzeptiert ausschließlich IDs von Carousels im aktuellen kompakten Index. Downloads und Video-Embeds bleiben unverändert. Die vorherige große Antwort bleibt unter /exec ohne Parameter für ältere Website-Versionen verfügbar.

Für dieses Upgrade den Code erneut ersetzen, setupDatabase ausführen und die bestehende Web-App als neue Version bereitstellen. Die Website bleibt mit dem vorherigen Script kompatibel; bis zur Script-Aktualisierung erhält sie die bisherige große Antwort. Keine bestehenden Drive-Freigaben werden geändert. Bei Änderungen/Entfernen von Carousels können alte, vom Script erstellte Vorschau-JSON-Dateien im Drive verbleiben; sie werden nicht automatisch gelöscht. Normale Bildvorschauen bleiben 600 Pixel breit.

Tests mit simulierten Apps-Script-Diensten und DOM: kompakter Index ohne Bilddaten; separate Vorschau; fremde Datei-ID abgelehnt; kein Ordnerscan bei Web-Aufrufen; unveränderte ZIPs wiederverwendet; Trigger nicht doppelt angelegt; entfernte Inhalte verschwinden. Frontend: 500 Einträge/24 Karten, verzögertes Laden, maximal drei gleichzeitige Vorschauabrufe, Zusammenfassung gleicher Anfragen und Kompatibilität mit alter API. Synthetische 1-MB-Vorschau: ursprüngliche Listenantwort 1.000.468 Bytes, kompakte Antwort 469 Bytes. Dies ist keine Live-Messung.

Der ungenutzte ?file-Endpunkt des Alt-Scripts wird nicht übernommen; die vorhandene Website verwendet direkte Drive-Downloads und Drive-Video-Embeds.

Validierung lokal mit Apps-Script-Mocks: zehn Aufrufe ohne Ordnerscan/ZIP-Entpacken, unverändertes ZIP wiederverwendet, Trigger nicht doppelt angelegt, Löschung übernommen, fehlgeschlagener Refresh überschreibt den Index nicht. Kein Live-Test im Google-Konto und keine gemessene Live-Ladezeit.

## Kampagnen AT und DE

Im bestehenden Drive-Hauptordner werden `AT Kampagne` und `DE Kampagne` erkannt (auch mit Doppelpunkt, Bindestrich oder Unterstrich). Beide Bereiche akzeptieren Bilder, Videos und Carousel-ZIPs gemeinsam, einschließlich Unterordnern. Es wird kein Kanal oder Seitenverhältnis aus dem Ordner abgeleitet. Die Website zeigt eigene Bereiche für AT und DE; Formatfilter bleiben verfügbar. Für die Erkennung den aktualisierten Code.gs in das bestehende Apps-Script-Projekt übernehmen, setupDatabase ausführen und dieselbe Web-App als neue Version bereitstellen.
