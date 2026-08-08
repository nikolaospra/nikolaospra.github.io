export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/saint-day") {
      try {
        const month = Number(url.searchParams.get("month"));
        const day = Number(url.searchParams.get("day"));

        if (
          !Number.isInteger(month) ||
          !Number.isInteger(day) ||
          month < 1 ||
          month > 12 ||
          day < 1 ||
          day > 31
        ) {
          return new Response("Μη έγκυρη ημερομηνία.", {
            status: 400
          });
        }

        const mm = String(month).padStart(2, "0");
        const dd = String(day).padStart(2, "0");

        const saintUrl =
          `https://www.saint.gr/${mm}/${dd}/index.aspx`;

        const response = await fetch(saintUrl);

        if (!response.ok) {
          return new Response(
            "Δεν ήταν δυνατή η φόρτωση του εορτολογίου.",
            {
              status: 502
            }
          );
        }

        const html = await response.text();

        return new Response(html, {
          headers: {
            "content-type": "text/html; charset=UTF-8",
            "cache-control": "no-store"
          }
        });

      } catch (error) {
        return new Response(
          "Σφάλμα εορτολογίου: " +
          (error instanceof Error
            ? error.message
            : String(error)),
          {
            status: 500
          }
        );
      }
    }

    if (request.method === "GET") {
      return htmlResponse(loginPage());
    }
if (request.method === "POST" &&
    url.pathname === "/analyze") {

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return new Response(
        JSON.stringify({ error: "Δεν βρέθηκε αρχείο." }),
        {
          status: 400,
          headers: { "content-type": "application/json; charset=UTF-8" }
        }
      );
    }

    const contentType = file.type || "image/jpeg";
    const bytes = new Uint8Array(await file.arrayBuffer());

    const aiResult = await env.AI.run(
  "@cf/llava-hf/llava-1.5-7b-hf",
  {
    image: [...bytes],
    prompt: `Διάβασε προσεκτικά αυτή τη φωτογραφία με το πρόγραμμα
των Ιερών Ακολουθιών της ενορίας.

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

if (aiResult && typeof aiResult.response === "string") {
  text = aiResult.response;
} else if (typeof aiResult === "string") {
  text = aiResult;
} else {
  text = JSON.stringify(aiResult);
}

// Αφαίρεση markdown/code fences
text = text
  .replace(/```json/gi, "")
  .replace(/```/g, "")
  .trim();

// Βρες το πραγματικό JSON μέσα στην απάντηση
const start = text.indexOf("{");
const end = text.lastIndexOf("}");

if (start !== -1 && end !== -1 && end > start) {
  text = text.slice(start, end + 1);
}

let parsed;

try {
  parsed = JSON.parse(text);
} catch (e) {
  parsed = {
    events: [],
    response: text
  };
}

return new Response(
  JSON.stringify(parsed),
  {
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store"
    }
  }
);

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json; charset=UTF-8"
        }
      }
    );
  }
}
    if (request.method === "POST" && url.pathname === "/login") {
      const form = await request.formData();
      const password = String(form.get("password") || "");

      if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
        return htmlResponse(loginPage("Λάθος κωδικός."), 401);
      }

      return htmlResponse(adminPage());
    }

    return new Response("Not Found", { status: 404 });
  }
};

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "no-store"
    }
  });
}

function loginPage(error = "") {
  return `<!doctype html>
<html lang="el"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#6f2929">
<title>Διαχείριση • Ι.Ν. Παναγίας Ακαθίστου Ύμνου Οίας</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f1ec;color:#4b2020;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.wrap{max-width:560px;margin:auto;padding:42px 18px}.card{background:#fff;border-radius:26px;padding:30px 24px;box-shadow:0 12px 35px rgba(60,20,20,.10)}
.icon{width:74px;height:74px;margin:0 auto 18px;border-radius:22px;background:#f1e4df;display:grid;place-items:center;font-size:36px}
h1{text-align:center;font-size:27px;margin:0 0 8px}.sub{text-align:center;color:#777;line-height:1.45;margin-bottom:28px}
label{display:block;font-weight:600;margin:0 0 8px}input[type=password]{width:100%;padding:16px;border:1px solid #ddd;border-radius:13px;font-size:17px;outline:none}
button{width:100%;margin-top:15px;padding:16px;border:0;border-radius:13px;background:#702727;color:#fff;font-size:17px;font-weight:700}
.error{background:#ffe7e7;color:#a00000;padding:12px;border-radius:12px;margin-bottom:16px;text-align:center}
</style></head><body><div class="wrap"><div class="card">
<div class="icon">⚙️</div><h1>Διαχείριση</h1>
<div class="sub">Ι.Ν. Παναγίας Ακαθίστου Ύμνου Οίας</div>
${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
<form method="post" action="/login"><label for="password">Κωδικός διαχείρισης</label>
<input id="password" name="password" type="password" autocomplete="current-password" required>
<button type="submit">Είσοδος</button></form>
</div></div></body></html>`;
}

function adminPage() {
  return `<!doctype html>
<html lang="el"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#6f2929"><title>Διαχείριση Προγράμματος</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f1ec;color:#4b2020;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.wrap{max-width:650px;margin:auto;padding:25px 16px 45px}.card{background:#fff;border-radius:26px;padding:25px 20px;box-shadow:0 12px 35px rgba(60,20,20,.10)}
h1{font-size:28px;margin:0 0 7px}.lead{color:#777;margin:0 0 25px;line-height:1.5}
.upload{border:2px dashed #b88b8b;border-radius:19px;padding:28px 16px;text-align:center;background:#fffaf8}
.upload .emoji{font-size:42px;margin-bottom:8px}.upload strong{display:block;font-size:19px}.upload span{display:block;color:#777;margin:7px 0 18px}
input[type=file]{width:100%;font-size:16px}.status{display:none;margin-top:18px;padding:14px;border-radius:13px;background:#f4eee9;color:#555}
.preview{display:none;margin-top:20px}.preview img{max-width:100%;max-height:420px;border-radius:14px;display:block;margin:auto}
.actions{display:flex;gap:10px;margin-top:16px}.actions button{flex:1}.actions .secondary{background:#eee5e0;color:#4b2020}
button{padding:15px;border:0;border-radius:13px;background:#702727;color:#fff;font-size:16px;font-weight:700}
.note{margin-top:20px;padding:15px;border-radius:14px;background:#f5f1ec;color:#666;line-height:1.5}
</style></head><body><div class="wrap"><div class="card">
<h1>⚙️ Διαχείριση Προγράμματος</h1>
<p class="lead">Ανέβασε το πρόγραμμα της ενορίας σε φωτογραφία ή PDF. Θα το αναλύσουμε και θα εμφανίσουμε προεπισκόπηση πριν ενημερωθεί το ημερολόγιο.</p>
<div class="upload"><div class="emoji">📷</div><strong>Φωτογραφία ή PDF</strong>
<span>Επίλεξε το αρχείο του προγράμματος</span>
<input id="file" type="file" accept="image/*,.pdf,application/pdf"></div>
<div id="status" class="status"></div>
<div id="preview" class="preview" style="display:block">
<img id="previewImg" alt="Προεπισκόπηση">

<div class="actions" id="actions" style="display:flex">
<button class="secondary" id="clear" type="button">Αφαίρεση</button>
<button id="next" type="button">Ανάλυση προγράμματος</button>
</div>

</div>
<div class="note"><strong>Προσοχή:</strong> το ημερολόγιο δεν αλλάζει ακόμη με την επιλογή του αρχείου. Θα γίνει πρώτα έλεγχος των ημερομηνιών και των ακολουθιών.</div>
</div></div>
<script>
alert("SCRIPT OK");
const f = document.getElementById("file");
const s = document.getElementById("status");
const p = document.getElementById("preview");
const i = document.getElementById("previewImg");
const a = document.getElementById("actions");

f.addEventListener("change", function () {
    const x = f.files && f.files[0];

    if (!x) {
        return;
    }

    s.style.display = "block";
    s.textContent = "Επιλέχθηκε: " + x.name;

    p.style.display = "block";
    a.style.display = "flex";

    if (x.type && x.type.startsWith("image/")) {
        i.src = URL.createObjectURL(x);
        i.style.display = "block";
    } else {
        i.style.display = "none";
    }
});

document.getElementById("clear").onclick = function () {
    f.value = "";
    s.style.display = "none";
    p.style.display = "none";
    a.style.display = "none";
    i.removeAttribute("src");
};

document.getElementById("next").onclick = async function () {
    const file = f.files && f.files[0];

    if (!file) {
        s.style.display = "block";
        s.textContent = "Παρακαλώ επίλεξε πρώτα φωτογραφία.";
        return;
    }

    if (!file.type || !file.type.startsWith("image/")) {
        s.style.display = "block";
        s.textContent = "Προς το παρόν υποστηρίζονται φωτογραφίες JPG/PNG.";
        return;
    }

    s.style.display = "block";
    s.textContent = "⏳ Αναλύω το πρόγραμμα...";
    
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("/analyze", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Αποτυχία ανάλυσης.");
        }

        let result = data;

        if (data && typeof data.response === "string") {
            let text = String(data.response)
  .replace(new RegExp(String.fromCharCode(96) + "{3}json", "gi"), "")
  .replace(new RegExp(String.fromCharCode(96) + "{3}", "g"), "")
  .trim();

            try {
                result = JSON.parse(text);
            } catch {
                result = { response: text };
            }
        }

        s.textContent = "✅ Η ανάλυση ολοκληρώθηκε.";

        const old = document.getElementById("analysisResult");
        if (old) old.remove();

        const box = document.createElement("div");
        box.id = "analysisResult";

        box.style.marginTop = "20px";
        box.style.padding = "18px";
        box.style.background = "#f5f1ec";
        box.style.borderRadius = "14px";
        box.style.whiteSpace = "pre-wrap";
        box.style.lineHeight = "1.6";
        box.style.color = "#4b2020";

        if (result.events && Array.isArray(result.events)) {
            const title = document.createElement("h2");
            title.textContent = "📅 Ακολουθίες που βρέθηκαν";
            box.appendChild(title);

            result.events.forEach(event => {
                const item = document.createElement("div");

                item.style.padding = "12px 0";
                item.style.borderBottom = "1px solid #ddd";

                item.innerHTML =
                    "<strong>" +
                    (event.date || "") +
                    " " +
                    (event.time || "") +
                    "</strong><br>" +
                    (event.title || "") +
                    (event.location
                        ? "<br>📍 " + event.location
                        : "");

                box.appendChild(item);
            });
        } else {
            box.textContent =
                typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2);
        }

        document.querySelector(".card").appendChild(box);

    } catch (error) {
        console.error(error);

        s.style.display = "block";
        s.textContent =
            "❌ Σφάλμα ανάλυσης: " +
            (error.message || error);
    }
};
</script>