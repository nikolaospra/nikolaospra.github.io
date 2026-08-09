fetch('calendar.ics?v=' + Date.now(), { cache: 'no-store' })
  .then(r => {
    if (!r.ok) {
      throw new Error('Αδυναμία φόρτωσης ημερολογίου');
    }
    return r.text();
  })
  .then(ics => {
    const list = document.getElementById('events');

    if (!list) {
      throw new Error('Δεν βρέθηκε το στοιχείο events.');
    }

    list.innerHTML = '';

    const blocks =
      ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

    const events = [];

    blocks.forEach(block => {

      const get = name => {
        const m = block.match(
          new RegExp(
            '^' + name + '(?:;[^:]*)?:(.*)$',
            'm'
          )
        );

        return m ? m[1].trim() : '';
      };

      const dt = get('DTSTART');

      const m = dt.match(/(\d{8})T(\d{4})/);

      if (!m) return;

      const year =
        Number(m[1].slice(0, 4));

      const month =
        Number(m[1].slice(4, 6)) - 1;

      const day =
        Number(m[1].slice(6, 8));

      const hour =
        Number(m[2].slice(0, 2));

      const minute =
        Number(m[2].slice(2, 4));

      const dateObj = new Date(
        year,
        month,
        day,
        hour,
        minute
      );

      const weekdays = [
        'Κυριακή',
        'Δευτέρα',
        'Τρίτη',
        'Τετάρτη',
        'Πέμπτη',
        'Παρασκευή',
        'Σάββατο'
      ];

      const weekday =
        weekdays[dateObj.getDay()];

      const date =
        `${weekday} ${m[1].slice(6, 8)}/${m[1].slice(4, 6)}/${m[1].slice(0, 4)}`;

      const time =
        `${m[2].slice(0, 2)}:${m[2].slice(2, 4)}`;

      events.push({
        dateObj,
        date,
        time,
        summary: get('SUMMARY'),
        location: get('LOCATION')
      });
    });

    const now = new Date();

    /*
     * Κρατάμε μόνο τα μελλοντικά γεγονότα.
     */
     function showCalendar(event) {
  const container = document.querySelector('.container');

  if (!container) return;

  container.querySelectorAll(':scope > *').forEach(el => {
    el.dataset.calendarHidden = 'true';
    el.style.display = 'none';
  });

  const page = document.createElement('div');

  page.id = 'calendar-page';

  page.innerHTML = `
    <div class="calendar-header">
      <button id="calendar-back" class="calendar-back">
        ← Επιστροφή στο πρόγραμμα
      </button>

      <div class="calendar-title">
        ✝️ Εορτολόγιο
      </div>

      <div class="calendar-date">
        ${event.date}
      </div>
    </div>
  `;

  container.appendChild(page);

  document
    .getElementById('calendar-back')
    .addEventListener('click', () => {

      page.remove();

      container
        .querySelectorAll('[data-calendar-hidden="true"]')
        .forEach(el => {
          el.style.display = '';
          delete el.dataset.calendarHidden;
        });
    });

  const month =
    event.dateObj.getMonth() + 1;

  const day =
    event.dateObj.getDate();

  const iframe =
    document.createElement('iframe');

  iframe.src =
  `https://oia-parish-admin.nikolaos-pra.workers.dev/saint-day?month=${month}&day=${day}`;

  iframe.style.width = '100%';
  iframe.style.height = '75vh';
  iframe.style.border = '0';
  iframe.style.borderRadius = '18px';
  iframe.style.background = '#fff';

  page.appendChild(iframe);
}
    const upcoming = events
      .filter(event => event.dateObj >= now)
      .sort(
        (a, b) =>
          a.dateObj - b.dateObj
      );

    /*
     * Το πρώτο είναι το επόμενο γεγονός.
     */
    const nextEvent =
      upcoming.length > 0
        ? upcoming[0]
        : null;
/*
 * ==============================
 * ΜΕΓΑΛΗ ΚΑΡΤΑ ΕΠΟΜΕΝΗΣ ΑΚΟΛΟΥΘΙΑΣ
 * ==============================
 */

const nextEventCard =
  document.getElementById('nextEventCard');

if (nextEventCard && nextEvent) {

  const countdownText = () => {

    const difference =
      nextEvent.dateObj.getTime() - Date.now();

    if (difference <= 0) {
      return 'Ξεκινά τώρα';
    }

    const totalMinutes =
      Math.floor(difference / 60000);

    const days =
      Math.floor(totalMinutes / 1440);

    const hours =
      Math.floor(
        (totalMinutes % 1440) / 60
      );

    const minutes =
      totalMinutes % 60;

    if (days > 0) {
      return `Σε ${days} ημέρα${days === 1 ? '' : 'ες'} και ${hours} ώρ.`;
    }

    if (hours > 0) {
      return `Σε ${hours} ώρ. και ${minutes}΄`;
    }

    return `Σε ${minutes}΄`;
  };

  nextEventCard.innerHTML = `
    <div class="next-card-label">
      ⛪️ ΕΠΟΜΕΝΗ ΑΚΟΛΟΥΘΙΑ
    </div>

    <div class="next-card-date">
      ${nextEvent.date}
    </div>

    <div class="next-card-time">
      ${nextEvent.time}
    </div>

    <div class="next-card-title">
      ${nextEvent.summary}
    </div>

    ${
      nextEvent.location
        ? `
          <div class="next-card-location">
            📍 ${nextEvent.location}
          </div>
        `
        : ''
    }

    <div id="nextCountdown" class="next-card-countdown">
      ${countdownText()}
    </div>
  `;

  const countdown =
    document.getElementById('nextCountdown');

  setInterval(() => {

    if (countdown) {
      countdown.textContent =
        countdownText();
    }

  }, 30000);
}
    /*
     * Εμφάνιση γεγονότων.
     */
    upcoming.forEach(event => {

      const li =
        document.createElement('li');
li.style.cursor = 'pointer';

li.addEventListener('click', () => {
  showCalendar(event);
});
      /*
       * Το επόμενο γεγονός
       * παίρνει τα αντίστροφα χρώματα.
       */
      if (
        nextEvent &&
        event === nextEvent
      ) {
        li.classList.add('next-event');
      }

      const strong =
        document.createElement('strong');

      strong.textContent =
        `${event.date} · ${event.time}`;

      li.appendChild(strong);

      li.appendChild(
        document.createElement('br')
      );

      li.appendChild(
        document.createTextNode(
          event.summary
        )
      );

      if (event.location) {

        li.appendChild(
          document.createElement('br')
        );

        const small =
          document.createElement('small');

        small.textContent =
          `📍 ${event.location}`;

        li.appendChild(small);
      }

      list.appendChild(li);
    });

    /*
     * Κάθε λεπτό ξαναφορτώνουμε το ημερολόγιο.
     *
     * Έτσι όταν περάσει η ώρα ενός γεγονότος:
     * - εξαφανίζεται
     * - το επόμενο γίνεται αυτόματα next-event
     */
    setInterval(() => {
      location.reload();
    }, 60000);

  })
  .catch(err => {

    const list =
      document.getElementById('events');

    if (list) {
      list.textContent =
        'Δεν ήταν δυνατή η φόρτωση του προγράμματος.';
    }

    console.error(
      'CALENDAR ERROR:',
      err
    );
  });