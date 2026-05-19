# SHOTVARA — Prototype 0.0.1

Erster spielbarer Browser-Prototyp für SHOTVARA.

## Enthalten
- Three.js-basierte 3D-Arena
- First-Person-Steuerung per Pointer Lock
- WASD-Bewegung
- Springen mit Leertaste
- einfache Kollisionen mit Wänden und Hindernissen
- Startmenü und Pause-Overlay
- HUD mit Geschwindigkeitsanzeige
- klare Projektstruktur für spätere Ausbaustufen

## Lokaler Start
Da ES-Module verwendet werden, bitte nicht per Doppelklick öffnen, sondern über einen lokalen Webserver.

Beispiele:

```bash
python -m http.server 8080
```

Dann im Browser öffnen:

```text
http://localhost:8080
```

## Geplante nächste Version 0.0.2
- Schießen mit linker Maustaste
- Raycast-Trefferlogik
- Muzzle-Flash / kurzer Schusseffekt
- erste Trefferflächen oder Trainingsziele
