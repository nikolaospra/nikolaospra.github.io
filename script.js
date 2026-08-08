alert("ΝΕΟ SCRIPT");
fetch('calendar.ics?v=' + Date.now(), { cache: 'no-store' })
  .then(r => {
    if (!r.ok) throw new Error('Αδυναμία φόρτωσης ημερολογίου');
    return r.text();
  })
  .then(ics => {
    const list = document.getElementById('events');
    list.innerHTML = '';

    const blocks = ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

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

    /*
     * Βρίσκουμε το επόμενο γεγονός.
     * Είναι το πρώτο γεγονός που δεν έχει περάσει.
     */
    const now = new Date();

    const upcoming = events
      .filter(event => event.dateObj >= now)
      .sort((a, b) => a.dateObj - b.dateObj);

    const nextEvent = upcoming.length > 0
      ? upcoming[0]
      : null;

    /*
     * Δημιουργία των γεγονότων στην οθόνη.
     */
    events
      .sort((a, b) => a.dateObj - b.dateObj)
      .forEach(event => {

        const li = document.createElement('li');

        /*
         * Αν αυτό είναι το επόμενο χρονικά γεγονός,
         * του δίνουμε την αντίστροφη εμφάνιση.
         */
        if (nextEvent && event === nextEvent) {
          li.classList.add('next-event');
        }

        const strong = document.createElement('strong');

        strong.textContent =
          `${event.date} · ${event.time}`;

        li.appendChild(strong);

        li.appendChild(document.createElement('br'));

        li.appendChild(
          document.createTextNode(event.summary)
        );

        if (event.location) {
          li.appendChild(document.createElement('br'));

          const small = document.createElement('small');

          small.textContent =
            `📍 ${event.location}`;

          li.appendChild(small);
        }

        list.appendChild(li);
      });

    /*
     * Ελέγχουμε κάθε λεπτό αν πέρασε το τρέχον γεγονός.
     * Έτσι το επόμενο παίρνει αυτόματα την επισήμανση.
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