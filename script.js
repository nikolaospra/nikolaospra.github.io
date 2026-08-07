fetch('calendar.ics?v=2')
  .then(r => {
    if (!r.ok) throw new Error('Αδυναμία φόρτωσης ημερολογίου');
    return r.text();
  })
  .then(ics => {
    const list = document.getElementById('events');
    list.innerHTML = '';

    const blocks = ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

    blocks.forEach(block => {
      const get = name => {
        const m = block.match(new RegExp('^' + name + '(?:;[^:]*)?:(.*)$', 'm'));
        return m ? m[1].trim() : '';
      };

      const dt = get('DTSTART');
      const m = dt.match(/(\d{8})T(\d{4})/);
      if (!m) return;

      const date = `${m[1].slice(6,8)}/${m[1].slice(4,6)}/${m[1].slice(0,4)}`;
      const time = `${m[2].slice(0,2)}:${m[2].slice(2,4)}`;
      const title = get('SUMMARY');
      const location = get('LOCATION');

      const li = document.createElement('li');

      const strong = document.createElement('strong');
      strong.textContent = `${date} · ${time}`;
      li.appendChild(strong);

      li.appendChild(document.createElement('br'));
      li.appendChild(document.createTextNode(title));

      if (location) {
        li.appendChild(document.createElement('br'));
        const small = document.createElement('small');
        small.textContent = `📍 ${location}`;
        li.appendChild(small);
      }

      list.appendChild(li);
    });

    if (!blocks.length) {
      list.textContent = 'Δεν υπάρχουν προγραμματισμένες ακολουθίες.';
    }
  })
  .catch(err => {
    const list = document.getElementById('events');
    list.textContent = 'Δεν ήταν δυνατή η φόρτωση του προγράμματος.';
    console.error(err);
  });
