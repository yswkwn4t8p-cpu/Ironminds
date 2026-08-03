# Ironminds v3 – Einrichtung

1. Supabase-Projekt öffnen.
2. SQL Editor → New query.
3. Inhalt von `supabase/schema.sql` einfügen und **Run** anklicken.
4. Authentication → URL Configuration öffnen.
5. **Site URL** auf deine GitHub-Pages-Adresse setzen, z. B.:
   `https://DEIN-NAME.github.io/ironminds/`
6. Dieselbe Adresse bei **Redirect URLs** hinzufügen.
7. Alle Dateien und Ordner dieses Pakets in dein GitHub-Repository hochladen.
8. Ironminds öffnen und ein Konto erstellen.
9. Auf Handy und PC mit demselben Konto anmelden.

## Funktionen
- Login, Registrierung, Abmeldung und Passwort-Reset
- Cloud-Synchronisation mit Supabase
- RLS: Jeder Nutzer sieht nur seine eigenen Daten
- Offline-Speicherung im Browser
- mehrere Trainingspläne
- automatische Übernahme der letzten Gewichte
- Übungen, Sätze, Wiederholungen und RPE
- Trainingshistorie, Diagramme und Volumen
- Pausentimer und Backup

## Neu in v3.1

- Freunde über einen persönlichen Freundescode hinzufügen
- Freundschaftsanfragen annehmen oder ablehnen
- abgeschlossene Workouts mit Freunden teilen
- erhaltene Workouts in die eigene Historie übernehmen
- Workload pro Training in der Historie
- Stresslevel 1–10 pro Übung
- RIR (Reps in Reserve) pro Satz

Wichtig: Das aktualisierte `supabase/schema.sql` erneut vollständig im SQL Editor ausführen.

## Neu in v3.2

- Profilfoto, Größe, Alter, aktuelles Gewicht und Zielgewicht
- Körpergewichtsverlauf
- Umfangsmessungen für Brust, Taille, Arm und Oberschenkel
- Fortschrittsfotos
- Kraftrekorde
- Muskelgruppen-Auswertung
- Monatsstatistiken
- Jahresstatistiken

Die aktualisierte Datei `supabase/schema.sql` erneut vollständig im SQL Editor ausführen.
Fortschrittsfotos werden komprimiert und innerhalb des synchronisierten Ironminds-Datensatzes gespeichert. Für sehr viele hochauflösende Fotos wäre später ein separater Supabase-Storage-Bucket sinnvoll.

## Neu in v3.3

- dunkles Premium-Fitnessdesign mit Gym-Hintergrund
- besser lesbare halbtransparente Karten
- mobiler Header korrigiert
- Abmeldebutton am Handy nicht mehr abgeschnitten
- Abmelden zusätzlich im Profilbereich

## Neu in v3.4

- Oberfläche vollständig im transparenten Glassmorphism-Stil
- Startseite mit großem Fitness-Hintergrund und Schnellzugriff
- neue Wochen- und Workload-Karten
- Profilübersicht nach Premium-App-Vorbild
- neue mobile Navigation mit direktem Profilzugriff
- Freunde weiterhin über die Startseite erreichbar

## Neu in v3.5

- Startseite exakt am letzten Entwurf ausgerichtet
- großer Fitness-Hero mit Begrüßung
- 8 Schnellzugriff-Kacheln
- letztes Training mit Kennzahlen
- Wochenübersicht mit Mini-Visualisierungen
- stärkerer transparenter Glassmorphism-Look

## Neu in v3.6

- einheitliche SVG-Outline-Icons statt Emojis und Unicode-Symbolen
- Navigation optisch an den Entwurf angepasst
- passende Icons für Training, Pläne, Übungen, Historie, Profil und Freunde
- neue Symbole für Körpergewicht, Maße, Fotos, Rekorde und Muskelgruppen
- einheitliche rote Akzentfarbe und scharfe Darstellung auf allen Geräten

## Neu in v4.0

- professionell gestaltetes PA-Logo mit rotem Ring und Glow
- Profilname ist direkt im Profil bearbeitbar
- Begrüßung auf der Startseite zeigt immer den Profilnamen
- Tageszeitabhängige Begrüßung: Guten Morgen, Guten Tag oder Guten Abend
- täglich wechselnder Motivationsspruch
- kleiner Abmeldebutton oben rechts im Profil
- alle bisherigen Trainings-, Freunde-, Statistik- und Supabase-Funktionen bleiben erhalten
