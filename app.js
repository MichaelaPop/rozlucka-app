/*
 * Hlavní skript pro aplikaci rozlučky se svobodou.
 *
 * Definuje seznam úkolů, inicializuje Firebase/Firestore, vytváří uživatelské
 * rozhraní, reaguje na změny zaškrtávacích políček a synchronizuje data
 * mezi všemi účastnicemi v reálném čase. Leaderboard je automaticky
 * aktualizován a nejúspěšnější dívka je zvýrazněna.
 */

// Seznam úkolů a bodů
// Seznam úkolů pro jednotlivé účastnice.  Upravený podle zpětné vazby:
//  - první úkol používá tvar „vymysleme“ a správný tvar „týpka“
//  - čtvrtý úkol má opravený tvar na „týpkem“
//  - přidány dva nové úkoly se společnou fotkou se šesti Tomy a bláznivou selfie s mnoha Tomy
const tasks = [
  { description: 'Společně vymysleme jméno pro vašeho týpka.', points: 5 },
  { description: 'Udělejme společnou fotku "Před".', points: 5 },
  { description: 'Vyfoť se s nevěstou v originální póze.', points: 10 },
  { description: 'Udělej si crazy fotku s naším týpkem.', points: 15 },
  { description: 'Vyfoť tajně nejulítlejší outfit večera.', points: 20 },
  { description: 'Vyfoť tajně někoho, kdo vypadá jako známá osobnost.', points: 20 },
  { description: 'Udělej si selfie s naprostým cizincem.', points: 30 },
  { description: 'Vyfoť nejvíc sexy týpka večera.', points: 25 },
  { description: 'Vyfoť tajně holku, která má na sobě víc růžové než ty.', points: 15 },
  { description: 'Zachyť nejvíc znechucený výraz večera.', points: 20 },
  { description: 'Vyfoť náhodnou věc, která připomíná penis.', points: 25 },
  { description: 'Udělejme společnou fotku "PO" (před odchodem první z nás).', points: 10 },
  // Nové úkoly přidané pro další body navíc
  { description: 'Udělejme fotku se šesti Tomy a nevěstou.', points: 10 },
  { description: 'Udělej bláznivou selfie s co největším počtem Tomů.', points: 15 }
];

// Celkový počet bodů – slouží pro výpočet procent v progress baru
const MAX_POINTS = tasks.reduce((sum, t) => sum + t.points, 0);

/**
 * Vrátí motivační hlášku podle aktuálního skóre.
 *
 * @param {number} score Aktuální počet bodů
 * @returns {string} Text hlášky
 */
function getMotivationalMessage(score) {
  // Motivace je odstupňovaná podle počtu získaných bodů.  Přidali jsme
  // extra stupeň pro nejvyšší skóre nad 170 bodů, aby se správně
  // zohlednil vyšší maximální počet bodů po přidání nových úkolů.
  if (!score || score === 0) {
    return 'Holka, začni! Tohle není kavárna.';
  } else if (score <= 30) {
    return 'Už to jiskří, ale chce to přidat!';
  } else if (score <= 70) {
    return 'Rozjíždíš to! Jsi na dobré cestě ke slávě!';
  } else if (score <= 120) {
    return 'Už jsi legenda večera… skoro!';
  } else if (score <= 170) {
    return '🔥 Královno chaosu! Ostatní nestíhají!';
  }
  // Nad 170 bodů udělujeme speciální titul ultrapařmenky
  return '🔥🔥🔥Získáváš titul korunovaná ultrapařmenka!🔥🔥🔥';
}

/**
 * Inicializuje stránku pro konkrétní účastnici. Vytvoří prvky UI,
 * přihlásí se k odběru změn v dokumentu i celé kolekci a zajišťuje
 * aktualizaci dat.
 *
 * @param {string} participantName Jméno účastnice (podle názvu souboru)
 */
function setupPage(participantName) {
  // Inicializace Firebase jen jednou
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.firestore();

  // Odkazy na DOM prvky
  const nameElement = document.getElementById('participant-name');
  const tasksContainer = document.getElementById('tasks-list');
  const scoreValueElement = document.getElementById('score-value');
  const progressBar = document.getElementById('progress-bar');
  const messageElement = document.getElementById('motivational-message');
  const leaderboardBody = document.getElementById('scoreboard-body');

  // Nastav jméno účastnice v nadpisu
  if (nameElement) {
    nameElement.textContent = participantName;
  }

  // Dokument ve Firestore pro tuto účastnici
  const docRef = db.collection('scores').doc(participantName);

  // Lokální stav úkolů – pole booleanů
  let currentTasksStatus = tasks.map(() => false);

  // Vytvoř UI pro každý úkol
  tasks.forEach((task, index) => {
    const item = document.createElement('div');
    item.className = 'task-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'task-' + index;
    checkbox.dataset.index = index;

    const label = document.createElement('label');
    label.setAttribute('for', checkbox.id);
    // HTML uvnitř labelu – popis úkolu a počet bodů
    label.innerHTML = `${task.description} <span class="points">(${task.points} bodů)</span>`;

    // Reakce na změnu stavu checkboxu
    checkbox.addEventListener('change', () => {
      const idx = parseInt(checkbox.dataset.index, 10);
      currentTasksStatus[idx] = checkbox.checked;
      // Spočítej nový počet bodů
      const newScore = currentTasksStatus.reduce((sum, checked, i) => sum + (checked ? tasks[i].points : 0), 0);
      // Zapiš do Firestore
      docRef.set({
        name: participantName,
        tasks: currentTasksStatus,
        score: newScore
      });
    });

    item.appendChild(checkbox);
    item.appendChild(label);
    tasksContainer.appendChild(item);
  });

  // Ujisti se, že dokument existuje (vytvoř ho s výchozími hodnotami)
  docRef.get().then((doc) => {
    if (!doc.exists) {
      docRef.set({
        name: participantName,
        score: 0,
        tasks: tasks.map(() => false)
      });
    }
  });

  // Sleduj změny v dokumentu této účastnice (synchronizace úkolů a bodů)
  docRef.onSnapshot((doc) => {
    if (doc.exists) {
      const data = doc.data();
      currentTasksStatus = Array.isArray(data.tasks) ? data.tasks.slice() : tasks.map(() => false);
      const currentScore = data.score || 0;
      // Aktualizuj zaškrtávací políčka bez spouštění event listeneru
      tasks.forEach((task, index) => {
        const cb = document.getElementById('task-' + index);
        if (cb) {
          cb.checked = !!currentTasksStatus[index];
        }
      });
      // Zobrazení počtu bodů
      if (scoreValueElement) {
        scoreValueElement.textContent = currentScore;
      }
      // Aktualizuj progress bar
      const percent = (currentScore / MAX_POINTS) * 100;
      if (progressBar) {
        progressBar.style.width = percent + '%';
      }
      // Motivační hláška
      if (messageElement) {
        messageElement.textContent = getMotivationalMessage(currentScore);
      }
    }
  });

  // Sleduj celou kolekci scores a průběžně aktualizuj leaderboard
  db.collection('scores').onSnapshot((snapshot) => {
    const scores = [];
    snapshot.forEach((doc) => {
      const d = doc.data();
      // Použij jméno dokumentu, pokud chybí jméno v datech
      scores.push({ name: d.name || doc.id, score: d.score || 0 });
    });
    // Seřaď sestupně podle počtu bodů
    scores.sort((a, b) => b.score - a.score);
    // Vymaž staré řádky tabulky
    if (leaderboardBody) {
      leaderboardBody.innerHTML = '';
      scores.forEach((entry, idx) => {
        const tr = document.createElement('tr');
        // zvýrazni vedoucího hráče (pokud má nějaké body)
        if (idx === 0 && entry.score > 0) {
          tr.classList.add('top-scorer');
        }
        // zvýrazni aktuální uživatelku
        if (entry.name === participantName) {
          tr.classList.add('current-user');
        }
        const nameTd = document.createElement('td');
        nameTd.textContent = entry.name;
        // přidej emoji korunky pro nejlepšího
        if (idx === 0 && entry.score > 0) {
          nameTd.textContent += ' 👑';
        }
        const scoreTd = document.createElement('td');
        scoreTd.textContent = entry.score;
        tr.appendChild(nameTd);
        tr.appendChild(scoreTd);
        leaderboardBody.appendChild(tr);
      });
    }
  });
}