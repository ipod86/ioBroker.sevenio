![Logo](admin/sevenio.png)
# ioBroker.sevenio

[![NPM Version](https://img.shields.io/npm/v/iobroker.sevenio.svg)](https://www.npmjs.com/package/iobroker.sevenio)
[![Downloads](https://img.shields.io/npm/dm/iobroker.sevenio.svg)](https://www.npmjs.com/package/iobroker.sevenio)
![Installationen](https://iobroker.live/badges/sevenio-installed.svg)
![Stabile Version](https://iobroker.live/badges/sevenio-stable.svg)

**Tests:** ![Test and Release](https://github.com/ipod86/ioBroker.sevenio/workflows/Test%20and%20Release/badge.svg)

## ioBroker-Adapter für seven.io

Dieser Adapter verbindet ioBroker mit der [seven.io](https://www.seven.io) SMS- und Kommunikations-API. SMS versenden, Text-to-Speech-Anrufe auslösen — direkt aus Automationen, Blockly-Skripten oder JavaScript heraus. Inklusive Kontaktverwaltung, Zustellstatus, eingehende SMS sowie Kontostandsüberwachung.

---

## Funktionen

- **SMS versenden** — per Datenpunkt, Blockly-Baustein oder `sendTo()`
- **Flash-SMS** — Nachricht erscheint direkt auf dem Display des Empfängers
- **Sprachanrufe (TTS)** — beliebigen Text per automatisiertem Anruf vorlesen lassen
- **Zustellstatus** — automatische Abfrage ~60 s nach dem Versand, Ergebnis in eigenem Datenpunkt
- **Kontaktverwaltung** — Kontakte von seven.io als einzelne Datenpunkte synchronisieren; neue Kontakte direkt aus ioBroker anlegen
- **Empfänger per Name** — statt einer Telefonnummer einfach einen Kontaktnamen eingeben; der Adapter löst ihn automatisch auf
- **Kontostand-Polling** — konfigurierbares Intervall, Ergebnis als lesbarer Datenpunkt
- **Eingehende SMS** — Polling für empfangene Nachrichten (erfordert gemietete Rufnummer, siehe unten)
- **Blockly-Baustein** — fertig nutzbarer Baustein in der sendTo-Kategorie mit Checkboxen für SMS und/oder Anruf
- **`sendTo()`-API** — vollständige Skriptunterstützung für den JavaScript-Adapter

---

## Voraussetzungen

- Ein Konto bei [seven.io](https://www.seven.io)
- Ein gültiger API-Key (im seven.io-Dashboard unter *Entwickler → API-Keys*)

**Kostenmodell:**
- SMS versenden und Sprachanrufe tätigen: **Pay-per-Use** — es fallen nur Kosten pro Nachricht bzw. Anruf an, keine Grundgebühr
- **Eingehende SMS empfangen** erfordert eine gemietete virtuelle Rufnummer von seven.io (~20 € / Monat). Ohne gemietete Nummer steht das Inbound-Polling nicht zur Verfügung

> **Privatkunden:** seven.io ist primär ein Geschäftskundendienst. Bei der Registrierung wird ein Firmenname abgefragt. Privatkunden können dort einfach ihren eigenen Namen oder das Wort *Privat* eintragen — seven.io hat bestätigt, dass dies akzeptiert wird.

---

## Konfiguration

| Einstellung | Beschreibung | Standard |
|---|---|---|
| **API-Key** | Dein seven.io API-Key | *(erforderlich)* |
| **Standard-Absender-ID** | Absendername oder -nummer für Empfänger. Max. 11 alphanumerische **oder** 16 numerische Zeichen. Leer lassen = seven.io-Kontovorgabe. Für Antworten `getReplies: true` pro Nachricht setzen (Blockly-Checkbox oder `sendTo()`) — Details unter [Eingehende SMS](#eingehende-sms). | *(leer)* |
| **Kontostand-Intervall** | Wie oft (in Minuten) der Adapter den Kontostand abfragt | `30` |
| **Inbound-Intervall** | Wie oft (in Minuten) der Adapter neue eingehende SMS prüft. `0` = deaktiviert. | `0` |
| **Ländercode für Preisabfrage** | ISO-Ländercode (z. B. `DE`, `US`) zum Laden der SMS-Preise nur für dieses Land. Leer lassen = alle Länder. | *(leer)* |

---

## Datenpunkte

### `info`
| Datenpunkt | Typ | Beschreibung |
|---|---|---|
| `info.connection` | boolean | `true`, wenn die seven.io-API erreichbar ist |

### `account`
| Datenpunkt | Typ | Beschreibung |
|---|---|---|
| `account.balance` | number | Aktueller Kontostand |
| `account.currency` | string | Währung (z. B. `EUR`) |
| `account.lastCheck` | string | ISO-Zeitstempel der letzten Abfrage |

### `contacts`
| Datenpunkt | Typ | Beschreibung |
|---|---|---|
| `contacts.json` | string (JSON) | Vollständige Kontaktliste als JSON-Array |
| `contacts.count` | number | Anzahl der Kontakte |
| `contacts.refresh` | boolean | Auf `true` setzen → sofortige Aktualisierung der Kontakte |
| `contacts.new.name` | string | Name des neuen Kontakts |
| `contacts.new.number` | string | Telefonnummer des neuen Kontakts (Format: `491234567890`, ohne `+`) |
| `contacts.new.save` | boolean | Auf `true` setzen → Kontakt anlegen und Liste aktualisieren |
| `contacts.list.<Name>` | string | Ein Datenpunkt pro Kontakt — der State-Name ist der Anzeigename (z. B. `contacts.list.Max_Mustermann`), der Wert ist die Telefonnummer |

### `sms`
| Datenpunkt | Typ | R/W | Beschreibung |
|---|---|---|---|
| `sms.to` | string | rw | Empfänger — Telefonnummer (`+491234567890`) **oder Kontaktname** (z. B. `Max Mustermann`) |
| `sms.from` | string | rw | Absender-ID überschreiben — leer = Standardwert aus den Einstellungen |
| `sms.text` | string | rw | Nachrichtentext (max. 1520 Zeichen / ~10 SMS-Teile) |
| `sms.flash` | boolean | rw | Als Flash-SMS senden (erscheint direkt auf dem Display) |
| `sms.getReplies` | boolean | rw | Shared Pool aktivieren damit Empfänger antworten kann — opt-in pro Nachricht, Standard `false` |
| `sms.send` | boolean | rw | Auf `true` setzen → Versand auslösen — wird automatisch auf `false` zurückgesetzt |
| `sms.lastResult` | string (JSON) | r | Vollständige API-Antwort des letzten Versands, inkl. `statusText` |
| `sms.lastStatus` | string | r | Lesbarer Status des letzten Versands (z. B. `Success`, `Insufficient credits`) |
| `sms.lastDelivery` | string (JSON) | r | Zustellbericht ~60 s nach dem Versand — enthält `id`, `to`, `status` (z. B. `DELIVERED`) |

### `sms.inbound`
| Datenpunkt | Typ | Beschreibung |
|---|---|---|
| `sms.inbound.id` | string | Nachrichten-ID der zuletzt empfangenen SMS |
| `sms.inbound.from` | string | Absendernummer der zuletzt empfangenen SMS |
| `sms.inbound.text` | string | Textinhalt der zuletzt empfangenen SMS |
| `sms.inbound.timestamp` | string | Empfangszeitpunkt |

### `voice`
| Datenpunkt | Typ | R/W | Beschreibung |
|---|---|---|---|
| `voice.to` | string | rw | Empfänger-Telefonnummer |
| `voice.from` | string | rw | Verifizierte Absendernummer (muss im seven.io-Konto hinterlegt sein) |
| `voice.text` | string | rw | Vorzulesender Text (TTS), max. 10 000 Zeichen |
| `voice.ringtime` | number | rw | Klingelzeit in Sekunden, bevor aufgelegt wird (5–60, Standard: 30) |
| `voice.send` | boolean | rw | Auf `true` setzen → Anruf starten — wird automatisch auf `false` zurückgesetzt |
| `voice.lastResult` | string (JSON) | r | Vollständige API-Antwort des letzten Anrufs |
| `voice.lastStatus` | string | r | Lesbarer Status des letzten Anrufs (z. B. `Success`, `Call failed`) |

### `pricing`
| Datenpunkt | Typ | Beschreibung |
|---|---|---|
| `pricing.json` | string (JSON) | Vollständige Preisdaten von seven.io — netzspezifische SMS-Preise für das konfigurierte Land oder alle Länder |
| `pricing.price` | number (€) | SMS-Preis für das konfigurierte Land — wird nur gesetzt wenn ein Ländercode konfiguriert ist |
| `pricing.lastUpdate` | string | ISO-Zeitstempel der letzten Preisabfrage |
| `pricing.refresh` | boolean | Auf `true` setzen → Preisdaten sofort aktualisieren |

### `stats` *(rollierendes 30-Tage-Fenster)*

Die Statistiken beziehen sich immer auf den rollierenden Zeitraum **heute − 30 Tage → heute**. Sie werden einmalig beim Adapterstart und bei manueller Auslösung abgerufen — es gibt keinen automatischen Aktualisierungs-Timer.

| Datenpunkt | Typ | Beschreibung |
|---|---|---|
| `stats.smsSent` | number | Gesendete SMS (letzte 30 Tage) |
| `stats.voiceCalls` | number | Ausgeführte Anrufe (letzte 30 Tage) |
| `stats.inbound` | number | Empfangene SMS (letzte 30 Tage) |
| `stats.totalCost` | number | Gesamtkosten in EUR (letzte 30 Tage) |
| `stats.lastUpdate` | string | ISO-Zeitstempel der letzten Statistikabfrage |
| `stats.json` | string (JSON) | Rohdaten der tagesweise gruppierten Statistiken |
| `stats.refresh` | boolean | Auf `true` setzen → Statistiken sofort aktualisieren |

---

## Eingehende SMS

Um SMS-Antworten empfangen zu können, wird eine **numerische Absender-Rufnummer** benötigt — alphanumerische Namen (z. B. `MeineFirma`) können keine direkten Antworten empfangen. Es gibt zwei Optionen:

### Option 1 — Shared Pool (kostenlos, zum Testen und leichtem Betrieb)

`getReplies: true` pro Nachricht setzen (Blockly-Checkbox oder `sendTo()`-Parameter). seven.io weist dann automatisch eine temporäre geteilte Poolnummer als Absender zu, sodass Antworten auch mit alphanumerischer Absender-ID möglich sind.

| | |
|---|---|
| **Kosten** | Kostenlos — nur reguläre SMS-Versandkosten |
| **Antwort-Zeitfenster** | 48 Stunden nach dem Versand |
| **Nummerbeständigkeit** | Innerhalb von 2 Wochen wird versucht, dieselbe Nummer zuzuteilen — ohne Garantie |
| **Verfügbare Länder** | DE 🇩🇪 AT 🇦🇹 CH 🇨🇭 US 🇺🇸 PL 🇵🇱 |
| **Geeignet für** | Tests, geringes Volumen, unkritische Benachrichtigungen |

### Option 2 — Eigene Inbound-Nummer (~20 €/Monat)

Im seven.io-Dashboard eine virtuelle Inbound-Rufnummer mieten. Antworten kommen dauerhaft und zuverlässig an.

| | |
|---|---|
| **Kosten** | ~20 €/Monat |
| **Antwort-Zeitfenster** | Unbegrenzt |
| **Nummerbeständigkeit** | Fest, immer dieselbe Nummer |
| **Verfügbare Länder** | Viele — im seven.io-Dashboard prüfen |
| **Geeignet für** | Laufender Kundenkontakt, Produktiveinsatz |

> Das Polling-Intervall in den Adaptereinstellungen konfigurieren. Auf `0` setzen zum Deaktivieren (z. B. wenn Webhooks genutzt werden).

---

## Blockly

Nach der Installation erscheint in der ioBroker-Blockly-Oberfläche ein fertiger Baustein in der Kategorie **sendTo**.

```
┌─ seven.io  |  SMS ☑  Anruf ☐ ──────────────────┐
│  Absender (optional)  [ ""                ]      │
│  Empfänger            [ "+491234567890"   ]      │
│  Nachricht            [ "Alarm!"          ]      │
│  Flash-SMS ☐  Antworten (Shared Pool) ☐         │
│  Klingelzeit (s)  30                             │
│  Instanz  sevenio.0 ▼                            │
└──────────────────────────────────────────────────┘
```

- **SMS** anhaken → Textnachricht versenden
- **Anruf** anhaken → automatisierten TTS-Anruf starten
- **Beide** anhaken → SMS senden und gleichzeitig anrufen (parallel, ohne zusätzliche Verzögerung)
- **Antworten (Shared Pool)** — wenn aktiviert, verwendet seven.io eine Poolnummer als Absender damit der Empfänger antworten kann (siehe [Eingehende SMS](#eingehende-sms))
- Das Empfänger-Feld akzeptiert eine Telefonnummer oder einen Kontaktnamen aus der seven.io-Kontaktliste

---

## sendTo()-Scripting

Alle Funktionen stehen über `sendTo()` im JavaScript-Adapter zur Verfügung.

**SMS senden:**
```javascript
sendTo('sevenio.0', 'send', {
    to: '+491234567890',   // oder Kontaktname: 'Max Mustermann'
    text: 'Tür geöffnet!',
    flash: false,          // optional
    getReplies: true,      // optional — Shared Pool aktivieren damit Empfänger antworten kann
}, result => {
    console.log(result.statusText); // z. B. 'Success'
});
```

**Sprachanruf auslösen:**
```javascript
sendTo('sevenio.0', 'voice', {
    to: '+491234567890',
    text: 'Achtung! Bewegung in der Garage erkannt.',
    ringtime: 30,          // optional, 5–60 s
});
```

**Kontostand abfragen:**
```javascript
sendTo('sevenio.0', 'get_balance', {}, result => {
    console.log(result.amount, result.currency);
});
```

**Kontaktliste abrufen:**
```javascript
sendTo('sevenio.0', 'get_contacts', {}, contacts => {
    console.log(JSON.stringify(contacts));
});
```

**Kontakt anlegen:**
```javascript
sendTo('sevenio.0', 'create_contact', {
    name: 'Max Mustermann',
    number: '491234567890',   // ohne +
});
```

**Test-SMS (API-Key prüfen):**
```javascript
sendTo('sevenio.0', 'test_sms', { to: '+491234567890' }, result => {
    console.log(result.statusText);
});
```

**Test-Anruf:**
```javascript
sendTo('sevenio.0', 'test_voice', { to: '+491234567890' }, result => {
    console.log(result);
});
```

---

## SMS-Statuscodes

Der Datenpunkt `sms.lastStatus` enthält eine lesbare Übersetzung des seven.io-Statuscodes:

| Code | Bedeutung |
|---|---|
| 100 | Erfolgreich versendet |
| 101 | Übertragung zum SMS-Center fehlgeschlagen |
| 201 | Ungültige Empfängernummer |
| 202 | Ungültige Absender-ID |
| 301 | Unzureichendes Guthaben |
| 403 | Absender ist auf der Sperrliste |
| 500 | Unbekannter Fehler |
| 700 | Netzwerk-Zustelltimeout |

---

## Changelog
<!--
    Platzhalter für die nächste Version (am Zeilenanfang):
    ### **WORK IN PROGRESS**
-->

### **WORK IN PROGRESS**
* (ipod86) Erstveröffentlichung

---

## Lizenz
MIT License

Copyright (c) 2026 ipod86 <david@graef.email>

Hiermit wird unentgeltlich jeder Person, die eine Kopie der Software und der zugehörigen Dokumentationen (die „Software") erhält, die Erlaubnis erteilt, die Software uneingeschränkt zu nutzen, inklusive und ohne Ausnahme mit dem Recht, sie zu verwenden, zu kopieren, zu verändern, zusammenzuführen, zu veröffentlichen, zu verbreiten, zu unterlizenzieren und/oder zu verkaufen, und Personen, denen diese Software überlassen wird, diese Rechte zu verschaffen, unter den folgenden Bedingungen:

Der obige Urheberrechtsvermerk und dieser Erlaubnisvermerk sind in allen Kopien oder Teilkopien der Software beizulegen.

DIE SOFTWARE WIRD OHNE JEDE AUSDRÜCKLICHE ODER IMPLIZIERTE GARANTIE BEREITGESTELLT, EINSCHLIEßLICH DER GARANTIE ZUR BENUTZBARKEIT, EIGNUNG FÜR EINEN BESTIMMTEN ZWECK UND NICHTVERLETZUNG. IN KEINEM FALL SIND DIE AUTOREN ODER COPYRIGHTINHABER FÜR IRGENDEINEN SCHADEN ODER SONSTIGE ANSPRÜCHE HAFTBAR ZU MACHEN, OB INFOLGE DER ERFÜLLUNG EINES VERTRAGES, EINES DELIKTES ODER ANDERS IM ZUSAMMENHANG MIT DER SOFTWARE ODER SONSTIGER VERWENDUNG DER SOFTWARE ENTSTANDEN.
