fetch('calendar.ics?v=' + Date.now(), { cache: 'no-store' })
  .then(r => {
    if (!r.ok) throw new Error('Αδυναμία φόρτωσης ημερολογίου');
    return r.text();
  })
  .then(ics => {
    const list = document.getElementById('events');
    list.innerHTML = '';

    const blocks =
      ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

    const events = [];

    blocks.forEach(block => {
      const get = name => {
        const m = block.match(
          new RegExp('^' + name + '(?:;[^:]*)?:(.*)$', 'm')
        );
        return m ? m[1].trim() : '';
      };

      const dt = get('DTSTART');
      const m = dt.match(/(\d{8})T(\d{4})/);

      if (!m) return;

      const year = Number(m[1].slice(0, 4));
      const month = Number(m[1].slice(4, 6)) - 1;
      const day = Number(m[1].slice(6, 8));
      const hour = Number(m[2].slice(0, 2));
      const minute = Number(m[2].slice(2, 4));

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

      const weekday = weekdays[dateObj.getDay()];

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

    const upcoming = events
      .filter(event => event.dateObj >= now)
      .sort((a, b) => a.dateObj - b.dateObj);

    const nextEvent =
      upcoming.length > 0 ? upcoming[0] : null;

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    /*
     * Εορτολόγιο μέσα στην εφαρμογή
     */
    function showCalendar(event) {
      const container = document.querySelector('.container');

      if (!container) return;

      container.querySelectorAll(':scope > *').forEach(el => {
        el.dataset.calendarHidden = 'true';
        el.style.display = 'none';
      });

      const page = document.createElement('div');
      page.id = 'orthodox-calendar-page';

      page.innerHTML = `
        <div class="calendar-header">
          <button id="calendar-back" class="calendar-back">
            ← Επιστροφή στο πρόγραμμα
          </button>

          <div class="calendar-title">
            ✝️ Εορτολόγιο
          </div>

          <div class="calendar-date">
            ${escapeHtml(event.date)}
          </div>

          <div class="calendar-loading">
            Φόρτωση εορτολογίου…
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

     const month = event.dateObj.getMonth() + 1;
const day = event.dateObj.getDate();

const iframe = document.createElement('iframe');

iframe.src = `/saint-day?month=${month}&day=${day}`;

iframe.style.width = '100%';
iframe.style.height = '75vh';
iframe.style.border = '0';
iframe.style.borderRadius = '18px';
iframe.style.background = '#fff';

page.appendChild(iframe);
          }

          return response.json();
        })
        .then(data => {

          const loading =
            page.querySelector('.calendar-loading');

          if (loading) loading.remove();

          const content =
            document.createElement('div');

          content.className =
            'calendar-content';

          /*
           * Βρίσκουμε τη συγκεκριμένη ημέρα.
           * Υποστηρίζουμε και αριθμητικές και string τιμές.
           */
          const dayData =
            Array.isArray(data)
              ? data.find(item =>
                  Number(item.day) === day
                )
              : (
                  data.days
                    ? data.days.find(item =>
                        Number(item.day) === day
                      )
                    : null
                );

          if (!dayData) {
            content.innerHTML = `
              <section>
                <p>
                  Δεν βρέθηκαν στοιχεία εορτολογίου
                  για τη συγκεκριμένη ημερομηνία.
                </p>
              </section>
            `;

            page.appendChild(content);
            return;
          }

          /*
           * Εορτάζουν
           */
          if (
            dayData.celebrating_names &&
            dayData.celebrating_names.length
          ) {
            const section =
              document.createElement('section');

            section.innerHTML = `
              <h2>🎉 Εορτάζουν</h2>
              <ul>
                ${dayData.celebrating_names
                  .map(name =>
                    `<li>${escapeHtml(name)}</li>`
                  )
                  .join('')}
              </ul>
            `;

            content.appendChild(section);
          }

          /*
           * Άγιοι
           */
          if (
            dayData.saints &&
            dayData.saints.length
          ) {
            const section =
              document.createElement('section');

            section.innerHTML = `
              <h2>🕊️ Άγιοι της ημέρας</h2>
              <ul>
                ${dayData.saints
                  .map(saint =>
                    `<li>${escapeHtml(saint)}</li>`
                  )
                  .join('')}
              </ul>
            `;

            content.appendChild(section);
          }

          /*
           * Άλλες πληροφορίες
           */
          if (
            dayData.other_info &&
            dayData.other_info.length
          ) {
            const section =
              document.createElement('section');

            section.innerHTML = `
              <h2>📖 Πληροφορίες</h2>
              <ul>
                ${dayData.other_info
                  .map(info =>
                    `<li>${escapeHtml(info)}</li>`
                  )
                  .join('')}
              </ul>
            `;

            content.appendChild(section);
          }

          if (!content.children.length) {
            content.innerHTML = `
              <section>
                <p>
                  Δεν υπάρχουν επιπλέον πληροφορίες
                  για αυτή την ημερομηνία.
                </p>
              </section>
            `;
          }

          page.appendChild(content);
        })
       .catch(error => {
  console.error('ΕΟΡΤΟΛΟΓΙΟ ERROR:', error);

  const loading =
    page.querySelector('.calendar-loading');

  if (loading) {
    loading.textContent =
      'Σφάλμα: ' + error.message;
  }
});
    }

    /*
     * Εμφάνιση γεγονότων
     */
    events
      .filter(event => event.dateObj >= now)
      .sort((a, b) => a.dateObj - b.dateObj)
      .forEach(event => {

        const li =
          document.createElement('li');

        li.style.cursor = 'pointer';

        /*
         * Πατώντας το γεγονός ανοίγει
         * το εορτολόγιο μέσα στην εφαρμογή.
         */
        li.addEventListener('click', () => {
          showCalendar(event);
        });

        /*
         * Επόμενο γεγονός
         */
        if (nextEvent && event === nextEvent) {
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
          document.createTextNode(event.summary)
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
     * Έλεγχος κάθε λεπτό
     */
    setInterval(() => {
      location.reload();
    }, 60000);

  })
  .catch(err => {
    document.getElementById('events').textContent =
      'Δεν ήταν δυνατή η φόρτωση του προγράμματος.';

    console.error(err);
  });