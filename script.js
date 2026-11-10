
(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  const KEYS = {
    assignments: 'pawplanAssignments',
    dragon: 'pawPlanDragon',
    focus: 'pawPlanFocusSession',
    reminders: 'pawPlanReminders',
    team: 'pawPlanTeamPlan'
  };

  const read = (key, fallback) => {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v ?? fallback;
    } catch {
      return fallback;
    }
  };

  const write = (key, value) =>
    localStorage.setItem(key, JSON.stringify(value));

  let assignments = read(KEYS.assignments, []).map(a => ({
    ...a,
    id: String(a.id ?? crypto.randomUUID()),
    tasks: Array.isArray(a.tasks)
      ? a.tasks.map(t =>
          typeof t === 'string'
            ? { text: t, done: false }
            : { text: t.text, done: !!t.done }
        )
      : [],
    missedPenaltyApplied: !!a.missedPenaltyApplied,
    completed: !!a.completed
  }));

  let dragon = {
    points: 0,
    onTimeCount: 0,
    penaltyCount: 0,
    ...read(KEYS.dragon, {})
  };

  dragon.points = Math.max(0, Number(dragon.points) || 0);
  dragon.onTimeCount = Math.max(0, Number(dragon.onTimeCount) || 0);
  dragon.penaltyCount = Math.max(0, Number(dragon.penaltyCount) || 0);

  let reminders = read(KEYS.reminders, []);
  let focus = read(KEYS.focus, null);
  let focusInterval = null;

  const saveAssignments = () => write(KEYS.assignments, assignments);
  const saveDragon = () => write(KEYS.dragon, dragon);
  function launchConfetti() {
    const colors = ['#d33b52', '#f5c15d', '#80d5a0', '#8bbcff', '#ffffff'];
    const container = document.createElement('div');

    container.className = 'confetti-container';
    document.body.appendChild(container);

    for (let i = 0; i < 100; i++) {
        const piece = document.createElement('span');

        piece.className = 'confetti-piece';
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.backgroundColor =
            colors[Math.floor(Math.random() * colors.length)];

        piece.style.setProperty('--fall-x', `${(Math.random() - 0.5) * 400}px`);
        piece.style.setProperty('--fall-y', `${500 + Math.random() * 500}px`);
        piece.style.setProperty('--spin', `${Math.random() * 1000}deg`);
        piece.style.animationDuration = `${2 + Math.random() * 1.5}s`;

        container.appendChild(piece);
    }

    const message = document.createElement('div');
    message.className = 'confetti-message';
    message.textContent = '🎉 Great job! +5 Dragon Points!';
    container.appendChild(message);

    setTimeout(() => container.remove(), 4000);
}
  
  

  const esc = s =>
    String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

  const dateText = v => {
    const d = new Date(v);
    return Number.isNaN(d.getTime())
      ? 'No deadline'
      : d.toLocaleString([], {
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit'
        });
  };

  function setPage(id) {
    if (
      id !== 'focusPage' &&
      document.getElementById('focusPage')?.classList.contains('active') &&
      focus &&
      focus.status === 'running' &&
      !focus.penaltyApplied
    ) {
      focus.penaltyApplied = true;
      recordPenalty();
      write(KEYS.focus, focus);
      clearFocus();
      $('focusStatus').textContent =
        'You left Focus Mode. 5 dragon points deducted.';
    }

    document.querySelectorAll('.page').forEach(p =>
      p.classList.toggle('active', p.id === id)
    );

    document.querySelectorAll('.nav-link').forEach(b =>
      b.classList.toggle('active', b.dataset.page === id)
    );

    const names = {
      dashboardPage: 'Dashboard',
      assignmentsPage: 'Assignments',
      focusPage: 'Focus Mode',
      teamPage: 'TeamSpace'
    };

    $('pageHeading').textContent = names[id] || 'Dashboard';

    if (id === 'dashboardPage') renderDashboard();
    if (id === 'assignmentsPage') renderAssignments();
    if (id === 'teamPage') renderTeamPlan();
  }

  document.querySelectorAll('[data-page]').forEach(b =>
    b.addEventListener('click', () => setPage(b.dataset.page))
  );

  document.querySelectorAll('[data-go]').forEach(b =>
    b.addEventListener('click', () => setPage(b.dataset.go))
  );

  $('todayLabel').textContent = new Date().toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // --------------------------------------------------
  // DRAGON EVOLUTION AND PENALTY SYSTEM
  // --------------------------------------------------

const stageNames = [
  {
    name: 'A tiny egg',
    caption: 'Your journey starts here. Submit 5 assignments on time to hatch!',
    pill: 'STAGE 1'
  },
  {
    name: 'Your Dragon Has Hatched!',
    pill: 'STAGE 2'
  }
];

  function currentDragonStage() {
    return Math.min(
      stageNames.length - 1,
      Math.max(
        0,
        Math.floor(dragon.onTimeCount / 5) -
        Math.floor(dragon.penaltyCount / 5)
      )
    );
  }

  function stageInfo() {
    return stageNames[currentDragonStage()];
  }

  function renderDragon() {
    const stage = currentDragonStage();
    const earned = dragon.onTimeCount % 5;
const penalties = dragon.penaltyCount % 5;

const progress = stage === 1
  ? 5
  : Math.max(0, Math.min(4, earned - penalties));

    const info = stageInfo();

    $('dragonStageName').textContent = info.name;
    $('dragonStagePill').textContent = info.pill;
    $('dragonCaption').textContent = info.caption;

    $('evolutionProgressText').textContent = `${progress} / 5`;
    $('evolutionProgress').style.width = `${progress * 20}%`;

    $('dragonPoints').textContent = dragon.points;
    $('dragonPointsLarge').textContent = dragon.points;

    $('dragonCycleText').textContent =
      `Lifetime on-time: ${dragon.onTimeCount} · Penalties: ${dragon.penaltyCount}`;

    // Always show the 3D model instead of the egg emoji.
    $('dragonEgg').classList.add('hidden');
    $('dragon3DScene').classList.remove('hidden');

    // Select the correct model for the current evolution stage.
    const modelStages = [
  'egg',
  'baby'
];

    if (window.setDragonStage) {
      window.setDragonStage(modelStages[stage]);
    }
  }

  // --------------------------------------------------
  // PENALTY SYSTEM
  // --------------------------------------------------

  function recordPenalty() {
    dragon.points = Math.max(0, dragon.points - 5);
    dragon.penaltyCount = (Number(dragon.penaltyCount) || 0) + 1;

    saveDragon();
    renderDragon();

    const visual = $('dragonEgg').classList.contains('hidden')
      ? $('dragon3DScene')
      : $('dragonEgg');

    visual.classList.remove('fire-effect');
    void visual.offsetWidth;
    visual.classList.add('fire-effect');

    if (window.playDragonAnimation) {
      window.playDragonAnimation('roar');
    }
  }

  function deductPoints() {
    recordPenalty();
  }
  function showFullScreenFire() {
  // Remove an existing fire effect if one is still present.
  document.getElementById('pawplan-fire-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pawplan-fire-overlay';

  overlay.innerHTML = `
    <div class="fire-message">
      <div class="fire-warning">🔥 DEADLINE MISSED 🔥</div>
      <div class="fire-subtext">Your dragon is not happy!</div>
    </div>

    <div class="fire-particles">
      ${Array.from({ length: 45 }, (_, i) =>
        `<span style="
          left:${Math.random() * 100}%;
          animation-delay:${Math.random() * 2}s;
          animation-duration:${1.5 + Math.random() * 2}s;
          --drift:${Math.random() * 160 - 80}px;
        "></span>`
      ).join('')}
    </div>
  `;

  document.body.appendChild(overlay);

  // Remove the effect after five seconds.
  setTimeout(() => {
    overlay.classList.add('fire-fade-out');

    setTimeout(() => overlay.remove(), 700);
  }, 5000);
}
const fireStyles = document.createElement('style');

fireStyles.textContent = `
  #pawplan-fire-overlay {
    position: fixed;
    inset: 0;
    z-index: 99999;
    overflow: hidden;
    pointer-events: none;
    background:
      radial-gradient(ellipse at bottom,
        rgba(255, 30, 0, 0.65) 0%,
        rgba(180, 20, 0, 0.35) 35%,
        rgba(30, 0, 0, 0.12) 75%,
        transparent 100%);
    animation: fire-screen-flash 0.35s infinite alternate;
    opacity: 1;
    transition: opacity 0.7s ease;
  }

  #pawplan-fire-overlay::before,
  #pawplan-fire-overlay::after {
    content: "";
    position: absolute;
    left: -10%;
    width: 120%;
    height: 85%;
    bottom: -20%;
    background:
      radial-gradient(ellipse at 20% 100%, #ff2600 0%, transparent 55%),
      radial-gradient(ellipse at 45% 100%, #ff8c00 0%, transparent 55%),
      radial-gradient(ellipse at 70% 100%, #ff3b00 0%, transparent 55%),
      radial-gradient(ellipse at 90% 100%, #ffae00 0%, transparent 55%);
    filter: blur(18px);
    animation: fire-rise 1.1s ease-in-out infinite alternate;
  }

  #pawplan-fire-overlay::after {
    height: 100%;
    opacity: 0.65;
    filter: blur(35px);
    animation-duration: 0.8s;
    animation-direction: alternate-reverse;
  }

  .fire-message {
    position: absolute;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    text-align: center;
    color: white;
    text-shadow: 0 0 12px #ff3b00, 0 0 30px #ff6a00;
    animation: fire-message-pop 0.5s ease-out;
  }

  .fire-warning {
    font-size: clamp(28px, 5vw, 58px);
    font-weight: 900;
    letter-spacing: 2px;
  }

  .fire-subtext {
    margin-top: 12px;
    font-size: clamp(16px, 2.5vw, 25px);
    font-weight: 700;
  }

  .fire-particles {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .fire-particles span {
    position: absolute;
    bottom: -30px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ffb000;
    box-shadow: 0 0 15px 5px #ff4d00;
    animation: fire-particle-rise 2s linear infinite;
  }

  .fire-fade-out {
    opacity: 0 !important;
  }

  @keyframes fire-rise {
    from { transform: scaleY(0.8) translateY(5%); }
    to { transform: scaleY(1.15) translateY(-5%); }
  }

  @keyframes fire-screen-flash {
    from { background-color: rgba(255, 30, 0, 0.04); }
    to { background-color: rgba(255, 80, 0, 0.18); }
  }

  @keyframes fire-message-pop {
    from { opacity: 0; transform: translate(-50%, -40%) scale(0.8); }
    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }

  @keyframes fire-particle-rise {
    from {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    to {
      transform: translate(var(--drift), -110vh) scale(0.1);
      opacity: 0;
    }
  }
`;

document.head.appendChild(fireStyles);

  // --------------------------------------------------
  // MISSED DEADLINE PENALTIES
  // --------------------------------------------------

function applyMissedPenalties() {
  let changed = false;
  const newlyMissed = [];
  const now = Date.now();

  assignments.forEach(a => {
    if (
      !a.completed &&
      !a.missedPenaltyApplied &&
      new Date(a.deadline).getTime() < now
    ) {
      a.missedPenaltyApplied = true;
      newlyMissed.push(a);
      deductPoints();
      changed = true;
    }
  });

if (changed) {
  saveAssignments();

  // Show one full-screen fire effect for newly missed assignments.
  showFullScreenFire();

  // Refresh both pages after the missed deadline.
  renderAssignments();
  renderDashboard();
}
}

  // --------------------------------------------------
  // ASSIGNMENTS
  // --------------------------------------------------

  $('assignmentForm').addEventListener('submit', e => {
    e.preventDefault();

    const tasks = $('assignmentTasks')
      .value
      .split('\n')
      .map(x => x.trim())
      .filter(Boolean);

    if (!tasks.length) return;

    assignments.unshift({
      id: crypto.randomUUID(),
      title: $('assignmentTitle').value.trim(),
      subject: $('assignmentSubject').value.trim(),
      deadline: $('assignmentDeadline').value,
      difficulty: $('assignmentDifficulty').value,
      tasks: tasks.map(text => ({
        text,
        done: false
      })),
      completed: false,
      createdAt: new Date().toISOString(),
      missedPenaltyApplied: false
    });

    saveAssignments();

    e.target.reset();
    $('assignmentDifficulty').value = 'Medium';

    renderAssignments();
    renderDashboard();
  });

function renderAssignments() {
  const active = assignments.filter(
    a => !a.completed && !a.missedPenaltyApplied
  );

  const done = assignments.filter(a => a.completed);

  const missed = assignments.filter(
    a => !a.completed && a.missedPenaltyApplied
  );

    $('activeListCount').textContent = `${active.length} active`;
    $('activeCount').textContent = active.length;
    $('submittedCount').textContent = done.length;

    const card = (a, completed, isMissed = false) => {
      const all =
        a.tasks.length > 0 &&
        a.tasks.every(t => t.done);

      const pct = a.tasks.length
        ? Math.round(
            a.tasks.filter(t => t.done).length /
            a.tasks.length * 100
          )
        : 0;

      return `
        <article class="assignment-card">
          <div class="assignment-card-top">
            <div>
              <h4>${esc(a.title)}</h4>
              <div class="assignment-meta">
                ${esc(a.subject)} · Due ${dateText(a.deadline)}
              </div>
            </div>
            <span class="difficulty ${esc(a.difficulty)}">
              ${esc(a.difficulty)}
            </span>
          </div>

          ${
completed
  ? `<p class="submitted-stamp">
      ✓ Submitted ${dateText(a.submittedAt)}
    </p>`
  : isMissed
    ? `<p class="missed-stamp">
        ⚠ Missed deadline: ${dateText(a.deadline)}
      </p>`
              : `
                <div class="task-list">
                  ${a.tasks.map((t, i) => `
                    <label class="task-check">
                      <input
                        type="checkbox"
                        data-task="${esc(a.id)}"
                        data-index="${i}"
                        ${t.done ? 'checked' : ''}
                      >
                      <span>${esc(t.text)}</span>
                    </label>
                  `).join('')}
                </div>

                <div class="assignment-bottom">
                  <span>
                    ${pct}% complete ·
                    ${a.tasks.filter(t => t.done).length}/${a.tasks.length} tasks
                  </span>

                  <div class="assignment-actions">
                    <button class="small-btn" data-delete="${esc(a.id)}">
                      Delete
                    </button>

                    <button
                      class="small-btn submit-ready"
                      data-submit="${esc(a.id)}"
                      ${all ? '' : 'disabled'}
                    >
                      Mark submitted
                    </button>
                  </div>
                </div>
              `
          }
        </article>
      `;
    };

    $('activeAssignments').innerHTML = active.length
      ? active.map(a => card(a, false)).join('')
      : '<p class="empty-state panel">No active assignments yet. Create your first one above.</p>';

    $('completedAssignments').innerHTML = done.length
      ? done.map(a => card(a, true)).join('')
      : '<p class="empty-state panel">Your submitted work will appear here.</p>';
      $('missedAssignments').innerHTML = missed.length
  ? missed.map(a => card(a, false, true)).join('')
  : '<p class="empty-state panel">No missed assignments. Keep it up!</p>';
  }

  // Save checklist progress whenever a task is checked.
  $('activeAssignments').addEventListener('change', e => {
    const cb = e.target.closest('[data-task]');
    if (!cb) return;

    const a = assignments.find(x => x.id === cb.dataset.task);

    if (!a || a.completed) return;

    a.tasks[Number(cb.dataset.index)].done = cb.checked;

    saveAssignments();
    renderAssignments();
  });

  $('activeAssignments').addEventListener('click', e => {
    const submit = e.target.closest('[data-submit]');
    const del = e.target.closest('[data-delete]');

    if (submit) {
      const a = assignments.find(x => x.id === submit.dataset.submit);

      if (
        !a ||
        a.completed ||
        !a.tasks.length ||
        !a.tasks.every(t => t.done)
      ) {
        return;
      }

      a.completed = true;
      a.submittedAt = new Date().toISOString();

      const onTime =
        new Date(a.submittedAt).getTime() <=
        new Date(a.deadline).getTime();

if (onTime && !a.missedPenaltyApplied) {
    dragon.points += 5;
    dragon.onTimeCount += 1;
    saveDragon();

    launchConfetti();
} else if (!onTime && !a.missedPenaltyApplied) {
        a.missedPenaltyApplied = true;
        deductPoints();
      }

      saveAssignments();
      renderAssignments();
      renderDashboard();
      renderDragon();
    }

    if (del) {
      if (!confirm(
        'Delete this assignment? Dragon points already earned or lost will not be changed.'
      )) {
        return;
      }

      assignments = assignments.filter(
        a => a.id !== del.dataset.delete
      );

      saveAssignments();
      renderAssignments();
      renderDashboard();
    }
  });

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

  function renderDashboard() {
    renderDragon();

    $('activeCount').textContent =
      assignments.filter(a => !a.completed).length;

    $('submittedCount').textContent =
      assignments.filter(a => a.completed).length;

    $('onTimeCount').textContent = dragon.onTimeCount;

const upcoming = assignments
  .filter(a => !a.completed)
  .sort((a, b) =>
    new Date(a.deadline) - new Date(b.deadline)
  )
  .slice(0, 4);

$('upcomingList').innerHTML = upcoming.length
  ? upcoming.map(a => `
      <div class="compact-item">
        <div>
          <strong>${esc(a.title)}</strong>
          <small>${esc(a.subject)}</small>
        </div>

        <span>
          ${
            a.missedPenaltyApplied
              ? '<strong class="missed-label">MISSED</strong>'
              : dateText(a.deadline)
          }
        </span>
      </div>
    `).join('')
  : '<p class="empty-state">No upcoming deadlines. Enjoy the breathing room!</p>';

    renderReminders();
  }


  // --------------------------------------------------
  // PERSONAL REMINDERS
  // --------------------------------------------------

  function renderReminders() {
    $('reminderList').innerHTML = reminders.length
      ? reminders
          .sort((a, b) => new Date(a.when) - new Date(b.when))
          .map(r => `
            <div class="reminder-item">
              <div>
                <strong>${esc(r.text)}</strong>
                <small>${dateText(r.when)}</small>
              </div>
              <button
                class="small-btn"
                data-reminder-delete="${esc(r.id)}"
              >
                Remove
              </button>
            </div>
          `).join('')
      : '<p class="empty-state">Add a reminder to keep it on your radar.</p>';
  }

  // Add a personal reminder.
  $('reminderForm').addEventListener('submit', async e => {
    e.preventDefault();

    const text = $('reminderText').value.trim();
    const when = $('reminderWhen').value;

    if (!text || !when) return;

    reminders.push({
      id: crypto.randomUUID(),
      text,
      when,
      notified: false
    });

    write(KEYS.reminders, reminders);

    // Ask permission following the user's action.
    if ('Notification' in window &&
        Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (error) {
        console.warn('Notification permission request failed:', error);
      }
    }

    e.target.reset();
    renderReminders();

    checkPersonalReminderNotifications();
  });

  // Check whether any personal reminders are due.
  function checkPersonalReminderNotifications() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const now = Date.now();
    let changed = false;

    reminders.forEach(r => {
      const reminderTime = new Date(r.when).getTime();

      if (
        !r.notified &&
        Number.isFinite(reminderTime) &&
        reminderTime <= now
      ) {
        try {
          new Notification('PawPlan - Personal Reminder', {
            body: `It's time for: ${r.text}`,
            icon: './favicon.ico',
            tag: `personal-reminder-${r.id}`
          });

          r.notified = true;
          changed = true;
        } catch (error) {
          console.error('Could not display reminder notification:', error);
        }
      }
    });

    if (changed) {
      write(KEYS.reminders, reminders);
    }
  }

  // Check every 15 seconds while PawPlan is open.
  const personalReminderInterval = setInterval(
    checkPersonalReminderNotifications,
    15000
  );

  // Check again when the user returns to the page.
  document.addEventListener(
    'visibilitychange',
    checkPersonalReminderNotifications
  );

  // Remove a personal reminder.
  $('reminderList').addEventListener('click', e => {
    const b = e.target.closest('[data-reminder-delete]');
    if (!b) return;

    reminders = reminders.filter(
      r => r.id !== b.dataset.reminderDelete
    );

    write(KEYS.reminders, reminders);
    renderReminders();
  });


  // --------------------------------------------------
  // FOCUS MODE
  // --------------------------------------------------

  function showClock(seconds) {
    seconds = Math.max(0, Math.ceil(seconds));

    $('focusClock').textContent =
      `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function clearFocus() {
    if (focusInterval) {
      clearInterval(focusInterval);
    }

    focusInterval = null;
    focus = null;

    localStorage.removeItem(KEYS.focus);

    $('startFocus').disabled = false;
    $('pauseFocus').disabled = true;
    $('stopFocus').disabled = true;
    $('focusDuration').disabled = false;

    $('focusStatus').textContent = 'Ready when you are.';

    showClock(Number($('focusDuration').value) * 60);
  }

  function tickFocus() {
    if (!focus || focus.status !== 'running') return;

    const remaining = Math.max(
      0,
      Math.ceil((focus.endAt - Date.now()) / 1000)
    );

    focus.remaining = remaining;
    showClock(remaining);

    if (remaining <= 0) {
      clearFocus();

      dragon.points += 5;
      saveDragon();
      renderDragon();

      $('focusStatus').textContent =
        'Session complete! You earned 5 dragon points.';

      $('focusClock').textContent = '00:00';
      return;
    }

    write(KEYS.focus, focus);
  }

  function beginInterval() {
    if (focusInterval) {
      clearInterval(focusInterval);
    }

    focusInterval = setInterval(tickFocus, 250);
  }

  function startFocus() {
    const mins = Number($('focusDuration').value);

    focus = {
      remaining: mins * 60,
      status: 'running',
      endAt: Date.now() + mins * 60000
    };

    write(KEYS.focus, focus);

    $('startFocus').disabled = true;
    $('pauseFocus').disabled = false;
    $('stopFocus').disabled = false;
    $('focusDuration').disabled = true;

    $('focusStatus').textContent =
      'You are in focus mode. Keep going!';

    beginInterval();
    tickFocus();
  }

  $('startFocus').addEventListener('click', () => {
    if (focus && focus.status === 'paused') {
      focus.status = 'running';
      focus.endAt = Date.now() + focus.remaining * 1000;

      write(KEYS.focus, focus);

      $('startFocus').disabled = true;
      $('pauseFocus').disabled = false;
      $('stopFocus').disabled = false;

      $('focusStatus').textContent =
        'Back to it. You’ve got this!';

      beginInterval();
    } else {
      startFocus();
    }
  });

  $('pauseFocus').addEventListener('click', () => {
    if (!focus || focus.status !== 'running') return;

    focus.remaining = Math.max(
      0,
      Math.ceil((focus.endAt - Date.now()) / 1000)
    );

    focus.status = 'paused';
    delete focus.endAt;

    if (focusInterval) {
      clearInterval(focusInterval);
    }

    focusInterval = null;

    write(KEYS.focus, focus);
    showClock(focus.remaining);

    $('startFocus').disabled = false;
    $('startFocus').textContent = 'Resume focus';
    $('pauseFocus').disabled = true;

    $('focusStatus').textContent =
      'Paused. Take a breath; no points lost.';
  });

  $('stopFocus').addEventListener('click', () => {
    if (!focus) return;

    if (!focus.penaltyApplied) {
      focus.penaltyApplied = true;
      recordPenalty();
    }

    clearFocus();

    $('startFocus').textContent = 'Start focus';
    $('focusStatus').textContent =
      'Session stopped. 5 dragon points deducted.';
  });

  function restoreFocus() {
    if (!focus) return;

    if (focus.status === 'running') {
      if (!focus.penaltyApplied) {
        recordPenalty();
      }

      focus = null;
      localStorage.removeItem(KEYS.focus);

      $('focusStatus').textContent =
        'Your previous session was interrupted. 5 points deducted.';

      showClock(Number($('focusDuration').value) * 60);
      return;
    }

    if (focus.status === 'paused') {
      showClock(focus.remaining);

      $('startFocus').textContent = 'Resume focus';
      $('focusStatus').textContent = 'Paused session restored.';
      $('focusDuration').disabled = true;
      $('stopFocus').disabled = false;
    }
  }

  window.addEventListener('pagehide', () => {
    if (
      focus &&
      focus.status === 'running' &&
      !focus.penaltyApplied
    ) {
      focus.penaltyApplied = true;
      recordPenalty();
      write(KEYS.focus, focus);
    }
  });


  // --------------------------------------------------
  // TEAMSPACE
  // --------------------------------------------------

  const difficultyScore = {
    Easy: 1,
    Medium: 2,
    Hard: 3
  };

  const TEAM_HISTORY_KEY = 'pawPlanTeamHistory';

  let teamPlan = read(KEYS.team, null);
  let teamHistory = read(TEAM_HISTORY_KEY, []);

  // Safely upgrade existing saved TeamSpace data.
  if (teamPlan) {
    teamPlan.tasks = Array.isArray(teamPlan.tasks)
      ? teamPlan.tasks.map(t => ({
          ...t,
          done: !!t.done
        }))
      : [];

    teamPlan.assigned = Array.isArray(teamPlan.assigned)
      ? teamPlan.assigned.map(m => ({
          ...m,
          submitted: !!m.submitted,
          tasks: Array.isArray(m.tasks)
            ? m.tasks.map(t => ({
                ...t,
                done: !!t.done
              }))
            : [],
          load: Number(m.load) || 0
        }))
      : [];
  }

  function saveTeamPlan() {
    write(KEYS.team, teamPlan);
  }

  function saveTeamHistory() {
    write(TEAM_HISTORY_KEY, teamHistory);
  }

  $('teamForm').addEventListener('submit', e => {
    e.preventDefault();

    const members = $('teamMembers')
      .value.split('\n')
      .map(x => x.trim())
      .filter(Boolean);

    const tasks = $('teamTasks')
      .value.split('\n')
      .map((line, i) => {
        const parts = line.split('|');
        const d = (parts[1] || 'Medium').trim();

        return {
          id: i,
          text: parts[0].trim(),
          difficulty: difficultyScore[d] ? d : 'Medium',
          done: false
        };
      })
      .filter(t => t.text);

    if (members.length < 2 || !tasks.length) {
      alert('Please add at least two team members and one task.');
      return;
    }

    const mode =
      document.querySelector('input[name="teamMode"]:checked').value;

    let assigned;

    if (mode === 'auto') {
      const loads = members.map(name => ({
        name,
        load: 0,
        tasks: [],
        submitted: false
      }));

      [...tasks]
        .sort((a, b) =>
          difficultyScore[b.difficulty] -
          difficultyScore[a.difficulty]
        )
        .forEach(task => {
          loads.sort((a, b) => a.load - b.load);

          loads[0].tasks.push({ ...task });
          loads[0].load += difficultyScore[task.difficulty];
        });

      assigned = loads;
    } else {
      assigned = members.map(name => ({
        name,
        load: 0,
        tasks: [],
        submitted: false
      }));
    }

    teamPlan = {
      title: $('teamTitle').value.trim(),
      members,
      tasks,
      mode,
      assigned,
      createdAt: new Date().toISOString()
    };

    saveTeamPlan();
    renderTeamPlan();
  });

  function renderTeamPlan() {
    if (!teamPlan) {
      $('teamPlan').innerHTML =
        '<p class="empty-state">No active group assignments. Create one above!</p>';
      return;
    }

    const auto = teamPlan.mode === 'auto';

    const activeMembers = teamPlan.assigned
      .map((member, index) => ({ member, index }))
      .filter(item => !item.member.submitted);

    // If everyone has submitted, archive the group assignment.
    if (activeMembers.length === 0) {
      teamHistory.push({
        ...teamPlan,
        completedAt: new Date().toISOString()
      });

      saveTeamHistory();

      teamPlan = null;
      saveTeamPlan();

      $('teamPlan').innerHTML =
        '<p class="empty-state">All members have submitted! Your group assignment is complete.</p>';

      return;
    }

    $('teamPlan').innerHTML = `
      <article class="team-plan-card">
        <h3>
          ${esc(teamPlan.title)} ·
          ${auto ? 'Automatically balanced' : 'Manual assignment'}
        </h3>

        <p class="field-hint">
          Complete your assigned tasks and submit your portion when ready.
        </p>

        <div id="teamAssignments">
          ${activeMembers.map(({ member, index }) => {
            const allDone =
              member.tasks.length > 0 &&
              member.tasks.every(t => t.done);

            const completedCount =
              member.tasks.filter(t => t.done).length;

            return `
              <div class="team-member-row">
                <div style="width:100%">
                  <strong>${esc(member.name)}</strong>

                  <div class="assignment-meta">
                    ${member.tasks.length} tasks · Workload ${member.load}
                  </div>

                  <div class="task-list">
                    ${
                      member.tasks.length
                        ? member.tasks.map(t => `
                            <label class="task-check">
                              <input
                                type="checkbox"
                                data-team-task="${t.id}"
                                data-team-member="${index}"
                                ${t.done ? 'checked' : ''}
                              >
                              <span>
                                ${esc(t.text)}
                                (${esc(t.difficulty)})
                              </span>
                            </label>
                          `).join('')
                        : '<p class="empty-state">No tasks assigned yet. Assign tasks below.</p>'
                    }
                  </div>

                  <div class="assignment-meta">
                    ${completedCount}/${member.tasks.length} tasks completed
                  </div>

                  ${
                    allDone
                      ? `
                        <button
                          class="small-btn submit-ready"
                          data-member-submit="${index}"
                          type="button"
                          style="margin-top:12px"
                        >
                          Mark as Submitted
                        </button>
                      `
                      : `
                        <p class="field-hint">
                          Complete all assigned tasks to unlock submission.
                        </p>
                      `
                  }
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${
          auto
            ? `
              <p class="field-hint">
                Tasks were distributed by balancing difficulty points
                (Easy 1, Medium 2, Hard 3).
              </p>
            `
            : `
              <div class="manual-editor">
                <h3>Manage task assignments</h3>

                ${teamPlan.tasks.map(t => `
                  <div class="team-member-row">
                    <span>
                      ${esc(t.text)}
                      <small>(${esc(t.difficulty)})</small>
                    </span>

                    <select data-assign-task="${t.id}">
                      ${teamPlan.members.map(m => `
                        <option
                          value="${esc(m)}"
                          ${
                            teamPlan.assigned
                              .find(x => x.name === m)
                              ?.tasks.some(x => x.id === t.id)
                              ? 'selected'
                              : ''
                          }
                        >
                          ${esc(m)}
                        </option>
                      `).join('')}
                    </select>
                  </div>
                `).join('')}
              </div>
            `
        }
      </article>
    `;
  }

  // Save individual task completion.
  $('teamPlan').addEventListener('change', e => {
    const checkbox = e.target.closest('[data-team-task]');

    if (checkbox && teamPlan) {
      const memberIndex = Number(checkbox.dataset.teamMember);
      const taskId = Number(checkbox.dataset.teamTask);

      const member = teamPlan.assigned[memberIndex];

      if (!member || member.submitted) return;

      const memberTask = member.tasks.find(t => t.id === taskId);

      if (!memberTask) return;

      memberTask.done = checkbox.checked;

      // Keep the main task record in sync.
      const mainTask = teamPlan.tasks.find(t => t.id === taskId);

      if (mainTask) {
        mainTask.done = checkbox.checked;
      }

      saveTeamPlan();
      renderTeamPlan();
      return;
    }

    // Preserve existing manual task assignment functionality.
    const sel = e.target.closest('[data-assign-task]');

    if (!sel || !teamPlan) return;

    const task = teamPlan.tasks.find(
      t => t.id === Number(sel.dataset.assignTask)
    );

    if (!task) return;

    const previousMember = teamPlan.assigned.find(
      m => m.tasks.some(x => x.id === task.id)
    );

    if (previousMember?.submitted) {
      alert('This member has already submitted. Their assignment cannot be changed.');
      renderTeamPlan();
      return;
    }

    teamPlan.assigned.forEach(m => {
      m.tasks = m.tasks.filter(t => t.id !== task.id);

      m.load = m.tasks.reduce(
        (n, t) => n + difficultyScore[t.difficulty],
        0
      );
    });

    const member = teamPlan.assigned.find(
      m => m.name === sel.value
    );

    if (!member || member.submitted) {
      renderTeamPlan();
      return;
    }

    member.tasks.push({ ...task });
    member.load += difficultyScore[task.difficulty];

    saveTeamPlan();
    renderTeamPlan();
  });

  // Submit one member's completed portion.
  $('teamPlan').addEventListener('click', e => {
    const submitButton = e.target.closest('[data-member-submit]');

    if (!submitButton || !teamPlan) return;

    const memberIndex = Number(submitButton.dataset.memberSubmit);
    const member = teamPlan.assigned[memberIndex];

    if (
      !member ||
      member.submitted ||
      !member.tasks.length ||
      !member.tasks.every(t => t.done)
    ) {
      return;
    }

    member.submitted = true;
    member.submittedAt = new Date().toISOString();

    saveTeamPlan();
    renderTeamPlan();
  });


  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------

  applyMissedPenalties();
  restoreFocus();
  renderAssignments();
  renderDashboard();
  renderTeamPlan();

  // Check for newly missed deadlines every 30 seconds.
  setInterval(applyMissedPenalties, 30000);

})();


// --------------------------------------------------
// APU STUDENT DEMO ACCOUNT
// --------------------------------------------------

(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const modal = $('authModal');

  if (!modal) return;

  const ACCOUNTS_KEY = 'pawPlanDemoAccounts';
  const SESSION_KEY = 'pawPlanDemoSession';

  let mode = 'login';
  let currentEmail = localStorage.getItem(SESSION_KEY) || '';

  const validEmail = email =>
    /^[a-z0-9._%+-]+@mail\.apu\.edu\.my$/i.test(email);

  const readAccounts = () => {
    try {
      return JSON.parse(
        localStorage.getItem(ACCOUNTS_KEY) || '{}'
      ) || {};
    } catch {
      return {};
    }
  };

  const writeAccounts = accounts =>
    localStorage.setItem(
      ACCOUNTS_KEY,
      JSON.stringify(accounts)
    );

  const hashPassword = async password => {
    if (!window.crypto?.subtle) {
      throw new Error(
        'Secure password hashing is unavailable. Open PawPlan using VS Code Live Server (localhost or HTTPS).'
      );
    }

    const bytes = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', bytes);

    return [...new Uint8Array(digest)]
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  function showMessage(message, error = false) {
    $('authMessage').textContent = message;
    $('authMessage').classList.toggle('error', error);
  }

  function refreshProfile() {
    const initial = currentEmail
      ? currentEmail.charAt(0).toUpperCase()
      : '?';

    $('profileInitial').textContent = initial;
    $('accountInitial').textContent = initial;
    $('accountEmail').textContent = currentEmail;

    $('profileButton').classList.toggle(
      'signed-in',
      !!currentEmail
    );
  }

  function openModal() {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    const signedIn = !!currentEmail;

    $('authForm').classList.toggle('hidden', signedIn);
    $('authTabs').classList.toggle('hidden', signedIn);
    $('accountDetails').classList.toggle('hidden', !signedIn);

    $('authTitle').textContent = signedIn
      ? 'Your account'
      : 'Welcome to PawPlan';

    $('authSubtitle').textContent = signedIn
      ? 'Your local demo account details.'
      : 'Sign in with your APU student email.';

    showMessage('');

    if (!signedIn) {
      $('authEmail').focus();
    }
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  function setMode(next) {
    mode = next;

    document.querySelectorAll('[data-auth-tab]').forEach(tab =>
      tab.classList.toggle(
        'active',
        tab.dataset.authTab === mode
      )
    );

    $('authTitle').textContent =
      mode === 'login'
        ? 'Welcome to PawPlan'
        : 'Create your account';

    $('authSubtitle').textContent =
      mode === 'login'
        ? 'Sign in with your APU student email.'
        : 'Register using your @mail.apu.edu.my address.';

    $('authSubmit').textContent =
      mode === 'login'
        ? 'Login'
        : 'Create account';

    $('authPassword').autocomplete =
      mode === 'login'
        ? 'current-password'
        : 'new-password';

    $('authPassword').value = '';

    showMessage('');
  }

  $('profileButton').addEventListener('click', openModal);
  $('closeAuthModal').addEventListener('click', closeModal);

  modal.addEventListener('click', event => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.querySelectorAll('[data-auth-tab]').forEach(tab =>
    tab.addEventListener(
      'click',
      () => setMode(tab.dataset.authTab)
    )
  );

  $('authForm').addEventListener('submit', async event => {
    event.preventDefault();

    const email = $('authEmail').value.trim().toLowerCase();
    const password = $('authPassword').value;

    if (!validEmail(email)) {
      showMessage(
        'Please use an email ending exactly with @mail.apu.edu.my.',
        true
      );
      return;
    }

    if (password.length < 8) {
      showMessage(
        'Your password must contain at least 8 characters.',
        true
      );
      return;
    }

    $('authSubmit').disabled = true;

    try {
      const accounts = readAccounts();
      const hash = await hashPassword(password);

      if (mode === 'register') {
        if (accounts[email]) {
          showMessage(
            'An account with this email already exists. Please log in.',
            true
          );
          return;
        }

        accounts[email] = {
          passwordHash: hash,
          createdAt: new Date().toISOString()
        };

        writeAccounts(accounts);

        showMessage('Account created. You can now log in.');

        setMode('login');
        $('authEmail').value = email;

      } else {
        if (
          !accounts[email] ||
          accounts[email].passwordHash !== hash
        ) {
          showMessage(
            'Email or password is incorrect.',
            true
          );
          return;
        }

        currentEmail = email;

        localStorage.setItem(SESSION_KEY, email);

        refreshProfile();
        openModal();
      }

    } catch (error) {
      showMessage(
        error.message || 'Something went wrong. Please try again.',
        true
      );

    } finally {
      $('authSubmit').disabled = false;
    }
  });

  $('logoutButton').addEventListener('click', () => {
    currentEmail = '';

    localStorage.removeItem(SESSION_KEY);

    refreshProfile();
    closeModal();
  });

  refreshProfile();

})();
