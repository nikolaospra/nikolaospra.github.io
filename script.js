fetch('calendar.ics?v=' + Date.now(), { cache: 'no-store' })
  .then(r => {
    if (!r.ok) {
      throw new Error('Αδυναμία φόρτωσης ημερολογίου');
    }

    return r.text();
  })

  .then(ics => {

    const list =
      document.getElementById('events');

    if (!list) {
      throw new Error(
        'Δεν βρέθηκε το στοιχείο events.'
      );
    }

    const blocks =
      ics.match(
        /BEGIN:VEVENT[\s\S]*?END:VEVENT/g
      ) || [];

    const events = [];

    /*
     * =========================
     * ΔΙΑΒΑΣΜΑ ΓΕΓΟΝΟΤΩΝ
     * =========================
     */

    blocks.forEach(block => {

      const get = name => {

        const m = block.match(
          new RegExp(
            '^' +
            name +
            '(?:;[^:]*)?:(.*)$',
            'm'
          )
        );

        return m
          ? m[1].trim()
          : '';
      };

      const dt =
        get('DTSTART');

      const dtEnd =
        get('DTEND');

      const m =
        dt.match(
          /(\d{8})T(\d{4})/
        );

      const mEnd =
        dtEnd.match(
          /(\d{8})T(\d{4})/
        );

      if (!m) return;

      /*
       * =========================
       * ΕΝΑΡΞΗ
       * =========================
       */

      const year =
        Number(
          m[1].slice(0, 4)
        );

      const month =
        Number(
          m[1].slice(4, 6)
        ) - 1;

      const day =
        Number(
          m[1].slice(6, 8)
        );

      const hour =
        Number(
          m[2].slice(0, 2)
        );

      const minute =
        Number(
          m[2].slice(2, 4)
        );

      const dateObj =
        new Date(
          year,
          month,
          day,
          hour,
          minute
        );

      /*
       * =========================
       * ΛΗΞΗ
       * =========================
       */

      let endObj = null;
      let endTime = '';

      if (mEnd) {

        endObj =
          new Date(
            Number(
              mEnd[1].slice(0, 4)
            ),

            Number(
              mEnd[1].slice(4, 6)
            ) - 1,

            Number(
              mEnd[1].slice(6, 8)
            ),

            Number(
              mEnd[2].slice(0, 2)
            ),

            Number(
              mEnd[2].slice(2, 4)
            )
          );

        endTime =
          `${mEnd[2].slice(0, 2)}:` +
          `${mEnd[2].slice(2, 4)}`;
      }

      /*
       * =========================
       * ΗΜΕΡΑ
       * =========================
       */

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
        weekdays[
          dateObj.getDay()
        ];

      const date =
        `${weekday} ` +
        `${m[1].slice(6, 8)}/` +
        `${m[1].slice(4, 6)}/` +
        `${m[1].slice(0, 4)}`;

      const time =
        `${m[2].slice(0, 2)}:` +
        `${m[2].slice(2, 4)}`;

      events.push({

        dateObj,

        endObj,

        date,

        time,

        endTime,

        summary:
          get('SUMMARY'),

        location:
          get('LOCATION')
      });
    });

    /*
     * =========================
     * ESCAPE HTML
     * =========================
     */

    function escapeHtml(value) {

      return String(value)

        .replace(
          /&/g,
          '&amp;'
        )

        .replace(
          /</g,
          '&lt;'
        )

        .replace(
          />/g,
          '&gt;'
        )

        .replace(
          /"/g,
          '&quot;'
        )

        .replace(
          /'/g,
          '&#039;'
        );
    }

    /*
     * =========================
     * ΒΡΙΣΚΟΥΜΕ ΤΗΝ
     * ΤΡΕΧΟΥΣΑ / ΕΠΟΜΕΝΗ
     * =========================
     */

    function getCurrentOrNextEvent() {

      const now =
        new Date();

      return events
        .filter(event => {

          /*
           * Αν έχει DTEND,
           * παραμένει μέχρι
           * να τελειώσει.
           */

          if (event.endObj) {
            return event.endObj > now;
          }

          return event.dateObj >= now;
        })

        .sort(
          (a, b) =>
            a.dateObj - b.dateObj
        )[0] || null;
    }

    /*
     * =========================
     * ΜΟΝΑΔΙΚΟ ID ΓΕΓΟΝΟΤΟΣ
     * =========================
     */

    function eventKey(event) {

      if (!event) {
        return 'none';
      }

      return [
        event.dateObj.getTime(),
        event.endObj
          ? event.endObj.getTime()
          : '',
        event.summary,
        event.location
      ].join('|');
    }

    /*
     * =========================
     * ΕΟΡΤΟΛΟΓΙΟ
     * =========================
     */

    function showCalendar(event) {

      const container =
        document.querySelector(
          '.container'
        );

      if (!container) return;

      container
        .querySelectorAll(
          ':scope > *'
        )
        .forEach(el => {

          el.dataset.calendarHidden =
            'true';

          el.style.display =
            'none';
        });

      const page =
        document.createElement(
          'div'
        );

      page.id =
        'calendar-page';

      page.innerHTML = `

        <div class="calendar-header">

          <button
            id="calendar-back"
            class="calendar-back"
          >
            ← Επιστροφή στο πρόγραμμα
          </button>

          <div class="calendar-title">
            ✝️ Εορτολόγιο
          </div>

          <div class="calendar-date">
            ${escapeHtml(event.date)}
          </div>

        </div>
      `;

      container.appendChild(
        page
      );

      document
        .getElementById(
          'calendar-back'
        )
        .addEventListener(
          'click',
          () => {

            page.remove();

            container
              .querySelectorAll(
                '[data-calendar-hidden="true"]'
              )
              .forEach(el => {

                el.style.display =
                  '';

                delete
                  el.dataset
                    .calendarHidden;
              });
          }
        );

      const saintMonth =
        event.dateObj.getMonth() + 1;

      const saintDay =
        event.dateObj.getDate();

      const iframe =
        document.createElement(
          'iframe'
        );

      iframe.src =
        `https://oia-parish-admin.nikolaos-pra.workers.dev/saint-day?month=${saintMonth}&day=${saintDay}`;

      iframe.style.width =
        '100%';

      iframe.style.height =
        '75vh';

      iframe.style.border =
        '0';

      iframe.style.borderRadius =
        '18px';

      iframe.style.background =
        '#fff';

      page.appendChild(
        iframe
      );
    }

    /*
     * =========================
     * ΑΝΤΙΣΤΡΟΦΗ ΜΕΤΡΗΣΗ
     * =========================
     */

    function countdownText(event) {

      if (!event) {
        return '';
      }

      const now =
        Date.now();

      /*
       * Η ακολουθία βρίσκεται
       * ήδη σε εξέλιξη.
       */

      if (
        event.dateObj.getTime() <= now &&
        event.endObj &&
        event.endObj.getTime() > now
      ) {

        return 'Σε εξέλιξη';
      }

      const difference =
        event.dateObj.getTime()
        - now;

      if (
        difference <= 0
      ) {

        return 'Σε εξέλιξη';
      }

      const totalMinutes =
        Math.floor(
          difference / 60000
        );

      const days =
        Math.floor(
          totalMinutes / 1440
        );

      const hours =
        Math.floor(
          (totalMinutes % 1440) / 60
        );

      const minutes =
        totalMinutes % 60;

      if (days > 0) {

        return (
          `Σε ${days} ` +
          `ημέρα${days === 1 ? '' : 'ες'}` +
          ` και ${hours} ώρ.`
        );
      }

      if (hours > 0) {

        return (
          `Σε ${hours} ώρ. ` +
          `και ${minutes}΄`
        );
      }

      return (
        `Σε ${minutes}΄`
      );
    }

    /*
     * =========================
     * ΕΜΦΑΝΙΣΗ ΠΡΟΓΡΑΜΜΑΤΟΣ
     * =========================
     */

    function renderProgram() {

      const nextEvent =
        getCurrentOrNextEvent();

      /*
       * =========================
       * ΜΕΓΑΛΗ ΚΑΡΤΑ
       * =========================
       */

      const nextEventCard =
        document.getElementById(
          'nextEventCard'
        );

      if (nextEventCard) {

        if (!nextEvent) {

          nextEventCard.innerHTML =
            '';

        } else {

          let locationHtml =
            '';

          /*
           * Η τοποθεσία εμφανίζεται
           * απλά ως κείμενο.
           * Χωρίς Google Maps.
           */

          if (
            nextEvent.location
          ) {

            locationHtml = `
              <div class="next-card-location">
                📍 ${escapeHtml(
                  nextEvent.location
                )}
              </div>
            `;
          }

          nextEventCard.innerHTML = `

            <div class="next-card-label">
              ⛪️ ΕΠΟΜΕΝΗ ΑΚΟΛΟΥΘΙΑ
            </div>

            <div class="next-card-date">
              ${escapeHtml(
                nextEvent.date
              )}
            </div>

            <div class="next-card-time">

              ${escapeHtml(
                nextEvent.time
              )}

              ${
                nextEvent.endTime
                  ? ` – ${escapeHtml(
                      nextEvent.endTime
                    )}`
                  : ''
              }

            </div>

            <div class="next-card-title">
              ${escapeHtml(
                nextEvent.summary
              )}
            </div>

            ${locationHtml}

            <div
              id="nextCountdown"
              class="next-card-countdown"
            >
              ${countdownText(
                nextEvent
              )}
            </div>

          `;
        }
      }

      /*
       * =========================
       * ΛΙΣΤΑ
       * =========================
       */

      const now =
        new Date();

      const upcoming =
        events

          .filter(event => {

            if (event.endObj) {
              return event.endObj > now;
            }

            return event.dateObj >= now;
          })

          .sort(
            (a, b) =>
              a.dateObj - b.dateObj
          );

      list.innerHTML =
        '';

      upcoming.forEach(
        event => {

          const li =
            document.createElement(
              'li'
            );

          li.style.cursor =
            'pointer';

          /*
           * Πάτημα ακολουθίας
           * ανοίγει το εορτολόγιο.
           */

          li.addEventListener(
            'click',
            () => {

              showCalendar(
                event
              );
            }
          );

          if (
            nextEvent &&
            eventKey(event) ===
            eventKey(nextEvent)
          ) {

            li.classList.add(
              'next-event'
            );
          }

          const strong =
            document.createElement(
              'strong'
            );

          strong.textContent =
            `${event.date} · ${event.time}`;

          li.appendChild(
            strong
          );

          if (
            event.endTime
          ) {

            li.appendChild(
              document.createTextNode(
                ` – ${event.endTime}`
              )
            );
          }

          li.appendChild(
            document.createElement(
              'br'
            )
          );

          li.appendChild(
            document.createTextNode(
              event.summary
            )
          );

          /*
           * Τοποθεσία
           * χωρίς Maps.
           */

          if (
            event.location
          ) {

            li.appendChild(
              document.createElement(
                'br'
              )
            );

            const small =
              document.createElement(
                'small'
              );

            small.textContent =
              `📍 ${event.location}`;

            li.appendChild(
              small
            );
          }

          list.appendChild(
            li
          );
        }
      );

      return nextEvent;
    }

    /*
     * =========================
     * ΠΡΩΤΗ ΕΜΦΑΝΙΣΗ
     * =========================
     */

    let displayedEventKey =
      eventKey(
        renderProgram()
      );

    /*
     * =========================
     * ΑΝΑΝΕΩΣΗ ΧΩΡΙΣ REFRESH
     * =========================
     *
     * ΠΟΛΥ ΣΗΜΑΝΤΙΚΟ:
     *
     * Δεν χρησιμοποιούμε:
     *
     * location.reload()
     *
     * Επομένως το iframe του
     * RadioFloga ΔΕΝ καταστρέφεται.
     */

    setInterval(
      () => {

        const currentEvent =
          getCurrentOrNextEvent();

        const currentKey =
          eventKey(
            currentEvent
          );

        /*
         * Μόνο όταν αλλάξει
         * η τρέχουσα/επόμενη
         * ακολουθία ξαναζωγραφίζουμε
         * το πρόγραμμα.
         */

        if (
          currentKey !==
          displayedEventKey
        ) {

          displayedEventKey =
            currentKey;

          renderProgram();
        }

        /*
         * Ενημέρωση αντίστροφης
         * μέτρησης κάθε δευτερόλεπτο.
         */

        const countdown =
          document.getElementById(
            'nextCountdown'
          );

        if (
          countdown &&
          currentEvent
        ) {

          countdown.textContent =
            countdownText(
              currentEvent
            );
        }

      },
      1000
    );

  })

  .catch(err => {

    const list =
      document.getElementById(
        'events'
      );

    if (list) {

      list.textContent =
        'Δεν ήταν δυνατή η φόρτωση του προγράμματος.';
    }

    console.error(
      'CALENDAR ERROR:',
      err
    );
  });