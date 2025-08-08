/*
 * Hlavní skript pro aplikaci rozlučky se svobodou (Firestore verze).
 * - odstraněny "(opakovat)"
 * - přidány subDescription + subPoints u opakovatelných úkolů
 * - podúkol se vždy vykreslí přímo pod svým hlavním úkolem (odsazeně)
 * - při odškrtnutí hlavního úkolu podúkol zmizí
 * - baseScore (hlavní) + dynamicScore (podúkoly) => score
 */

// ===== Seznam úkolů a bodů =====
const tasks = [
  { description: 'Společně vymysleme jméno pro našeho týpka.', points: 5 },
  { description: 'Udělejme společnou fotku "Před".', points: 5 },
  { description: 'Vyfoť se s nevěstou v originální póze.', points: 10, subDescription: 'Udělej si další fotku s nevěstou.', subPoints: 5 },
  { description: 'Udělej si crazy fotku s naším týpkem.', points: 15, subDescription: 'Znovu se vyfoť s naším týpkem.', subPoints: 5 },
  { description: 'Měj na sobě alespoň 15 minut "Sexy Borat" triko.', points: 45 },
  { description: 'Vyvolej u někoho záchvat smíchu.', points: 50, subDescription: 'Rozesměj někoho dalšího.', subPoints: 5 },
  { description: 'Vyfoť tajně nejulítlejší outfit večera.', points: 20, subDescription: 'Zachyť další šílený outfit.', subPoints: 5 },
  { description: 'Vyfoť tajně někoho, kdo vypadá jako známá osobnost.', points: 20, subDescription: 'Další celebritu prosím.', subPoints: 5 },
  { description: 'Udělej si selfie s naprostým cizincem.', points: 30, subDescription: 'Je libo další neznámý?', subPoints: 5 },
  { description: 'Vyfoť nejvíc sexy týpka večera.', points: 25, subDescription: 'Sem s dalším týpkem!', subPoints: 5 },
  { description: 'Vyfoť tajně holku, která má na sobě víc růžové než ty.', points: 15 },
  { description: 'Zachyť nejvíc znechucený výraz večera.', points: 20, subDescription: 'Vyfoť další znechucený výraz.', subPoints: 5 },
  { description: 'Vyfoť náhodnou věc, která připomíná penis.', points: 25, subDescription: 'Další pindík prosím.', subPoints: 5 },
  { description: 'Udělejme fotku se šesti Tomy a nevěstou.', points: 10 },
  { description: 'Udělej bláznivou selfie s co největším počtem Tomů.', points: 15 },
  { description: 'Udělejme společnou fotku "PO" (před odchodem první z nás).', points: 10 }
];

// Celkový počet bodů – pro výpočet procent v progress baru (jen hlavní úkoly)
const MAX_POINTS = tasks.reduce((sum, t) => sum + t.points, 0);

// Mapování jmen účastnic na avatary (uprav dle reálných souborů)
const playerImages = {
  'Tínka': 'avatars/tinka.png',
  'Míša': 'avatars/misa.png',
  'Mája': 'avatars/maja.png',
  'Masha': 'avatars/masha.png',
  'Žaneta': 'avatars/zaneta.png',
  'Sussi': 'avatars/sussi.png',
  'Tereza': 'avatars/tereza.png'
};

// ===== Motivační hlášky =====
function getMotivationalMessage(score) {
  if (!score || score === 0) return 'Holka, začni! Tohle není kavárna.';
  if (score <= 29) return 'Už to jiskří, ale chce to přidat!';
  if (score <= 59) return 'Rozjíždíš to! Jsi na dobré cestě ke slávě!';
  if (score <= 89) return 'Už jsi legenda večera… skoro!';
  if (score <= 119) return 'Tohle už není hra. To je tvá chvíle slávy';
  if (score <= 149) return '🔥 Královno chaosu! Ostatní nestíhají!';
  if (score <= 169) return 'Už máš pomalu víc bodů než tvoje důstojnost!';
  if (score <= 199) return 'Nevěsta je určitě pyšná… nebo aspoň pobavená.';
  return '👑 Získáváš titul korunovaná ultrapařmenka! 👑';
}

// ===== Hlavní inicializace stránky účastnice =====
function setupPage(participantName) {
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.firestore();

  // DOM prvky
  const nameElement = document.getElementById('participant-name');
  const tasksContainer = document.getElementById('tasks-list'); // kontejner <div> s úkoly
  const scoreValueElement = document.getElementById('score-value');
  const progressBar = document.getElementById('progress-bar');
  const messageElement = document.getElementById('motivational-message');
  const leaderboardBody = document.getElementById('scoreboard-body');

  if (nameElement) nameElement.textContent = participantName;

  // Dokument ve Firestore pro tuto účastnici
  const docRef = db.collection('scores').doc(participantName);

  // Lokální stav hlavních úkolů (checkboxy)
  let currentTasksStatus = tasks.map(() => false);

  // Držáky na DOM uzly podúkolů: index hlavního úkolu -> jeho podúkol (div)
  const subTaskNodes = {};

  // Pomocná funkce: vytvoř podúkol a vlož ho hned POD konkrétní hlavní úkol
  function createSubTaskElement(task, anchorEl, taskIndex) {
    if (!task.subDescription) return;

    // Smaž předchozí podúkol pro daný hlavní úkol (ať je vždy jen jeden)
    if (subTaskNodes[taskIndex]) {
      subTaskNodes[taskIndex].remove();
      delete subTaskNodes[taskIndex];
    }

    const item = document.createElement('div');
    item.className = 'task-item subtask-item'; // přidej do CSS odsazení .subtask-item { margin-left: 24px; }

    const subCheckbox = document.createElement('input');
    subCheckbox.type = 'checkbox';

    const subLabel = document.createElement('label');
    subLabel.innerHTML = `${task.subDescription} (${task.subPoints || 5} bodů)`;

    subCheckbox.addEventListener('change', () => {
      if (subCheckbox.checked) {
        const added = task.subPoints || 5;
        // Přičti body k dynamickému skóre a celkovému skóre
        docRef.get().then((doc) => {
          const data = doc.exists ? doc.data() : {};
          const currentScore = data.score || 0;
          const dynamicScore = data.dynamicScore || 0;
          return docRef.update({
            dynamicScore: dynamicScore + added,
            score: currentScore + added
          });
        }).then(() => {
          // Po připsání bodů vytvoř další podúkol pod TÍM SAMÝM hlavním úkolem
          item.remove();
          delete subTaskNodes[taskIndex];
          createSubTaskElement(task, anchorEl, taskIndex);
        });
      }
    });

    item.appendChild(subCheckbox);
    item.appendChild(subLabel);

    // Klíčový moment: vložit podúkol těsně POD hlavní úkol
    anchorEl.insertAdjacentElement('afterend', item);
    subTaskNodes[taskIndex] = item;
  }

  // Vykresli hlavní úkoly
  tasks.forEach((task, index) => {
    const item = document.createElement('div');
    item.className = 'task-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'task-' + index;
    checkbox.dataset.index = index;

    const label = document.createElement('label');
    label.setAttribute('for', checkbox.id);
    label.innerHTML = `${task.description} (${task.points} bodů)`;

    checkbox.addEventListener('change', () => {
      const idx = parseInt(checkbox.dataset.index, 10);
      const oldChecked = currentTasksStatus[idx];
      currentTasksStatus[idx] = checkbox.checked;

      // Přepočítej základní body
      const baseScore = currentTasksStatus.reduce((sum, checked, i) => sum + (checked ? tasks[i].points : 0), 0);

      // Ulož stav + body
      docRef.get().then((doc) => {
        const data = doc.exists ? doc.data() : {};
        const dynamicScore = data.dynamicScore || 0;
        const totalScore = baseScore + dynamicScore;
        return docRef.set({
          name: participantName,
          tasks: currentTasksStatus,
          baseScore: baseScore,
          dynamicScore: dynamicScore,
          score: totalScore
        });
      }).then(() => {
        // Nově zaškrtnutý hlavní úkol => vytvoř podúkol přímo pod ním
        if (task.subDescription && checkbox.checked && !oldChecked) {
          createSubTaskElement(task, item, idx);
        }
        // Odškrtnutý hlavní úkol => podúkol (pokud existuje) schovej
        if (!checkbox.checked && subTaskNodes[idx]) {
          subTaskNodes[idx].remove();
          delete subTaskNodes[idx];
        }
      });
    });

    item.appendChild(checkbox);
    item.appendChild(label);
    tasksContainer.appendChild(item);
  });

  // Inicializace dokumentu, pokud neexistuje
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

  // Živá synchronizace pro danou účastnici
  docRef.onSnapshot((doc) => {
    if (!doc.exists) return;
    const data = doc.data();
    currentTasksStatus = Array.isArray(data.tasks) ? data.tasks.slice() : tasks.map(() => false);
    const currentScore = data.score || 0;

    // Obnov hlavní checkboxy
    tasks.forEach((task, index) => {
      const cb = document.getElementById('task-' + index);
      if (cb) cb.checked = !!currentTasksStatus[index];
    });

    // Doderenderuj/schovej podúkoly podle stavu hlavních úkolů
    tasks.forEach((task, index) => {
      if (!task.subDescription) return;
      const cb = document.getElementById('task-' + index);
      const mainItem = cb ? cb.closest('.task-item') : null;
      if (cb && cb.checked) {
        if (mainItem && !subTaskNodes[index]) {
          createSubTaskElement(task, mainItem, index);
        }
      } else if (subTaskNodes[index]) {
        subTaskNodes[index].remove();
        delete subTaskNodes[index];
      }
    });

    // UI – skóre, progress, hláška
    if (scoreValueElement) scoreValueElement.textContent = currentScore;
    const percent = (currentScore / MAX_POINTS) * 100;
    if (progressBar) progressBar.style.width = Math.min(percent, 100) + '%';
    if (messageElement) messageElement.textContent = getMotivationalMessage(currentScore);
  });

  // Live leaderboard
  db.collection('scores').onSnapshot((snapshot) => {
    const scores = [];
    snapshot.forEach((d) => {
      const val = d.data();
      scores.push({ name: val.name || d.id, score: val.score || 0 });
    });
    scores.sort((a, b) => b.score - a.score);

    if (leaderboardBody) {
      leaderboardBody.innerHTML = '';
      scores.forEach((entry, idx) => {
        const tr = document.createElement('tr');
        if (idx === 0 && entry.score > 0) tr.classList.add('top-scorer');
        if (entry.name === participantName) tr.classList.add('current-user');

        const nameTd = document.createElement('td');
        const playerContainer = document.createElement('div');
        playerContainer.classList.add('player-cell');
        const img = document.createElement('img');
        img.classList.add('avatar-small');
        img.src = playerImages[entry.name] || '';
        img.alt = entry.name;
        const nameSpan = document.createElement('span');
        nameSpan.textContent = entry.name + (idx === 0 && entry.score > 0 ? ' 👑' : '');
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
