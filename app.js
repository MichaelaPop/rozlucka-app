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
  { description: 'Společně vymysleme jméno pro našeho týpka.', points: 5 },
  { description: 'Udělejme společnou fotku "Před".', points: 5 },
  { description: 'Vyfoť se s nevěstou v originální póze. (opakovat)', points: 10 },
  { description: 'Udělej si crazy fotku s naším týpkem. (opakovat)', points: 15 },
  { description: 'Měj na sobě alespoň 15 minut "Sexy Borat" triko.', points: 45 },
  { description: 'Vyvolej u někoho záchvat smíchu. (opakovat)', points: 50 },
  { description: 'Vyfoť tajně nejulítlejší outfit večera. (opakovat)', points: 20 },
  { description: 'Vyfoť tajně někoho, kdo vypadá jako známá osobnost. (opakovat)', points: 20 },
  { description: 'Udělej si selfie s naprostým cizincem. (opakovat)', points: 30 },
  { description: 'Vyfoť nejvíc sexy týpka večera. (opakovat)', points: 25 },
  { description: 'Vyfoť tajně holku, která má na sobě víc růžové než ty.', points: 15 },
  { description: 'Zachyť nejvíc znechucený výraz večera. (opakovat)', points: 20 },
  { description: 'Vyfoť náhodnou věc, která připomíná penis. (opakovat)', points: 25 },
  { description: 'Udělejme fotku se šesti Tomy a nevěstou.', points: 10 },
  { description: 'Udělej bláznivou selfie s co největším počtem Tomů.', points: 15 },
  { description: 'Udělejme společnou fotku "PO" (před odchodem první z nás).', points: 10 }
];

// Celkový počet bodů – slouží pro výpočet procent v progress baru
const MAX_POINTS = tasks.reduce((sum, t) => sum + t.points, 0);

/**
 * Mapování jmen účastnic na cesty k jejich avatárům.
 *
 * Tyto cesty se používají při vykreslování tabulky skóre. Pokud se
 * přidá nová účastnice, stačí doplnit její jméno a odpovídající
 * obrázek.
 */
const playerImages = {
  // používáme soubory bez diakritiky, aby GitHub Pages správně obsloužil cesty
  'Tínka': 'avatars/tinka.png',
  'Míša': 'avatars/misa.png',
  'Mája': 'avatars/maja.png',
  'Masha': 'avatars/masha.png',
  'Žaneta': 'avatars/zaneta.png',
  'Sussi': 'avatars/sussi.png',
  'Tereza': 'avatars/tereza.png'
};

/**
 * Vrátí motivační hlášku podle aktuálního skóre.
 *
 * @param {number} score Aktuální počet bodů
 * @returns {string} Text hlášky
 */
function getMotivationalMessage(score) {
  if (!score || score === 0) {
    return 'Holka, začni! Tohle není kavárna.';
  } else if (score <= 29) {
    return 'Už to jiskří, ale chce to přidat!';
  } else if (score <= 59) {
    return 'Rozjíždíš to! Jsi na dobré cestě ke slávě!';
  } else if (score <= 89) {
    return 'Už jsi legenda večera… skoro!';
  } else if (score <= 119) {
    return 'Tohle už není hra. To je tvá chvíle slávy';
  } else if (score <= 149) {
    return '🔥 Královno chaosu! Ostatní nestíhají!';
  } else if (score <= 169) {
    return 'Už máš pomalu víc bodů než tvoje důstojnost!';
  } else if (score <= 199) {
    return 'Nevěsta je určitě pyšná… nebo aspoň pobavená.';
  }
  return '👑 Získáváš titul korunovaná ultrapařmenka! 👑';
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
  // Pomocná funkce pro vytváření podúkolů.  Každý podúkol má vlastní
  // checkbox; po zaškrtnutí přidá hráčce body a vygeneruje nový podúkol.
  function createSubTaskElement(task) {
    // Pokud úkol nemá definovaný podúkol, nic nedělej
    if (!task.subDescription) return;
    const item = document.createElement('div');
    item.className = 'task-item subtask-item';
    const subCheckbox = document.createElement('input');
    subCheckbox.type = 'checkbox';
    const subLabel = document.createElement('label');
    subLabel.innerHTML = `${task.subDescription} (${task.subPoints || 5} bodů)`;
    subCheckbox.addEventListener('change', () => {
      if (subCheckbox.checked) {
        const added = task.subPoints || 5;
        // Přičti body do dynamického skóre a uprav celkové skóre
        docRef.get().then((doc) => {
          const data = doc.exists ? doc.data() : {};
          const currentScore = data.score || 0;
          const dynamicScore = data.dynamicScore || 0;
          const newDynamic = dynamicScore + added;
          const newScore = currentScore + added;
          docRef.update({ dynamicScore: newDynamic, score: newScore });
        });
        // Odstraň starý podúkol z DOMu
        tasksContainer.removeChild(item);
        // Vytvoř další podúkol (takže lze úkol plnit opakovaně)
        createSubTaskElement(task);
      }
    });
    item.appendChild(subCheckbox);
    item.appendChild(subLabel);
    tasksContainer.appendChild(item);
  }

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
    // Zobraz popis úkolu a počet bodů
    label.innerHTML = `${task.description} (${task.points} bodů)`;

    checkbox.addEventListener('change', () => {
      const idx = parseInt(checkbox.dataset.index, 10);
      const oldChecked = currentTasksStatus[idx];
      currentTasksStatus[idx] = checkbox.checked;
      // Spočítej nový počet bodů za základní úkoly
      const baseScore = currentTasksStatus.reduce((sum, checked, i) => sum + (checked ? tasks[i].points : 0), 0);
      // Načti dosavadní dynamické body (pokud existují)
      docRef.get().then((doc) => {
        const data = doc.exists ? doc.data() : {};
        const dynamicScore = data.dynamicScore || 0;
        const totalScore = baseScore + dynamicScore;
        // Zapiš do Firestore jak základní, tak dynamické body a aktuální úkoly
        docRef.set({
          name: participantName,
          tasks: currentTasksStatus,
          baseScore: baseScore,
          dynamicScore: dynamicScore,
          score: totalScore
        });
        // Pokud je úkol opakovatelný a byl právě poprvé zaškrtnut,
        // vytvoř první podúkol
        if (task.subDescription && checkbox.checked && !oldChecked) {
          createSubTaskElement(task);
        }
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
        baseScore: 0,
        dynamicScore: 0,
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
        // Nepřetáhni progress bar přes 100 %
        progressBar.style.width = Math.min(percent, 100) + '%';
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
        // Název sloupce s profilem a jménem
        const nameTd = document.createElement('td');
        // Vytvoř kontejner, do kterého vložíme malý avatar a jméno
        const playerContainer = document.createElement('div');
        playerContainer.classList.add('player-cell');
        // Malý avatar
        const img = document.createElement('img');
        img.classList.add('avatar-small');
        img.src = playerImages[entry.name] || '';
        img.alt = entry.name;
        // Jméno a případná korunka
        const nameSpan = document.createElement('span');
        nameSpan.textContent = entry.name;
        // přidej emoji korunky pro nejlepšího, pokud má body
        if (idx === 0 && entry.score > 0) {
          nameSpan.textContent += ' 👑';
        }
        playerContainer.appendChild(img);
        playerContainer.appendChild(nameSpan);
        nameTd.appendChild(playerContainer);
        const scoreTd = document.createElement('td');
        scoreTd.textContent = entry.score;
        tr.appendChild(nameTd);
        tr.appendChild(scoreTd);
        leaderboardBody.appendChild(tr);
      });
    }
  });
}
