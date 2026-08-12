fetch('calendar.ics?v=' + Date.now(), { cache: 'no-store' })
  .then(r => {
    if (!r.ok) {
      throw new Error('Αδυναμία φόρτωσης ημερολογίου');
    }

    return r.text();
  })

  .then(ics => {

    /*
     * =========================
     * ΔΙΓΛΩΣΣΗ ΛΕΙΤΟΥΡΓΙΑ
     * =========================
     */

    const translations = {
      el: {
        nextService: '⛪️ ΕΠΟΜΕΝΗ ΑΚΟΛΟΥΘΙΑ',
        inProgress: 'Σε εξέλιξη',
        backToSchedule: '← Επιστροφή στο πρόγραμμα',
        calendarTitle: '✝️ Εορτολόγιο',
        errorCalendar:
          'Δεν ήταν δυνατή η φόρτωση του προγράμματος.',
        weekdays: [
          'Κυριακή',
          'Δευτέρα',
          'Τρίτη',
          'Τετάρτη',
          'Πέμπτη',
          'Παρασκευή',
          'Σάββατο'
        ],
        day: 'ημέρα',
        days: 'ημέρες',
        hour: 'ώρ.',
        minute: '΄'
      },

      en: {
        nextService: '⛪️ NEXT SERVICE',
        inProgress: 'In progress',
        backToSchedule: '← Back to schedule',
        calendarTitle: '✝️ Saints’ Calendar',
        errorCalendar:
          'The service schedule could not be loaded.',
        weekdays: [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday'
        ],
        day: 'day',
        days: 'days',
        hour: 'hr.',
        minute: 'min.'
      }
    };


    /*
     * =========================
     * ΜΕΤΑΦΡΑΣΕΙΣ ΑΚΟΛΟΥΘΙΩΝ
     * =========================
     */

    const serviceTranslations = {

      'Όρθρος':
        'Matins',

      'Θεία Λειτουργία':
        'Divine Liturgy',

      'Όρθρος - Θεία Λειτουργία':
        'Matins - Divine Liturgy',

      'Όρθρος – Θεία Λειτουργία':
        'Matins – Divine Liturgy',

      'Εσπερινός':
        'Vespers',

      'Εσπερινός - Θεία Λειτουργία':
        'Vespers - Divine Liturgy',

      'Ιερά Παράκληση':
        'Paraklesis Service',

      'Ιερά Παράκληση στην Παναγία':
        'Paraklesis Service to the Theotokos',

      'Μικρή Παράκληση':
        'Small Paraklesis',

      'Μεγάλη Παράκληση':
        'Great Paraklesis',

      'Ακάθιστος Ύμνος':
        'Akathist Hymn',

      'Όρθρος - Αρχιερατική Θεία Λειτουργία':
        'Matins - Hierarchical Divine Liturgy',

      'Αγιασμός':
        'Blessing of the Waters',

      'Παράκληση':
        'Paraklesis Service',

      'Εγκώμια':
        'Lamentations',

      'Λιτάνευση':
        'Procession',

      'Λιτάνευση Επιταφίου':
        'Epitaphios Procession'
    };


    /*
     * =========================
     * ΜΕΤΑΦΡΑΣΕΙΣ ΝΑΩΝ
     * =========================
     */

    const locationTranslations = {

      'Ιερός Ναός Αγίου Γεωργίου':
        'Holy Church of Saint George',

      'Ιερός Ναός Αγίας Ματρώνας (Φοινικιά)':
        'Holy Church of Saint Matrona (Finikia)',

      'Ιερός Ναός Παναγίας Ακαθίστου Ύμνου Οίας':
        'Holy Church of Panagia Akathistos Hymn, Oia',

      'Ιερός Ναός Παναγίας Πλατσανής':
        'Holy Church of Panagia Platsani',

      'Παναγία Πλατσανή':
        'Panagia Platsani',

      'Άγιος Γεώργιος':
        'Saint George',

      'Αγία Ματρώνα (Φοινικιά)':
        'Saint Matrona (Finikia)'
    };


    /*
     * =========================
     * ΕΠΙΛΟΓΗ ΓΛΩΣΣΑΣ
     * =========================
     */

    let currentLanguage =
      localStorage.getItem('oiaLanguage') ||
      (
        (navigator.language || '')
          .toLowerCase()
          .startsWith('el')
          ? 'el'
          : 'en'
      );


    function t(key) {

      return (
        translations[currentLanguage][key] ??
        translations.el[key] ??
        key
      );
    }


    /*
     * =========================
     * ΜΕΤΑΦΡΑΣΗ ΑΚΟΛΟΥΘΙΑΣ
     * =========================
     */

    function translateService(value) {

      if (currentLanguage === 'el') {
        return value;
      }

      if (!value) {
        return value;
      }

      if (serviceTranslations[value]) {
        return serviceTranslations[value];
      }

      let result = value;

      const keys =
        Object.keys(serviceTranslations)
          .sort(
            (a, b) =>
              b.length - a.length
          );

      keys.forEach(greek => {

        result =
          result.replaceAll(
            greek,
            serviceTranslations[greek]
          );
      });

      return result;
    }


    /*
     * =========================
     * ΜΕΤΑΦΡΑΣΗ ΤΟΠΟΘΕΣΙΑΣ
     * =========================
     */

    function translateLocation(value) {

      if (currentLanguage === 'el') {
        return value;
      }

      if (!value) {
        return value;
      }

      if (locationTranslations[value]) {
        return locationTranslations[value];
      }

      let result = value;

      const keys =
        Object.keys(locationTranslations)
          .sort(
            (a, b) =>
              b.length - a.length
          );

      keys.forEach(greek => {

        result =
          result.replaceAll(
            greek,
            locationTranslations[greek]
          );
      });

      return result;
    }


    /*
     * =========================
     * ΑΛΛΑΓΗ ΓΛΩΣΣΑΣ
     * =========================
     */

    function setLanguage(language) {

      if (
        language !== 'el' &&
        language !== 'en'
      ) {
        return;
      }

      currentLanguage =
        language;

      localStorage.setItem(
        'oiaLanguage',
        language
      );

      document.documentElement.lang =
        language;


      const el =
        document.getElementById(
          'langEl'
        );

      const en =
        document.getElementById(
          'langEn'
        );


      if (el) {

        el.classList.toggle(
          'active',
          language === 'el'
        );
      }


      if (en) {

        en.classList.toggle(
          'active',
          language === 'en'
        );
      }


      /*
       * Σταθερά κείμενα index.html
       */

      const fixedTexts = {

        addCalendar: {

          el:
            '📅 Προσθήκη στο Ημερολόγιο',

          en:
            '📅 Add to Calendar'
        },


        addHome: {

          el:
            '📱 Προσθήκη στην Αφετηρία',

          en:
            '📱 Add to Home Screen'
        },


        onIphone: {

          el:
            'Στο iPhone:',

          en:
            'On iPhone:'
        },


        shareStep: {

          el:
            'Πάτησε <strong>Κοινοποίηση</strong> ↗ στο Safari.',

          en:
            'Tap <strong>Share</strong> ↗ in Safari.'
        },


        homeStep: {

          el:
            'Επίλεξε <strong>«Προσθήκη στην Αφετηρία»</strong>.',

          en:
            'Select <strong>"Add to Home Screen"</strong>.'
        },


        addStep: {

          el:
            'Πάτησε <strong>«Προσθήκη»</strong>.',

          en:
            'Tap <strong>"Add"</strong>.'
        },


        ok: {

          el:
            'Εντάξει',

          en:
            'Done'
        }
      };


      Object.keys(fixedTexts)
        .forEach(key => {

          document
            .querySelectorAll(
              `[data-i18n="${key}"]`
            )
            .forEach(el => {

              el.textContent =
                fixedTexts[key][language];
            });


          document
            .querySelectorAll(
              `[data-i18n-html="${key}"]`
            )
            .forEach(el => {

              el.innerHTML =
                fixedTexts[key][language];
            });

        });


      const title =
        document.getElementById(
          'pageTitle'
        );


      if (title) {

        title.textContent =
          language === 'el'
            ? 'Ιερός ενοριακός ναός Παναγίας Ακαθίστου Ύμνου Οίας Παναγία Πλατσανή'
            : 'Panagia Platsani Parish Church • Oia';
      }


      /*
       * Ξαναζωγραφίζουμε το πρόγραμμα
       * χωρίς refresh της σελίδας.
       */

      if (
        typeof renderProgram ===
        'function'
      ) {

        renderProgram();
      }
    }


    /*
     * ΚΟΥΜΠΙΑ ΓΛΩΣΣΑΣ
     */

    document
      .getElementById('langEl')
      ?.addEventListener(
        'click',
        () => setLanguage('el')
      );


    document
      .getElementById('langEn')
      ?.addEventListener(
        'click',
        () => setLanguage('en')
      );


    document.documentElement.lang =
      currentLanguage;


    /*
     * =========================
     * ΛΙΣΤΑ ΓΕΓΟΝΟΤΩΝ
     * =========================
     */

    const list =
      document.getElementById(
        'events'
      );


    if (!list) {

      throw new Error(
        'Δεν βρέθηκε το στοιχείο events.'
      );
    }


    list.innerHTML =
      '';


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

    blocks.forEach(
      block => {

        const get =
          name => {

            const m =
              block.match(
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

        let endObj =
          null;


        let endTime =
          '';


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

        const weekdays =
          translations[
            currentLanguage
          ].weekdays;


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

      }
    );


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
     * ΤΡΕΧΟΥΣΑ / ΕΠΟΜΕΝΗ
     * =========================
     */

    function getCurrentOrNextEvent() {

      const now =
        new Date();


      return events

        .filter(
          event => {

            if (
              event.endObj
            ) {

              return (
                event.endObj >
                now
              );
            }


            return (
              event.dateObj >=
              now
            );
          }
        )

        .sort(
          (a, b) =>
            a.dateObj -
            b.dateObj
        )[0] || null;
    }


    /*
     * =========================
     * EVENT KEY
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
        .forEach(
          el => {

            el.dataset.calendarHidden =
              'true';

            el.style.display =
              'none';
          }
        );


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
            ${t('backToSchedule')}
          </button>


          <div class="calendar-title">
            ${t('calendarTitle')}
          </div>


          <div class="calendar-date">
            ${escapeHtml(
              event.date
            )}
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
              .forEach(
                el => {

                  el.style.display =
                    '';

                  delete
                    el.dataset
                      .calendarHidden;
                }
              );
          }
        );


      const saintMonth =
        event.dateObj
          .getMonth() + 1;


      const saintDay =
        event.dateObj
          .getDate();


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


      if (

        event.dateObj.getTime()
          <= now &&

        event.endObj &&

        event.endObj.getTime()
          > now

      ) {

        return t(
          'inProgress'
        );
      }


      const difference =
        event.dateObj.getTime()
        - now;


      if (
        difference <= 0
      ) {

        return t(
          'inProgress'
        );
      }


      const totalMinutes =
        Math.floor(
          difference /
          60000
        );


      const days =
        Math.floor(
          totalMinutes /
          1440
        );


      const hours =
        Math.floor(
          (
            totalMinutes %
            1440
          ) / 60
        );


      const minutes =
        totalMinutes %
        60;


      if (
        days > 0
      ) {

        return currentLanguage === 'el'

          ? `Σε ${days} ${
              days === 1
                ? t('day')
                : t('days')
            } και ${hours} ${t('hour')}`

          : `In ${days} ${
              days === 1
                ? t('day')
                : t('days')
            } and ${hours} ${t('hour')}`;
      }


      if (
        hours > 0
      ) {

        return currentLanguage === 'el'

          ? `Σε ${hours} ${t('hour')} και ${minutes}${t('minute')}`

          : `In ${hours} ${t('hour')} and ${minutes} ${t('minute')}`;
      }


      return currentLanguage === 'el'

        ? `Σε ${minutes}${t('minute')}`

        : `In ${minutes} ${t('minute')}`;
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


      if (
        nextEventCard
      ) {

        if (
          !nextEvent
        ) {

          nextEventCard.innerHTML =
            '';

        } else {

          let locationHtml =
            '';


          /*
           * ΧΩΡΙΣ GOOGLE MAPS
           */

          if (
            nextEvent.location
          ) {

            locationHtml = `

              <div
                class="next-card-location"
              >

                📍 ${
                  escapeHtml(
                    translateLocation(
                      nextEvent.location
                    )
                  )
                }

              </div>

            `;
          }


          nextEventCard.innerHTML = `

            <div
              class="next-card-label"
            >

              ${t(
                'nextService'
              )}

            </div>


            <div
              class="next-card-date"
            >

              ${escapeHtml(
                nextEvent.date
              )}

            </div>


            <div
              class="next-card-time"
            >

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


            <div
              class="next-card-title"
            >

              ${escapeHtml(
                translateService(
                  nextEvent.summary
                )
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

          .filter(
            event => {

              if (
                event.endObj
              ) {

                return (
                  event.endObj >
                  now
                );
              }


              return (
                event.dateObj >=
                now
              );
            }
          )

          .sort(
            (a, b) =>
              a.dateObj -
              b.dateObj
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


          /*
           * ΗΜΕΡΟΜΗΝΙΑ / ΩΡΑ
           */

          const strong =
            document.createElement(
              'strong'
            );


          strong.textContent =
            `${event.date} · ${event.time}`;


          li.appendChild(
            strong
          );


          /*
           * ΩΡΑ ΛΗΞΗΣ
           */

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


          /*
           * ΤΙΤΛΟΣ
           */

          li.appendChild(
            document.createTextNode(
              translateService(
                event.summary
              )
            )
          );


          /*
           * ΤΟΠΟΘΕΣΙΑ
           * ΧΩΡΙΣ GOOGLE MAPS
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
              `📍 ${
                translateLocation(
                  event.location
                )
              }`;


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
     * ΑΡΧΙΚΗ ΓΛΩΣΣΑ
     * =========================
     */

    setLanguage(
      currentLanguage
    );


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
     * Δεν χρησιμοποιούμε
     * location.reload().
     *
     * Έτσι το RadioFloga
     * δεν διακόπτεται.
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
         * Αν άλλαξε η τρέχουσα /
         * επόμενη ακολουθία,
         * ξαναζωγραφίζουμε
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
         * Ενημέρωση countdown
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


  .catch(
    err => {

      const list =
        document.getElementById(
          'events'
        );


      if (list) {

        list.textContent =
          translations[
            currentLanguage
          ].errorCalendar;
      }


      console.error(
        'CALENDAR ERROR:',
        err
      );
    }
  );