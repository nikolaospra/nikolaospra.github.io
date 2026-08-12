export default {
  async fetch(request, env) {

    const url = new URL(request.url);


    /*
     * =========================
     * ΑΝΑΚΟΙΝΩΣΕΙΣ - ΔΗΜΟΣΙΑ
     * =========================
     *
     * Η ιστοσελίδα ζητά:
     * /announcements
     *
     * και παίρνει τις ανακοινώσεις
     * από το KV OIA_ANNOUNCEMENTS.
     */

    if (
      request.method === "GET" &&
      url.pathname === "/announcements"
    ) {

      try {

        const stored =
          await env.OIA_ANNOUNCEMENTS.get("latest");

        let announcements = [];

        if (stored) {

          try {

            announcements =
              JSON.parse(stored);

            if (!Array.isArray(announcements)) {
              announcements = [];
            }

          } catch {

            announcements = [];

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
                "no-store, no-cache, must-revalidate, max-age=0",

              "pragma":
                "no-cache",

              "expires":
                "0",

              "Access-Control-Allow-Origin":
                "*"
            }
          }
        );

      } catch (error) {

        return new Response(
          JSON.stringify({
            announcements: [],
            error:
              error instanceof Error
                ? error.message
                : String(error)
          }),
          {
            status: 500,

            headers: {
              "content-type":
                "application/json; charset=UTF-8"
            }
          }
        );

      }

    }


    /*
     * =========================
     * ΗΜΕΡΟΛΟΓΙΟ
     * =========================
     */

    if (
      request.method === "GET" &&
      url.pathname === "/calendar"
    ) {

      try {

        const calendarUrl =
          `https://nikolaospra.github.io/calendar.ics?cacheBust=${Date.now()}`;

        const response =
          await fetch(calendarUrl);

        if (!response.ok) {

          return new Response(
            "Δεν ήταν δυνατή η φόρτωση του ημερολογίου.",
            {
              status: 502
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

              "pragma":
                "no-cache",

              "expires":
                "0"

            }

          }
        );

      } catch (error) {

        return new Response(
          "Σφάλμα ημερολογίου: " +
          (
            error instanceof Error
              ? error.message
              : String(error)
          ),
          {
            status: 500,

            headers: {
              "content-type":
                "text/plain; charset=UTF-8"
            }
          }
        );

      }

    }


    /*
     * =========================
     * ΕΟΡΤΟΛΟΓΙΟ
     * =========================
     */

    if (
      request.method === "GET" &&
      url.pathname === "/saint-day"
    ) {

      try {

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
              status: 400
            }
          );

        }


        const mm =
          String(month).padStart(2, "0");

        const dd =
          String(day).padStart(2, "0");


        const saintUrl =
          `https://www.saint.gr/${mm}/${dd}/index.aspx`;


        const response =
          await fetch(saintUrl);


        if (!response.ok) {

          return new Response(
            "Δεν ήταν δυνατή η φόρτωση του εορτολογίου.",
            {
              status: 502
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

      } catch (error) {

        return new Response(
          "Σφάλμα εορτολογίου: " +
          (
            error instanceof Error
              ? error.message
              : String(error)
          ),
          {
            status: 500,

            headers: {
              "content-type":
                "text/plain; charset=UTF-8"
            }
          }
        );

      }

    }


    /*
     * =========================
     * ΑΝΑΛΥΣΗ ΠΡΟΓΡΑΜΜΑΤΟΣ
     * =========================
     */

    if (
      request.method === "POST" &&
      url.pathname === "/analyze"
    ) {

      try {

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
                  "application/json; charset=UTF-8"
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
              image: [...bytes],

              prompt: `Διάβασε προσεκτικά αυτή τη φωτογραφία με το πρόγραμμα
των ιερών Ακολουθιών της ενορίας.

Εξήγαγε ΟΛΕΣ τις ακολουθίες που εμφανίζονται.

Για κάθε ακολουθία δώσε:
- ημερομηνία
- ώρα έναρξης
- τίτλο ακολουθίας
- ναό/τοποθεσία, αν αναφέρεται

Απάντησε ΜΟΝΟ με έγκυρο JSON.
Μην γράψεις markdown.
Μην γράψεις \`\`\`json.
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

Μην παραλείψεις καμία ακολουθία.`
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
            JSON.stringify(aiResult);

        }


        text =
          text
            .replace(/```json/gi, "")
            .replace(/```/g, "")
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
            headers: {

              "content-type":
                "application/json; charset=UTF-8",

              "cache-control":
                "no-store"

            }
          }
        );


      } catch (error) {

        return new Response(
          JSON.stringify({
            error:
              error instanceof Error
                ? error.message
                : String(error)
          }),
          {
            status: 500,

            headers: {
              "content-type":
                "application/json; charset=UTF-8"
            }
          }
        );

      }

    }


    /*
     * =========================
     * LOGIN
     * =========================
     */

    if (request.method === "POST" && url.pathname === "/login") {
  try {
    const form = await request.formData();
    const password = String(form.get("password") || "");

    if (!env.ADMIN_PASSWORD) {
      return htmlResponse(
        loginPage("Δεν έχει οριστεί ADMIN_PASSWORD στο Worker."),
        500
      );
    }

    if (password !== env.ADMIN_PASSWORD) {
      return htmlResponse(
        loginPage("Λάθος κωδικός."),
        401
      );
    }

    return htmlResponse(adminPage());

  } catch (error) {

    return new Response(
      `
      <!doctype html>
      <html lang="el">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Σφάλμα Worker</title>
        <style>
          body{
            margin:0;
            padding:30px 18px;
            background:#f5f1ec;
            color:#4b2020;
            font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
          }

          .box{
            max-width:650px;
            margin:auto;
            background:#fff;
            border-radius:24px;
            padding:25px;
            box-shadow:0 12px 35px rgba(60,20,20,.12);
          }

          h1{
            margin-top:0;
          }

          pre{
            white-space:pre-wrap;
            word-break:break-word;
            background:#f5f1ec;
            padding:15px;
            border-radius:14px;
          }
        </style>
      </head>

      <body>

        <div class="box">

          <h1>⚠️ Σφάλμα Worker</h1>

          <p>
            Το σφάλμα παρουσιάστηκε κατά το άνοιγμα
            της σελίδας διαχείρισης.
          </p>

          <pre>${escapeHtml(
            error instanceof Error
              ? error.stack || error.message
              : String(error)
          )}</pre>

        </div>

      </body>
      </html>
      `,
      {
        status: 500,
        headers: {
          "content-type":
            "text/html; charset=UTF-8",
          "cache-control":
            "no-store"
        }
      }
    );
  }
}


      /*
       * Δημιουργούμε προσωρινό
       * session token.
       */

      const token =
        crypto.randomUUID();


      await env.OIA_ANNOUNCEMENTS.put(
        `session:${token}`,
        "1",
        {
          expirationTtl: 86400
        }
      );


      return new Response(
        adminPage(),
        {
          status: 200,

          headers: {

            "content-type":
              "text/html; charset=UTF-8",

            "cache-control":
              "no-store",

            "Set-Cookie":
              `oia_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`

          }
        }
      );

    }


    /*
     * =========================
     * ΑΠΟΘΗΚΕΥΣΗ ΑΝΑΚΟΙΝΩΣΗΣ
     * =========================
     */

    if (
      request.method === "POST" &&
      url.pathname === "/announcements"
    ) {

      const authorized =
        await checkAdminSession(
          request,
          env
        );


      if (!authorized) {

        return new Response(
          JSON.stringify({
            error:
              "Δεν υπάρχει ενεργή σύνδεση διαχείρισης."
          }),
          {
            status: 401,

            headers: {
              "content-type":
                "application/json; charset=UTF-8"
            }
          }
        );

      }


      try {

        const body =
          await request.json();


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
                  "application/json; charset=UTF-8"
              }
            }
          );

        }


        let announcements =
          await getAnnouncements(
            env
          );


        const announcement = {

          id:
            crypto.randomUUID(),

          date:
            new Date().toLocaleDateString(
              "el-GR"
            ),

          text

        };


        announcements.unshift(
          announcement
        );


        /*
         * Κρατάμε τις τελευταίες
         * 20 ανακοινώσεις.
         */

        announcements =
          announcements.slice(
            0,
            20
          );


        await saveAnnouncements(
          env,
          announcements
        );


        return jsonResponse({
          success: true,
          announcements
        });


      } catch (error) {

        return jsonResponse(
          {
            error:
              error instanceof Error
                ? error.message
                : String(error)
          },
          500
        );

      }

    }


    /*
     * =========================
     * ΔΙΑΓΡΑΦΗ ΑΝΑΚΟΙΝΩΣΗΣ
     * =========================
     */

    if (
      request.method === "DELETE" &&
      url.pathname === "/announcements"
    ) {

      const authorized =
        await checkAdminSession(
          request,
          env
        );


      if (!authorized) {

        return jsonResponse(
          {
            error:
              "Δεν υπάρχει ενεργή σύνδεση διαχείρισης."
          },
          401
        );

      }


      try {

        const body =
          await request.json();


        const id =
          String(
            body.id || ""
          );


        let announcements =
          await getAnnouncements(
            env
          );


        announcements =
          announcements.filter(
            item =>
              String(item.id) !== id
          );


        await saveAnnouncements(
          env,
          announcements
        );


        return jsonResponse({
          success: true,
          announcements
        });


      } catch (error) {

        return jsonResponse(
          {
            error:
              error instanceof Error
                ? error.message
                : String(error)
          },
          500
        );

      }

    }


    /*
     * =========================
     * ΓΕΝΙΚΗ GET
     * =========================
     */

    if (
      request.method === "GET"
    ) {

      return htmlResponse(
        loginPage()
      );

    }


    return new Response(
      "Not Found",
      {
        status: 404
      }
    );

  }
};


/*
 * =========================
 * ΑΝΑΚΟΙΝΩΣΕΙΣ
 * ΒΟΗΘΗΤΙΚΕΣ ΣΥΝΑΡΤΗΣΕΙΣ
 * =========================
 */

async function getAnnouncements(env) {

  const stored =
    await env.OIA_ANNOUNCEMENTS.get(
      "latest"
    );


  if (!stored) {
    return [];
  }


  try {

    const parsed =
      JSON.parse(stored);


    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch {

    return [];

  }

}


async function saveAnnouncements(
  env,
  announcements
) {

  await env.OIA_ANNOUNCEMENTS.put(
    "latest",
    JSON.stringify(
      announcements
    )
  );

}


async function checkAdminSession(
  request,
  env
) {

  const cookie =
    request.headers.get(
      "Cookie"
    ) || "";


  const match =
    cookie.match(
      /(?:^|;\s*)oia_admin=([^;]+)/
    );


  if (!match) {
    return false;
  }


  const token =
    match[1];


  if (!token) {
    return false;
  }


  const session =
    await env.OIA_ANNOUNCEMENTS.get(
      `session:${token}`
    );


  return session === "1";

}


/*
 * =========================
 * JSON RESPONSE
 * =========================
 */

function jsonResponse(
  body,
  status = 200
) {

  return new Response(
    JSON.stringify(body),
    {
      status,

      headers: {
        "content-type":
          "application/json; charset=UTF-8",

        "cache-control":
          "no-store"
      }
    }
  );

}


/*
 * =========================
 * HTML RESPONSE
 * =========================
 */

function htmlResponse(
  body,
  status = 200,
  extraHeaders = {}
) {

  return new Response(
    body,
    {
      status,

      headers: {
        "content-type":
          "text/html; charset=UTF-8",

        "cache-control":
          "no-store",

        ...extraHeaders
      }
    }
  );

}


/*
 * =========================
 * LOGIN PAGE
 * =========================
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
  content="#6f2929"
>

<title>
  Διαχείριση • Ι.Ν. Παναγίας Ακαθίστου Ύμνου Οίας
</title>

<style>

*{
  box-sizing:border-box
}

body{
  margin:0;
  background:#f5f1ec;
  color:#4b2020;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif
}

.wrap{
  max-width:560px;
  margin:auto;
  padding:42px 18px
}

.card{
  background:#fff;
  border-radius:26px;
  padding:30px 24px;
  box-shadow:
    0 12px 35px rgba(60,20,20,.10)
}

.icon{
  width:74px;
  height:74px;
  margin:0 auto 18px;
  border-radius:22px;
  background:#f1e4df;
  display:grid;
  place-items:center;
  font-size:36px
}

h1{
  text-align:center;
  font-size:27px;
  margin:0 0 8px
}

.sub{
  text-align:center;
  color:#777;
  line-height:1.45;
  margin-bottom:28px
}

label{
  display:block;
  font-weight:600;
  margin:0 0 8px
}

input[type=password]{
  width:100%;
  padding:16px;
  border:1px solid #ddd;
  border-radius:13px;
  font-size:17px;
  outline:none
}

button{
  width:100%;
  margin-top:15px;
  padding:16px;
  border:0;
  border-radius:13px;
  background:#702727;
  color:#fff;
  font-size:17px;
  font-weight:700
}

.error{
  background:#ffe7e7;
  color:#a00000;
  padding:12px;
  border-radius:12px;
  margin-bottom:16px;
  text-align:center
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
 * =========================
 * ADMIN PAGE
 * =========================
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
  content="#6f2929"
>

<title>
  Διαχείριση Προγράμματος
</title>

<style>

*{
  box-sizing:border-box
}

body{
  margin:0;
  background:#f5f1ec;
  color:#4b2020;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif
}

.wrap{
  max-width:650px;
  margin:auto;
  padding:25px 16px 45px
}

.card{
  background:#fff;
  border-radius:26px;
  padding:25px 20px;
  box-shadow:
    0 12px 35px rgba(60,20,20,.10);
  margin-bottom:18px
}

h1{
  font-size:28px;
  margin:0 0 7px
}

h2{
  font-size:22px;
  margin:0 0 16px
}

.lead{
  color:#777;
  margin:0 0 25px;
  line-height:1.5
}

.upload{
  border:2px dashed #b88b8b;
  border-radius:19px;
  padding:28px 16px;
  text-align:center;
  background:#fffaf8
}

.upload .emoji{
  font-size:42px;
  margin-bottom:8px
}

.upload strong{
  display:block;
  font-size:19px
}

.upload span{
  display:block;
  color:#777;
  margin:7px 0 18px
}

input[type=file]{
  width:100%;
  font-size:16px
}

.status{
  display:none;
  margin-top:18px;
  padding:14px;
  border-radius:13px;
  background:#f4eee9;
  color:#555
}

.preview{
  display:none;
  margin-top:20px
}

.preview img{
  max-width:100%;
  max-height:420px;
  border-radius:14px;
  display:block;
  margin:auto
}

.actions{
  display:flex;
  gap:10px;
  margin-top:16px
}

.actions button{
  flex:1
}

.actions .secondary{
  background:#eee5e0;
  color:#4b2020
}

button{
  padding:15px;
  border:0;
  border-radius:13px;
  background:#702727;
  color:#fff;
  font-size:16px;
  font-weight:700;
  cursor:pointer
}

.note{
  margin-top:20px;
  padding:15px;
  border-radius:14px;
  background:#f5f1ec;
  color:#666;
  line-height:1.5
}


/* =========================
   ΑΝΑΚΟΙΝΩΣΕΙΣ
   ========================= */

.announcement-form{
  margin-top:10px
}

textarea{
  width:100%;
  min-height:150px;
  resize:vertical;
  padding:15px;
  border:1px solid #ddd;
  border-radius:14px;
  font-family:inherit;
  font-size:16px;
  line-height:1.5;
  outline:none
}

textarea:focus{
  border-color:#9d6c6c;
}

.announcement-status{
  margin-top:12px;
  padding:12px;
  border-radius:12px;
  background:#f4eee9;
  color:#555;
  display:none;
  line-height:1.45
}

.admin-announcement{
  margin-top:12px;
  padding:15px;
  background:#fffaf8;
  border:1px solid #eaded6;
  border-radius:14px
}

.admin-announcement-date{
  display:block;
  color:#888;
  font-size:13px;
  margin-bottom:6px
}

.admin-announcement-text{
  white-space:pre-wrap;
  line-height:1.5;
  color:#4b2020
}

.delete-announcement{
  margin-top:10px;
  width:auto;
  padding:9px 13px;
  background:#eee5e0;
  color:#702727;
  font-size:14px
}

.empty-admin{
  color:#888;
  text-align:center;
  padding:15px 0
}

</style>

</head>

<body>

<div class="wrap">


<!-- =========================
     ΠΡΟΓΡΑΜΜΑ
     ========================= -->

<div class="card">

<h1>
  ⚙️ Διαχείριση Προγράμματος
</h1>

<p class="lead">
  Ανέβασε το πρόγραμμα της ενορίας σε φωτογραφία ή PDF.
  Θα το αναλύσουμε και θα εμφανίσουμε προεπισκόπηση
  πριν ενημερωθεί το ημερολόγιο.
</p>


<div class="upload">

<div class="emoji">
  📷
</div>

<strong>
  Φωτογραφία ή PDF
</strong>

<span>
  Επίλεξε το αρχείο του προγράμματος
</span>

<input
  id="file"
  type="file"
  accept="image/*,.pdf,application/pdf"
>

</div>


<div
  id="status"
  class="status"
></div>


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


<div class="note">

<strong>
  Προσοχή:
</strong>

το ημερολόγιο δεν αλλάζει ακόμη με την επιλογή
του αρχείου. Θα γίνει πρώτα έλεγχος των ημερομηνιών
και των ακολουθιών.

</div>

</div>


<!-- =========================
     ΑΝΑΚΟΙΝΩΣΕΙΣ
     ========================= -->

<div class="card">

<h2>
  📢 Ανακοινώσεις
</h2>

<p class="lead">
  Γράψε εδώ την ανακοίνωση που θέλεις να εμφανίζεται
  στην αρχική σελίδα.
</p>


<div class="announcement-form">

<textarea
  id="announcementText"
  placeholder="Γράψε την ανακοίνωση..."
></textarea>


<button
  id="saveAnnouncement"
  type="button"
>
  📢 Δημοσίευση ανακοίνωσης
</button>


<div
  id="announcementStatus"
  class="announcement-status"
></div>

</div>


<div
  id="adminAnnouncements"
  style="margin-top:20px"
></div>

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


/*
 * =========================
 * ΠΡΟΓΡΑΜΜΑ
 * =========================
 */

f.addEventListener(
  "change",
  function () {

    const x =
      f.files && f.files[0];

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
      f.files && f.files[0];


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
        "Προς το παρόν υποστηρίζονται φωτογραφίες JPG/PNG.";

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
            method:"POST",
            body:formData
          }
        );


      const data =
        await response.json();


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
        typeof data.response ===
        "string"
      ) {

        let text =
          String(
            data.response
          )
          .replace(
            new RegExp(
              String.fromCharCode(96) +
              "{3}json",
              "gi"
            ),
            ""
          )
          .replace(
            new RegExp(
              String.fromCharCode(96) +
              "{3}",
              "g"
            ),
            ""
          )
          .trim();


        try {

          result =
            JSON.parse(text);

        } catch {

          result = {
            response:text
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

      box.style.marginTop =
        "20px";

      box.style.padding =
        "18px";

      box.style.background =
        "#f5f1ec";

      box.style.borderRadius =
        "14px";

      box.style.whiteSpace =
        "pre-wrap";

      box.style.lineHeight =
        "1.6";

      box.style.color =
        "#4b2020";


      if (
        result.events &&
        Array.isArray(result.events)
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
          event => {

            const item =
              document.createElement(
                "div"
              );


            item.style.padding =
              "12px 0";

            item.style.borderBottom =
              "1px solid #ddd";


            item.innerHTML =
              "<strong>" +
              (event.date || "") +
              " " +
              (event.time || "") +
              "</strong><br>" +
              (event.title || "") +
              (
                event.location
                  ? "<br>📍 " +
                    event.location
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
        "❌ Σφάλμα ανάλυσης: " +
        (
          error.message ||
          error
        );

    }

  };


/*
 * =========================
 * ΑΝΑΚΟΙΝΩΣΕΙΣ
 * =========================
 */

const announcementText =
  document.getElementById(
    "announcementText"
  );


const announcementStatus =
  document.getElementById(
    "announcementStatus"
  );


const adminAnnouncements =
  document.getElementById(
    "adminAnnouncements"
  );


function showAnnouncementStatus(
  text
) {

  announcementStatus.style.display =
    "block";

  announcementStatus.textContent =
    text;

}


async function loadAdminAnnouncements() {

  try {

    const response =
      await fetch(
        "/announcements?v=" +
        Date.now(),
        {
          cache:"no-store"
        }
      );


    const data =
      await response.json();


    const announcements =
      Array.isArray(
        data.announcements
      )
        ? data.announcements
        : [];


    adminAnnouncements.innerHTML =
      "";


    if (!announcements.length) {

      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "empty-admin";

      empty.textContent =
        "Δεν υπάρχουν ανακοινώσεις.";

      adminAnnouncements.appendChild(
        empty
      );

      return;

    }


    announcements.forEach(
      announcement => {

        const item =
          document.createElement(
            "div"
          );

        item.className =
          "admin-announcement";


        const date =
          document.createElement(
            "span"
          );

        date.className =
          "admin-announcement-date";

        date.textContent =
          announcement.date || "";

        item.appendChild(
          date
        );


        const text =
          document.createElement(
            "div"
          );

        text.className =
          "admin-announcement-text";

        text.textContent =
          announcement.text || "";

        item.appendChild(
          text
        );


        const button =
          document.createElement(
            "button"
          );

        button.className =
          "delete-announcement";

        button.type =
          "button";

        button.textContent =
          "🗑 Διαγραφή";


        button.onclick =
          async function () {

            if (
              !confirm(
                "Να διαγραφεί αυτή η ανακοίνωση;"
              )
            ) {
              return;
            }


            try {

              const response =
                await fetch(
                  "/announcements",
                  {
                    method:"DELETE",

                    headers:{
                      "content-type":
                        "application/json"
                    },

                    body:
                      JSON.stringify({
                        id:
                          announcement.id
                      })
                  }
                );


              const data =
                await response.json();


              if (!response.ok) {

                throw new Error(
                  data.error ||
                  "Αποτυχία διαγραφής."
                );

              }


              showAnnouncementStatus(
                "✅ Η ανακοίνωση διαγράφηκε."
              );


              loadAdminAnnouncements();


            } catch (error) {

              showAnnouncementStatus(
                "❌ " +
                (
                  error.message ||
                  error
                )
              );

            }

          };


        item.appendChild(
          button
        );


        adminAnnouncements.appendChild(
          item
        );

      }
    );


  } catch (error) {

    console.error(
      error
    );

    adminAnnouncements.textContent =
      "Δεν ήταν δυνατή η φόρτωση των ανακοινώσεων.";

  }

}


document
  .getElementById(
    "saveAnnouncement"
  )
  .onclick =
  async function () {

    const text =
      announcementText.value.trim();


    if (!text) {

      showAnnouncementStatus(
        "Γράψε πρώτα την ανακοίνωση."
      );

      return;

    }


    showAnnouncementStatus(
      "⏳ Δημοσίευση..."
    );


    try {

      const response =
        await fetch(
          "/announcements",
          {
            method:"POST",

            headers:{
              "content-type":
                "application/json"
            },

            body:
              JSON.stringify({
                text
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


      announcementText.value =
        "";


      showAnnouncementStatus(
        "✅ Η ανακοίνωση δημοσιεύτηκε."
      );


      loadAdminAnnouncements();


    } catch (error) {

      console.error(
        error
      );


      showAnnouncementStatus(
        "❌ " +
        (
          error.message ||
          error
        )
      );

    }

  };


loadAdminAnnouncements();

</script>

</body>

</html>`;

}


/*
 * =========================
 * ESCAPE HTML
 * =========================
 */

function escapeHtml(
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