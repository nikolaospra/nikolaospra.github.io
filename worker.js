export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {

      /*
       * =====================================================
       * CORS
       * =====================================================
       */

      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      };


      /*
       * =====================================================
       * OPTIONS
       * =====================================================
       */

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders
        });
      }


      /*
       * =====================================================
       * CALENDAR
       * =====================================================
       */

      if (
        request.method === "GET" &&
        url.pathname === "/calendar"
      ) {

        const calendarUrl =
          "https://nikolaospra.github.io/calendar.ics?cacheBust=" +
          Date.now();

        const response =
          await fetch(calendarUrl, {
            cache: "no-store"
          });

        if (!response.ok) {
          return new Response(
            "Δεν ήταν δυνατή η φόρτωση του ημερολογίου.",
            {
              status: 502,
              headers: {
                "content-type":
                  "text/plain; charset=UTF-8",
                "cache-control": "no-store",
                ...corsHeaders
              }
            }
          );
        }

        const calendar =
          await response.text();

        return new Response(
          calendar,
          {
            status: 200,
            headers: {
              "content-type":
                "text/calendar; charset=UTF-8",
              "cache-control":
                "no-store, no-cache, must-revalidate, max-age=0",
              "pragma": "no-cache",
              "expires": "0",
              ...corsHeaders
            }
          }
        );
      }


      /*
       * =====================================================
       * SAINT DAY / ΕΟΡΤΟΛΟΓΙΟ
       * =====================================================
       */

      if (
        request.method === "GET" &&
        url.pathname === "/saint-day"
      ) {

        const month =
          Number(
            url.searchParams.get("month")
          );

        const day =
          Number(
            url.searchParams.get("day")
          );


        if (
          !Number.isInteger(month) ||
          !Number.isInteger(day) ||
          month < 1 ||
          month > 12 ||
          day < 1 ||
          day > 31
        ) {

          return new Response(
            "Μη έγκυρη ημερομηνία.",
            {
              status: 400,
              headers: {
                "content-type":
                  "text/plain; charset=UTF-8"
              }
            }
          );
        }


        const mm =
          String(month).padStart(2, "0");

        const dd =
          String(day).padStart(2, "0");


        const saintUrl =
          "https://www.saint.gr/" +
          mm +
          "/" +
          dd +
          "/index.aspx";


        const response =
          await fetch(saintUrl);


        if (!response.ok) {

          return new Response(
            "Δεν ήταν δυνατή η φόρτωση του εορτολογίου.",
            {
              status: 502,
              headers: {
                "content-type":
                  "text/plain; charset=UTF-8"
              }
            }
          );
        }


        let html =
          await response.text();


        html =
          html.replace(
            /<head([^>]*)>/i,
            '<head$1><base href="https://www.saint.gr/">'
          );


        return new Response(
          html,
          {
            status: 200,
            headers: {
              "content-type":
                "text/html; charset=UTF-8",
              "cache-control":
                "no-store"
            }
          }
        );
      }


      /*
 * =====================================================
 * ANNOUNCEMENTS / ΑΝΑΚΟΙΝΩΣΕΙΣ
 *
 * GET  /announcements
 * POST /announcements
 *
 * Αποθήκευση στο KV + Push μέσω OneSignal
 * =====================================================
 */


/*
 * =====================================================
 * GET ANNOUNCEMENTS
 * =====================================================
 */

if (
  request.method === "GET" &&
  url.pathname === "/announcements"
) {

  if (!env.ANNOUNCEMENTS) {

    return new Response(
      JSON.stringify({
        announcements: []
      }),
      {
        status: 200,
        headers: {
          "content-type":
            "application/json; charset=UTF-8",
          "cache-control":
            "no-store",
          ...corsHeaders
        }
      }
    );
  }


  const listed =
    await env.ANNOUNCEMENTS.list({
      limit: 100
    });


  const announcements = [];


  for (
    const key of listed.keys
  ) {

    const value =
      await env.ANNOUNCEMENTS.get(
        key.name
      );


    if (value !== null) {

      try {

        const parsed =
          JSON.parse(value);

        announcements.push({
          key: key.name,
          date:
            parsed.date || "",
          text:
            parsed.text || ""
        });

      } catch {

        announcements.push({
          key: key.name,
          date: "",
          text: value
        });

      }

    }

  }


  return new Response(
    JSON.stringify({
      announcements
    }),
    {
      status: 200,
      headers: {
        "content-type":
          "application/json; charset=UTF-8",
        "cache-control":
          "no-store",
        ...corsHeaders
      }
    }
  );
}


/*
 * =====================================================
 * POST ANNOUNCEMENT
 *
 * Αποθηκεύει την ανακοίνωση στο KV
 * και στέλνει Push Notification μέσω OneSignal.
 * =====================================================
 */

if (
  request.method === "POST" &&
  url.pathname === "/announcements"
) {

  /*
   * Έλεγχος KV
   */

  if (!env.ANNOUNCEMENTS) {

    return new Response(
      JSON.stringify({
        error:
          "Δεν έχει συνδεθεί το ANNOUNCEMENTS KV namespace."
      }),
      {
        status: 500,
        headers: {
          "content-type":
            "application/json; charset=UTF-8",
          ...corsHeaders
        }
      }
    );
  }


  /*
   * Έλεγχος OneSignal Secrets
   */

  if (
    !env.ONESIGNAL_APP_ID ||
    !env.ONESIGNAL_API_KEY
  ) {

    return new Response(
      JSON.stringify({
        error:
          "Δεν έχουν ρυθμιστεί τα OneSignal Secrets."
      }),
      {
        status: 500,
        headers: {
          "content-type":
            "application/json; charset=UTF-8",
          ...corsHeaders
        }
      }
    );
  }


  /*
   * Διάβασμα JSON από το request
   */

  let body;

  try {

    body =
      await request.json();

  } catch {

    return new Response(
      JSON.stringify({
        error:
          "Μη έγκυρη JSON ανακοίνωση."
      }),
      {
        status: 400,
        headers: {
          "content-type":
            "application/json; charset=UTF-8",
          ...corsHeaders
        }
      }
    );
  }


  const text =
    String(
      body.text || ""
    ).trim();


  if (!text) {

    return new Response(
      JSON.stringify({
        error:
          "Η ανακοίνωση είναι κενή."
      }),
      {
        status: 400,
        headers: {
          "content-type":
            "application/json; charset=UTF-8",
          ...corsHeaders
        }
      }
    );
  }


  /*
   * Ημερομηνία ανακοίνωσης
   */

  const date =
    body.date
      ? String(body.date)
      : new Date().toLocaleDateString(
          "el-GR"
        );


  /*
   * Μοναδικό ID
   */

  const id =
    Date.now().toString();


  /*
   * Αποθήκευση στο KV
   */

  await env.ANNOUNCEMENTS.put(
    id,
    JSON.stringify({
      date,
      text
    })
  );


  /*
   * ===================================================
   * ONESIGNAL PUSH
   * ===================================================
   */

  const oneSignalResponse =
    await fetch(
      "https://api.onesignal.com/notifications",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            "Key " +
            env.ONESIGNAL_API_KEY
        },

        body:
          JSON.stringify({

            app_id:
              env.ONESIGNAL_APP_ID,

            target_channel:
              "push",

            included_segments:
              [
                "Subscribed Users"
              ],

            headings: {
              el:
                "📢 Ανακοίνωση ενορίας",
              en:
                "📢 Parish Announcement"
            },

            contents: {
              el:
                text,
              en:
                text
            }

          })
      }
    );


  const oneSignalText =
    await oneSignalResponse.text();


  /*
   * Αν το OneSignal αποτύχει,
   * η ανακοίνωση παραμένει αποθηκευμένη.
   */

  if (!oneSignalResponse.ok) {

    console.error(
      "ONESIGNAL ERROR:",
      oneSignalText
    );


    return new Response(
      JSON.stringify({
        success: false,

        saved: true,

        push: false,

        error:
          "Η ανακοίνωση αποθηκεύτηκε, αλλά το Push του OneSignal απέτυχε.",

        oneSignal:
          oneSignalText
      }),
      {
        status: 502,
        headers: {
          "content-type":
            "application/json; charset=UTF-8",
          ...corsHeaders
        }
      }
    );
  }


  /*
   * Επιτυχία
   */

  return new Response(
  JSON.stringify({
    success: true,

    saved: true,

    push: true,

    oneSignalStatus:
      oneSignalResponse.status,

    oneSignal:
      oneSignalText,

    announcement: {
      id,
      date,
      text
    }
  }),
    {
      status: 200,
      headers: {
        "content-type":
          "application/json; charset=UTF-8",
        "cache-control":
          "no-store",
        ...corsHeaders
      }
    }
  );
}
      /*
       * =====================================================
       * ANALYZE
       * =====================================================
       */

      if (
        request.method === "POST" &&
        url.pathname === "/analyze"
      ) {

        if (!env.AI) {

          return new Response(
            JSON.stringify({
              error:
                "Δεν έχει συνδεθεί το Workers AI binding."
            }),
            {
              status: 500,
              headers: {
                "content-type":
                  "application/json; charset=UTF-8",
                ...corsHeaders
              }
            }
          );
        }


        const form =
          await request.formData();


        const file =
          form.get("file");


        if (
          !file ||
          typeof file.arrayBuffer !== "function"
        ) {

          return new Response(
            JSON.stringify({
              error:
                "Δεν βρέθηκε αρχείο."
            }),
            {
              status: 400,
              headers: {
                "content-type":
                  "application/json; charset=UTF-8",
                ...corsHeaders
              }
            }
          );
        }


        const contentType =
          file.type || "image/jpeg";


        /*
         * Το LLaVA εδώ χρησιμοποιείται
         * για εικόνες.
         */

        if (
          !contentType.startsWith("image/")
        ) {

          return new Response(
            JSON.stringify({
              error:
                "Προς το παρόν υποστηρίζονται μόνο φωτογραφίες JPG/PNG."
            }),
            {
              status: 400,
              headers: {
                "content-type":
                  "application/json; charset=UTF-8",
                ...corsHeaders
              }
            }
          );
        }


        const bytes =
          new Uint8Array(
            await file.arrayBuffer()
          );


        const aiResult =
          await env.AI.run(
            "@cf/llava-hf/llava-1.5-7b-hf",
            {
              image: [
                ...bytes
              ],

              prompt:
                `Διάβασε προσεκτικά αυτή τη φωτογραφία με το πρόγραμμα των ιερών Ακολουθιών της ενορίας.

Εξήγαγε ΟΛΕΣ τις ακολουθίες που εμφανίζονται.

Για κάθε ακολουθία δώσε:
- ημερομηνία
- ώρα έναρξης
- τίτλο ακολουθίας
- ναό/τοποθεσία, αν αναφέρεται

Απάντησε ΜΟΝΟ με έγκυρο JSON.
Μην γράψεις markdown.
Μην γράψεις code fences.
Μην γράψεις κανένα άλλο κείμενο.

Η ακριβής μορφή πρέπει να είναι:

{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "title": "Τίτλος ακολουθίας",
      "location": "Ναός"
    }
  ]
}

Μην παραλείψεις καμία ακολουθία.`,

              max_tokens: 1024
            }
          );


        let text = "";


        if (
          aiResult &&
          typeof aiResult.response === "string"
        ) {

          text =
            aiResult.response;

        } else if (
          typeof aiResult === "string"
        ) {

          text =
            aiResult;

        } else {

          text =
            JSON.stringify(
              aiResult
            );
        }


        text =
          text
            .replace(
              /```json/gi,
              ""
            )
            .replace(
              /```/g,
              ""
            )
            .trim();


        const start =
          text.indexOf("{");


        const end =
          text.lastIndexOf("}");


        if (
          start !== -1 &&
          end !== -1 &&
          end > start
        ) {

          text =
            text.slice(
              start,
              end + 1
            );
        }


        let parsed;


        try {

          parsed =
            JSON.parse(text);

        } catch {

          parsed = {
            events: [],
            response: text
          };

        }


        return new Response(
          JSON.stringify(parsed),
          {
            status: 200,
            headers: {
              "content-type":
                "application/json; charset=UTF-8",
              "cache-control":
                "no-store",
              ...corsHeaders
            }
          }
        );
      }


      /*
       * =====================================================
       * LOGIN PAGE
       * =====================================================
       */

      if (
        request.method === "GET" &&
        url.pathname === "/"
      ) {

        return htmlResponse(
          loginPage(),
          200
        );
      }


       /*
       * =====================================================
       * LOGIN
       * =====================================================
       */

      if (
        request.method === "POST" &&
        url.pathname === "/login"
      ) {

        const form =
          await request.formData();

        const password =
          String(
            form.get("password") || ""
          );

        if (
          !env.ADMIN_PASSWORD ||
          password !== env.ADMIN_PASSWORD
        ) {

          return htmlResponse(
            loginPage(
              "Λάθος κωδικός."
            ),
            401
          );
        }

        return htmlResponse(
          adminPage(),
          200
        );
      }


      /*
       * =====================================================
       * NOT FOUND
       * =====================================================
       */

      return new Response(
        "Not Found",
        {
          status: 404,
          headers: {
            "content-type":
              "text/plain; charset=UTF-8"
          }
        }
      );

      /*
       * =====================================================
       * ΚΡΙΣΙΜΟ:
       * Δεν αφήνουμε πλέον το Worker να πετάξει
       * Error 1101 χωρίς μήνυμα.
       * =====================================================
       */

      const message =
        error instanceof Error
          ? error.message
          : String(error);


      console.error(
        "WORKER EXCEPTION:",
        error
      );


      return new Response(
        `Worker error:

${message}`,
        {
          status: 500,
          headers: {
            "content-type":
              "text/plain; charset=UTF-8",
            "cache-control":
              "no-store"
          }
        }
      );
    }
  }
};


/*
 * =========================================================
 * HTML RESPONSE
 * =========================================================
 */

function htmlResponse(
  body,
  status = 200
) {

  return new Response(
    body,
    {
      status,
      headers: {
        "content-type":
          "text/html; charset=UTF-8",
        "cache-control":
          "no-store"
      }
    }
  );
}


/*
 * =========================================================
 * ESCAPE HTML
 * =========================================================
 */

function escapeHtml(value) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );
}


/*
 * =========================================================
 * LOGIN PAGE
 * =========================================================
 */

function loginPage(
  error = ""
) {

  return `<!doctype html>

<html lang="el">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1,viewport-fit=cover"
>

<meta
  name="theme-color"
  content="#641f24"
>

<title>
  Διαχείριση • Ι.Ν. Παναγίας Ακαθίστου Ύμνου Οίας
</title>

<style>

*{
  box-sizing:border-box;
}

body{
  margin:0;

  min-height:100vh;

  background:
    linear-gradient(
      180deg,
      #fffaf3 0%,
      #f5eee5 100%
    );

  color:#2f2925;

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Display",
    "SF Pro Text",
    system-ui,
    sans-serif;

  -webkit-font-smoothing:antialiased;
}

.wrap{
  width:
    calc(100% - 28px);

  max-width:
    560px;

  margin:
    0 auto;

  padding:
    40px 0;
}

.card{
  background:#fff;

  border:
    1px solid #e5d9c8;

  border-radius:
    28px;

  padding:
    30px 22px;

  box-shadow:
    0 14px 35px
    rgba(55,38,25,.12);

  text-align:center;
}

.icon{
  width:76px;

  height:76px;

  margin:
    0 auto 18px;

  display:grid;

  place-items:center;

  border-radius:
    23px;

  background:
    #f3e8df;

  font-size:36px;
}

h1{
  margin:
    0 0 8px;

  color:#641f24;

  font-size:28px;

  font-weight:800;
}

.sub{
  margin:
    0 0 28px;

  color:#756d65;

  line-height:1.5;
}

label{
  display:block;

  margin:
    0 0 8px;

  text-align:left;

  color:#2f2925;

  font-weight:700;
}

input[type=password]{
  width:100%;

  padding:
    16px;

  border:
    1px solid #dfd3c5;

  border-radius:
    15px;

  background:#fff;

  color:#2f2925;

  font-size:17px;

  outline:none;
}

input[type=password]:focus{
  border-color:#b99752;

  box-shadow:
    0 0 0 3px
    rgba(185,151,82,.16);
}

button{
  width:100%;

  margin-top:15px;

  padding:16px;

  border:0;

  border-radius:15px;

  background:#641f24;

  color:#fff;

  font-size:17px;

  font-weight:800;

  cursor:pointer;
}

.error{
  margin-bottom:18px;

  padding:13px;

  border-radius:14px;

  background:#ffe7e7;

  color:#a00000;

  font-weight:700;
}

</style>

</head>

<body>

<div class="wrap">

<div class="card">

<div class="icon">
  ⚙️
</div>

<h1>
  Διαχείριση
</h1>

<div class="sub">
  Ι.Ν. Παναγίας Ακαθίστου Ύμνου Οίας
</div>

${
  error
    ? `<div class="error">${escapeHtml(error)}</div>`
    : ""
}

<form
  method="post"
  action="/login"
>

<label for="password">
  Κωδικός διαχείρισης
</label>

<input
  id="password"
  name="password"
  type="password"
  autocomplete="current-password"
  required
>

<button type="submit">
  Είσοδος
</button>

</form>

</div>

</div>

</body>

</html>`;
}


/*
 * =========================================================
 * ADMIN PAGE
 * =========================================================
 */

function adminPage() {

  return `<!doctype html>

<html lang="el">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1,viewport-fit=cover"
>

<meta
  name="theme-color"
  content="#641f24"
>

<title>
  Διαχείριση Προγράμματος
</title>

<style>

*{
  box-sizing:border-box;
}

body{
  margin:0;

  min-height:100vh;

  background:
    linear-gradient(
      180deg,
      #fffaf3 0%,
      #f5eee5 100%
    );

  color:#2f2925;

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Display",
    "SF Pro Text",
    system-ui,
    sans-serif;

  -webkit-font-smoothing:antialiased;
}

.wrap{
  width:
    calc(100% - 28px);

  max-width:
    650px;

  margin:
    0 auto;

  padding:
    28px 0 45px;
}

.card{
  background:#fff;

  border:
    1px solid #e5d9c8;

  border-radius:
    28px;

  padding:
    25px 20px;

  box-shadow:
    0 14px 35px
    rgba(55,38,25,.12);
}

h1{
  margin:
    0 0 8px;

  color:#641f24;

  font-size:28px;

  font-weight:800;
}

.lead{
  margin:
    0 0 25px;

  color:#756d65;

  line-height:1.55;
}

.upload{
  padding:
    26px 16px;

  text-align:center;

  border:
    2px dashed #b99752;

  border-radius:
    20px;

  background:
    #fffaf3;
}

.upload .emoji{
  margin-bottom:8px;

  font-size:42px;
}

.upload strong{
  display:block;

  color:#641f24;

  font-size:19px;
}

.upload span{
  display:block;

  margin:
    7px 0 18px;

  color:#756d65;
}

input[type=file]{
  width:100%;

  font-size:16px;
}

.status{
  display:none;

  margin-top:18px;

  padding:14px;

  border-radius:14px;

  background:#f5eee5;

  color:#4b2020;

  line-height:1.5;
}

.preview{
  display:none;

  margin-top:20px;
}

.preview img{
  display:block;

  max-width:100%;

  max-height:420px;

  margin:0 auto;

  border-radius:16px;
}

.actions{
  display:none;

  gap:10px;

  margin-top:16px;
}

.actions button{
  flex:1;
}

button{
  padding:15px;

  border:0;

  border-radius:14px;

  background:#641f24;

  color:#fff;

  font-size:16px;

  font-weight:800;

  cursor:pointer;
}

button.secondary{
  background:#eee6df;

  color:#641f24;
}

.note{
  margin-top:20px;

  padding:16px;

  border-radius:15px;

  background:#f5eee5;

  color:#756d65;

  line-height:1.55;
}
.announcement-card{
  margin-top:20px;
  padding:18px;
  border-radius:16px;
  background:#fff;
  border:1px solid #e5d9c8;
}

.announcement-card h2{
  margin:0 0 10px;
  color:#641f24;
  font-size:20px;
}

.announcement-card p{
  margin:0 0 14px;
  color:#756d65;
  line-height:1.55;
}

.announcement-card textarea{
  width:100%;
  min-height:130px;
  padding:14px;
  border:1px solid #dfd3c5;
  border-radius:14px;
  background:#fffaf3;
  color:#2f2925;
  font-size:16px;
  line-height:1.5;
  resize:vertical;
  outline:none;
}

.announcement-card textarea:focus{
  border-color:#b99752;
  box-shadow:0 0 0 3px rgba(185,151,82,.16);
}
.result{
  margin-top:20px;

  padding:18px;

  border-radius:16px;

  background:#f5eee5;

  color:#4b2020;
}

.result h2{
  margin:
    0 0 12px;

  color:#641f24;

  font-size:20px;
}

.result-item{
  padding:
    12px 0;

  border-bottom:
    1px solid #dfd3c5;

  line-height:1.55;
}

.result-item:last-child{
  border-bottom:0;
}

</style>

</head>

<body>

<div class="wrap">

<div class="card">

<h1>
  ⚙️ Διαχείριση Προγράμματος
</h1>

<p class="lead">
  Ανέβασε το πρόγραμμα της ενορίας
  σε φωτογραφία. Θα το αναλύσουμε
  και θα εμφανίσουμε προεπισκόπηση
  πριν ενημερωθεί το ημερολόγιο.
</p>


<div class="upload">

<div class="emoji">
  📷
</div>

<strong>
  Φωτογραφία προγράμματος
</strong>

<span>
  JPG ή PNG
</span>

<input
  id="file"
  type="file"
  accept="image/jpeg,image/png,image/webp"
>

</div>


<div
  id="status"
  class="status"
>
</div>


<div
  id="preview"
  class="preview"
>

<img
  id="previewImg"
  alt="Προεπισκόπηση"
>


<div
  class="actions"
  id="actions"
>

<button
  class="secondary"
  id="clear"
  type="button"
>
  Αφαίρεση
</button>

<button
  id="next"
  type="button"
>
  Ανάλυση προγράμματος
</button>

</div>

</div>

</div>


<div class="announcement-card">

<h2>
  📢 Νέα ανακοίνωση
</h2>

...
  
</div>


<div class="note">

<strong>
  Προσοχή:
</strong>
<div class="note">

<strong>
  Προσοχή:
</strong>

Το ημερολόγιο δεν αλλάζει ακόμη
με την επιλογή του αρχείου.
Πρώτα γίνεται ανάλυση και
προεπισκόπηση των ακολουθιών.

</div>
<div class="announcement-card">

  <h2>📢 Ανακοινώσεις</h2>

  <p>
    Γράψε εδώ την ανακοίνωση που θέλεις
    να εμφανίζεται στην αρχική σελίδα.
  </p>

  <textarea
    id="announcementText"
    placeholder="Γράψε την ανακοίνωση..."
    rows="5"
  ></textarea>

  <button
    id="publishAnnouncement"
    type="button"
  >
    📢 Δημοσίευση ανακοίνωσης
  </button>

  <div
    id="announcementStatus"
    class="status"
  ></div>

</div>
</div>

</div>


<script>

const f =
  document.getElementById("file");

const s =
  document.getElementById("status");

const p =
  document.getElementById("preview");

const i =
  document.getElementById("previewImg");

const a =
  document.getElementById("actions");


f.addEventListener(
  "change",
  function () {

    const x =
      f.files &&
      f.files[0];

    if (!x) {
      return;
    }


    s.style.display =
      "block";

    s.textContent =
      "Επιλέχθηκε: " +
      x.name;


    p.style.display =
      "block";

    a.style.display =
      "flex";


    if (
      x.type &&
      x.type.startsWith("image/")
    ) {

      i.src =
        URL.createObjectURL(x);

      i.style.display =
        "block";

    } else {

      i.style.display =
        "none";
    }

  }
);


document
  .getElementById("clear")
  .onclick =
  function () {

    f.value =
      "";

    s.style.display =
      "none";

    p.style.display =
      "none";

    a.style.display =
      "none";

    i.removeAttribute(
      "src"
    );
  };


document
  .getElementById("next")
  .onclick =
  async function () {

    const file =
      f.files &&
      f.files[0];


    if (!file) {

      s.style.display =
        "block";

      s.textContent =
        "Παρακαλώ επίλεξε πρώτα φωτογραφία.";

      return;
    }


    if (
      !file.type ||
      !file.type.startsWith("image/")
    ) {

      s.style.display =
        "block";

      s.textContent =
        "Υποστηρίζονται μόνο φωτογραφίες JPG/PNG.";

      return;
    }


    s.style.display =
      "block";

    s.textContent =
      "⏳ Αναλύω το πρόγραμμα...";


    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );


    try {

      const response =
        await fetch(
          "/analyze",
          {
            method:
              "POST",
            body:
              formData
          }
        );


      const text =
        await response.text();


      let data;


      try {

        data =
          JSON.parse(text);

      } catch {

        throw new Error(
          text ||
          "Ο Worker επέστρεψε μη έγκυρη απάντηση."
        );
      }


      if (!response.ok) {

        throw new Error(
          data.error ||
          "Αποτυχία ανάλυσης."
        );
      }


      let result =
        data;


      if (
        data &&
        typeof data.response === "string"
      ) {

        let inner =
          data.response
            .replace(
              /```json/gi,
              ""
            )
            .replace(
              /```/g,
              ""
            )
            .trim();


        try {

          result =
            JSON.parse(inner);

        } catch {

          result = {
            response:
              inner
          };

        }

      }


      s.textContent =
        "✅ Η ανάλυση ολοκληρώθηκε.";


      const old =
        document.getElementById(
          "analysisResult"
        );


      if (old) {
        old.remove();
      }


      const box =
        document.createElement(
          "div"
        );


      box.id =
        "analysisResult";

      box.className =
        "result";


      if (
        result.events &&
        Array.isArray(
          result.events
        )
      ) {

        const title =
          document.createElement(
            "h2"
          );


        title.textContent =
          "📅 Ακολουθίες που βρέθηκαν";


        box.appendChild(
          title
        );


        result.events.forEach(
          function (event) {

            const item =
              document.createElement(
                "div"
              );


            item.className =
              "result-item";


            const date =
              event.date ||
              "";

            const time =
              event.time ||
              "";

            const service =
              event.title ||
              "";

            const location =
              event.location ||
              "";


            item.innerHTML =
              "<strong>" +
              escapeHtmlClient(
                date +
                " " +
                time
              ) +
              "</strong><br>" +
              escapeHtmlClient(
                service
              ) +
              (
                location
                  ? "<br>📍 " +
                    escapeHtmlClient(
                      location
                    )
                  : ""
              );


            box.appendChild(
              item
            );

          }
        );

      } else {

        box.textContent =
          typeof result === "string"
            ? result
            : JSON.stringify(
                result,
                null,
                2
              );
      }


      document
        .querySelector(".card")
        .appendChild(
          box
        );


    } catch (error) {

      console.error(
        error
      );


      s.style.display =
        "block";


      s.textContent =
        "❌ " +
        (
          error.message ||
          error
        );
    }

  };

  };
  
  
  document
    .getElementById("publishAnnouncement")
    .onclick =
    async function () {

      ...
      
    };
document
  .getElementById("publishAnnouncement")
  .onclick =
  async function () {

    const textarea =
      document.getElementById(
        "announcementText"
      );

    const status =
      document.getElementById(
        "announcementStatus"
      );

    const text =
      textarea.value.trim();


    if (!text) {

      status.style.display =
        "block";

      status.textContent =
        "⚠️ Γράψε πρώτα την ανακοίνωση.";

      return;
    }


    status.style.display =
      "block";

    status.textContent =
      "⏳ Δημοσιεύω την ανακοίνωση...";


    try {

      const response =
        await fetch(
          "/announcements",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                text: text
              })
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          "Αποτυχία δημοσίευσης."
        );
      }


      status.textContent =
        "✅ Η ανακοίνωση δημοσιεύτηκε επιτυχώς.";


      textarea.value =
        "";


    } catch (error) {

      console.error(
        "PUBLISH ANNOUNCEMENT ERROR:",
        error
      );


      status.textContent =
        "❌ " +
        (
          error.message ||
          "Αποτυχία δημοσίευσης."
        );
    }

  };

function escapeHtmlClient(

  value
) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );
}

</script>

</body>

</html>`;
}