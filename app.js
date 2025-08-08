/*
 * Hlavní skript pro aplikaci rozlučky se svobodou (Firestore verze).
 * Varianta B: podúkol + hvězdičky vedle něj jako historie splnění.
 * - Podúkol (checkbox) přičte +5 bodů, hned se odškrtne a přidá hvězdičku.
 * - Klik na hvězdičku odebere jednu hvězdu a −5 bodů.
 * - Podúkol + hvězdičky se zobrazují pouze, když je hlavní úkol zaškrtnutý.
 * - Body z podúkolů se sčítají a započítávají do celkového skóre.
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

// Základ pro progress bar (jen hlavní úkoly)
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

// ===== Pomocné funkce =====
function computeDynamicFromCounts(repeatCounts) {
  return repeatCounts.reduce((sum, count, i) => {
    const pts = tasks[i].subPoints || 5;
    return sum + (count * (tasks[i].subDescription ? pts : 0));
  }, 0);
}

// ===== Hlavní inicializace stránky účastnice =====
function setupPage(participantName) {
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.firestore();

  // DOM prvky
  const nameElement = document.getElementById('participant-name');
  const tasksContainer = document.getElementById('tasks-list'); // <div> kontejner úkolů
  const scoreValueElement = document.getElementById('score-value');
  const progressBar = document.getElementById('progress-bar');
  const messageElement = document.getElementById('motivational-message');
  const leaderboardBody = document.getElementById('scoreboard-body');

  if (nameElement) nameElement.textContent = participantName;

  const docRef = db.collection('scores').doc(participantName);

  // Lokální stav hlavních úkolů
  let currentTasksStatus = tasks.map(() => false);

  // Držáky na DOM uzly podúkolů: index hlavního úkolu -> element podúkolu
  const subTaskNodes = {};

  // Vytvoř podúkol + hvězdičky hned POD daný hlavní úkol
  function createOrUpdateSubtask(task, anchorEl, taskIndex, repeatCount) {
    if (!task.subDescription) return;

    // Smaž starý uzel, ať je vždy jen jeden
    if (subTaskNodes[taskIndex]) {
      subTaskNodes[taskIndex].remove();
      delete subTaskNodes[taskIndex];
    }

    const item = document.createElement('div');
    item.className = 'task-item subtask-item';

    const subCheckbox = document.createElement('input');
    subCheckbox.type = 'checkbox';

    const subLabel = document.createElement('label');
    subLabel.innerHTML = `${task.subDescription} (${task.subPoints || 5} bodů)`;

    // Hvězdičky (historie splnění)
    const stars = document.createElement('div');
    stars.className = 'subtask-stars';
    // Vyrenderuj repeatCount hvězd
    function renderStars(count) {
      stars.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const s = document.createElement('span');
        s.className = 'star';
        s.textContent = '⭐';
        s.title = 'Kliknutím odebereš 1 splnění (-5 b)';
        s.addEventListener('click', () => {
          // Odečti 1 splnění (a body)
          docRef.get().then((doc) => {
            const data = doc.exists ? doc.data() : {};
            const rc = Array.isArray(data.repeatCounts) ? data.repeatCounts.slice() : tasks.map(() => 0);
            if (rc[taskIndex] > 0) {
              rc[taskIndex] -= 1;
              const baseScore = (Array.isArray(data.tasks) ? data.tasks : tasks.map(() => false))
                .reduce((sum, checked, i) => sum + (checked ? tasks[i].points : 0), 0);
              const dynamicScore = computeDynamicFromCounts(rc);
              const score = baseScore + dynamicScore;
              return docRef.set({
                name: participantName,
                tasks: data.tasks || tasks.map(() => false),
                repeatCounts: rc,
                baseScore,
                dynamicScore,
                score
              });
            }
          }).then(() => {
            // Přerenderuj hvězdy po odečtu
            docRef.get().then((doc) => {
              const dataNow = doc.data() || {};
              const rcNow = Array.isArray(dataNow.repeatCounts) ? dataNow.repeatCounts : tasks.map(() => 0);
              renderStars(rcNow[taskIndex] || 0);
            });
          });
        });
        stars.appendChild(s);
      }
    }
    renderStars(repeatCount || 0);

    // Zaškrtnutí podúkolu -> +1 hvězda a +5 bodů, checkbox se odškrtne
    subCheckbox.addEventListener('change', () => {
      if (subCheckbox.checked) {
        docRef.get().then((doc) => {
          const data = doc.exists ? doc.data() : {};
          const rc = Array.isArray(data.repeatCounts) ? data.repeatCounts.slice() : tasks.map(() => 0);
          rc[taskIndex] = (rc[taskIndex] || 0) + 1;

          const baseScore = (Array.isArray(data.tasks) ? data.tasks : tasks.map(() => false))
            .reduce((sum, checked, i) => sum + (checked ? tasks[i].points : 0), 0);
          const dynamicScore = computeDynamicFromCounts(rc);
          const score = baseScore + dynamicScore;

          return docRef.set({
            name: participantName,
            tasks: data.tasks || tasks.map(() => false),
            repeatCounts: rc,
            baseScore,
            dynamicScore,
            score
          });
        }).then(() => {
          // odškrtnout subcheckbox a přerenderovat hvězdy
          subCheckbox.checked = false;
          docRef.get().then((doc) => {
            const dataNow = doc.data() || {};
            const rcNow = Array.isArray(dataNow.repeatCounts) ? dataNow.repeatCounts : tasks.map(() => 0);
            renderStars(rcNow[taskIndex] || 0);
          });
        });
      }
    });

    item.appendChild(subCheckbox);
    item.appendChild(subLabel);
    item.appendChild(stars);

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

      docRef.get().then((doc) => {
        const data = doc.exists ? doc.data() : {};
        const repeatCounts = Array.isArray(data.repeatCounts) ? data.repeatCounts : tasks.map(() => 0);
        const baseScore = currentTasksStatus.reduce((sum, checked, i) => sum + (checked ? tasks[i].points : 0), 0);
        const dynamicScore = computeDynamicFromCounts(repeatCounts);
        const totalScore = baseScore + dynamicScore;

        return docRef.set({
          name: participantName,
          tasks: currentTasksStatus,
          repeatCounts,
          baseScore,
          dynamicScore,
          score: totalScore
        });
      }).then(() => {
        if (task.subDescription && checkbox.checked && !oldChecked) {
          // při prvním zaškrtnutí vykresli subtask + hvězdy
          docRef.get().then((doc) => {
            const data = doc.data() || {};
            const rc = Array.isArray(data.repeatCounts) ? data.repeatCounts : tasks.map(() => 0);
            createOrUpdateSubtask(task, item, idx, rc[idx] || 0);
          });
        }
        if (!checkbox.checked && subTaskNodes[idx]) {
          // hlavní odškrtnutý -> schovej subtask (data necháme)
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
        tasks: tasks.map(() => false),
        repeatCounts: tasks.map(() => 0)
      });
    }
  });

  // Živá synchronizace pro danou účastnici
  docRef.onSnapshot((doc) => {
    if (!doc.exists) return;
    const data = doc.data();
    const repeatCounts = Array.isArray(data.repeatCounts) ? data.repeatCounts : tasks.map(() => 0);
    currentTasksStatus = Array.isArray(data.tasks) ? data.tasks.slice() : tasks.map(() => false);
    const currentScore = (data.baseScore || 0) + computeDynamicFromCounts(repeatCounts);

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
        if (mainItem) {
          createOrUpdateSubtask(task, mainItem, index, repeatCounts[index] || 0);
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
// Funkce pro spuštění konfet
function launchConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  }
}

// Při kliknutí na hlavní úkol
document.addEventListener('change', function(e) {
  if (e.target.matches('.task-item input[type="checkbox"]') && e.target.checked) {
    launchConfetti();
  }
});

// Při kliknutí na hvězdičku
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('star')) {
    e.target.classList.add('pulse');
    setTimeout(() => e.target.classList.remove('pulse'), 400);
    launchConfetti();
  }
});

  // Live leaderboard
  db.collection('scores').onSnapshot((snapshot) => {
    const scores = [];
    snapshot.forEach((d) => {
      const val = d.data();
      const repeatCounts = Array.isArray(val.repeatCounts) ? val.repeatCounts : tasks.map(() => 0);
      const dynamicScore = computeDynamicFromCounts(repeatCounts);
      const baseScore = val.baseScore || 0;
      scores.push({ name: val.name || d.id, score: (baseScore + dynamicScore) || 0 });
    });
    scores.sort((a, b) => b.score - a.score);

    const leaderboardBody = document.getElementById('scoreboard-body');
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
