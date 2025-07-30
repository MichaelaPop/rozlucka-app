# Interaktivní aplikace pro rozlučku se svobodou

Tato jednoduchá webová aplikace je určena pro zábavné plnění výzev na rozlučce se svobodou. Každá účastnice má vlastní stránku, kde si může označovat splněné úkoly, získávat za ně body a v reálném čase sledovat, jak jsou na tom ostatní.

## Jak to funguje

* **Úkoly a body** – na každé stránce je dvanáct úkolů, každý s předem daným počtem bodů. Po zaškrtnutí se body automaticky sečtou.
* **Sdílené skóre** – výsledky všech účastnic jsou ukládány do online databáze (Firestore). Díky tomu všichni vidí aktuální stav bez obnovování stránky.
* **Motivační hlášky** – pod progress barem se zobrazuje krátká zpráva podle toho, kolik bodů už máte.
* **Leaderboard** – v tabulce „Skóre“ jsou seřazeny všechny účastnice podle počtu bodů. Nejlepší dívka je zvýrazněna zlatým řádkem.

## Vlastní nastavení Firebase

Aplikace používá [Firebase](https://firebase.google.com/) a službu Firestore pro ukládání skóre. Pro funkční provoz je potřeba:

1. **Vytvořit nový projekt ve Firebase Console.**
2. **Povolit službu Firestore** (režim testovací nebo produkční podle potřeby).
3. **Vytvořit webovou aplikaci** v sekci *Project settings → General → Your apps → Web app* a zkopírovat konfigurační objekt.
4. **Do souboru `firebase-config.js`** vložte hodnoty ze své konfigurace:

   ```js
   const firebaseConfig = {
     apiKey: "VAŠE_API_KEY",
     authDomain: "VAŠE_AUTH_DOMAIN",
     projectId: "VAŠE_PROJECT_ID",
     storageBucket: "VAŠE_STORAGE_BUCKET",
     messagingSenderId: "VAŠE_MESSAGING_SENDER_ID",
     appId: "VAŠE_APP_ID"
   };
   ```

5. **Nastavte bezpečnostní pravidla** v Firestore tak, aby bylo možné číst a zapisovat dokumenty ve sbírce `scores` bez přihlášení. Například v testovacím režimu:

   ```
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

6. **Nahrajte soubory na GitHub Pages.** Celý obsah složky `bachelorette-app` můžete umístit do nového repozitáře (např. `rozlucka-app`) a zapnout GitHub Pages. Každá účastnice pak navštíví svou stránku (např. `https://uzivatel.github.io/rozlucka-app/tinka.html`).

## Struktura projektu

| Soubor                       | Popis |
|-----------------------------|-------|
| `index.html`                | Přehledná stránka se seznamem odkazů pro všechny účastnice. |
| `tinka.html`, `misa.html`… | Stránky pro jednotlivé dívky. Název účastnice je předán funkci `setupPage()`. |
| `style.css`                 | Společné styly – růžový gradient, moderní fonty, responzivní rozvržení. |
| `app.js`                    | Hlavní JavaScript: definice úkolů, práce s Firestore, výpočty bodů, aktualizace skóre a motivace. |
| `firebase-config.js`        | Sem vložte vlastní konfiguraci Firebase. |

Po vyplnění konfigurace a nahrání na GitHub Pages budou stránky fungovat bez jakéhokoli dalšího nastavování. Pokud chcete přidat nové účastnice, stačí zkopírovat některou z existujících HTML stránek, upravit jméno v parametru `setupPage()` a přidat odkaz do `index.html`.