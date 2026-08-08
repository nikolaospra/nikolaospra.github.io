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
        block,
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

    /*
     * Δημιουργία οθόνης Εορτολογίου
     */
    function showCalendar(event) {
      const container = document.querySelector('.container');

      if (!container) return;

      // Κρύβουμε το πρόγραμμα
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
            ${event.date}
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

      const y = event.dateObj.getFullYear();
      const m = event.dateObj.getMonth() + 1;
      const d = event.dateObj.getDate();

      const apiUrl =
        `https://orthocal.info/api/gregorian/${y}/${m}/${d}/`;

      fetch(apiUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error('Αδυναμία φόρτωσης εορτολογίου');
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
           * Εορτές
           */
          if (data.feasts && data.feasts.length) {
            const section =
              document.createElement('section');

            section.innerHTML = `
              <h2>🎉 Εορτές</h2>
              <ul>
                ${data.feasts
                  .map(feast => `<li>${escapeHtml(feast)}</li>`)
                  .join('')}
              </ul>
            `;

            content.appendChild(section);
          }

          /*
           * Άγιοι
           */
          if (data.saints && data.saints.length) {
            const section =
              document.createElement('section');

            section.innerHTML = `
              <h2>🕊️ Άγιοι της ημέρας</h2>
              <ul>
                ${data.saints
                  .map(saint => `<li>${escapeHtml(saint)}</li>`)
                  .join('')}
              </ul>
            `;

            content.appendChild(section);
          }

          /*
           * Τίτλος ημέρας
           */
          if (data.summary_title) {
            const section =
              document.createElement('section');

            section.innerHTML = `
              <h2>📖 Η ημέρα</h2>
              <p>${escapeHtml(data.summary_title)}</p>
            `;

            content.appendChild(section);
          }

          /*
           * Νηστεία
           */
          if (
            data.fast_level_desc ||
            data.fast_exception_desc
          ) {
            const section =
              document.createElement('section');

            const fastText = [
              data.fast_level_desc,
              data.fast_exception_desc
            ]
              .filter(Boolean)
              .join(' -- ');

            section.innerHTML = `
              <h2>🥖 Νηστεία</h2>
              <p>${escapeHtml(fastText)}</p>
            `;

            content.appendChild(section);
          }

          /*
           * Αναγνώσματα
           */
          if (data.readings && data.readings.length) {
            const section =
              document.createElement('section');

            section.innerHTML = `
              <h2>📖 Αναγνώσματα</h2>
              ${data.readings
                .map(reading => `
                  <div class="reading">
                    <strong>
                      ${escapeHtml(
                        reading.display || ''
                      )}
                    </strong>
                    ${
                      reading.short_display
                        ? `<div>${escapeHtml(
                            reading.short_display
                          )}</div>`
                        : ''
                    }
                  </div>
                `)
                .join('')}
            `;

            content.appendChild(section);
          }

          if (!content.children.length) {
            content.innerHTML = `
              <section>
                <p>
                  Δεν βρέθηκαν διαθέσιμα στοιχεία
                  για αυτή την ημερομηνία.
                </p>
              </section>
            `;
          }

          page.appendChild(content);
        })
        .catch(error => {
          console.error(error);

          const loading =
            page.querySelector('.calendar-loading');

          if (loading) {
            loading.textContent =
              'Δεν ήταν δυνατή η φόρτωση του εορτολογίου.';
          }
        });
    }

    /*
     * Ασφαλής εμφάνιση κειμένου
     */
    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
         * Πάτημα στο γεγονός
         * ανοίγει το εορτολόγιο μέσα στην εφαρμογή.
         */
        li.addEventListener('click', () => {
          showCalendar(event);
        });

        /*
         * Επισήμανση επόμενου γεγονότος
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