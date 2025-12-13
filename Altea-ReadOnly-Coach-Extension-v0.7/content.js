(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const upper = (s) => norm(s).toUpperCase();

  // READ-ONLY: لا يكتب في خانة الأوامر نهائيًا.

  function findCmdBox() {
    return (
      $("textarea.cmdPromptInput") ||
      $('textarea[id*="cmdPromptInput"]') ||
      $("textarea") ||
      null
    );
  }

  function readOutputTextRaw() {
    const chunks = [];
    const rc = $("#responseCommand code") || $("#responseCommand");
    if (rc) chunks.push(rc.innerText || rc.textContent || "");
    const lastLines = $$('[id*="cmdLine"]').map(e => (e.innerText || e.textContent || "")).filter(Boolean);
    if (lastLines.length) chunks.push(lastLines.slice(-80).join("\n"));
    const pres = $$("pre")
      .map(e => (e.innerText || "").trim())
      .filter(t => t.length >= 40);
    if (pres.length) chunks.push(pres[0]);
    return chunks.join("\n").replace(/\r\n/g, "\n");
  }

  function cmdMeaning(cmd) {
    const list = window.ASHELP_COMMANDS || [];
    const u = upper(cmd);
    const sorted = [...list].sort((a,b)=> (b.key.length - a.key.length));
    for (const c of sorted) {
      const k = upper(c.key);
      if (u.startsWith(k)) return c.desc;
    }
    return "";
  }

  function findCommandMeta(keyPrefix) {
    const list = window.ASHELP_COMMANDS || [];
    const u = upper(keyPrefix);
    const sorted = [...list].sort((a,b)=> (b.key.length - a.key.length));
    for (const c of sorted) {
      const k = upper(c.key);
      if (u === k || u.startsWith(k) || k.startsWith(u)) return c;
    }
    return null;
  }

  function detectErrors(text) {
    const hits = [];
    for (const e of (window.ASHELP_ERRORS || [])) {
      if (e.re.test(text)) hits.push(e);
    }
    return hits;
  }

  function ensureState() {
    const st = {};
    for (const k of window.ASHELP_FLOW.stateKeys) st[k] = false;
    return st;
  }

  // ---- Extract PNR locator, office, timestamp ----
  function parsePnrHeader(rawText) {
    const lines = rawText.split("\n").map(l => l.trim());
    const rpLine = lines.find(l => /^RP\//i.test(l));
    if (!rpLine) return null;

    // Locator often last token on RP line
    const tokens = rpLine.split(/\s+/).filter(Boolean);
    const locator = tokens.length ? tokens[tokens.length-1] : "";

    // timestamp pattern 13DEC25/0942Z
    const tsMatch = rpLine.match(/\b(\d{1,2}[A-Z]{3}\d{2})\/(\d{4}Z)\b/i);
    const stamp = tsMatch ? `${tsMatch[1].toUpperCase()} ${tsMatch[2].toUpperCase()}` : "";

    return { locator, stamp, rpLine };
  }

  // ---- Name extraction (supports multiple names per line) ----
  function extractPaxEntriesFromPnr(rawText) {
    const lines = rawText.split("\n");
    const rpIdx = lines.findIndex(l => /\bRP\//i.test(l));
    if (rpIdx < 0) return [];

    const segIdx = lines.findIndex((l, i) => i > rpIdx && /^\s*\d+\s+[A-Z0-9]{2}\s+\d{2,4}\b/.test(l));
    const endIdx = (segIdx > 0) ? segIdx : Math.min(lines.length, rpIdx + 30);

    const nameBlock = lines.slice(rpIdx, endIdx).join(" ").replace(/\s+/g, " ").trim();

    const pax = [];
    const re = /(?:^|\s)(\d+)\.([A-Z0-9'\-]+\/[A-Z0-9'\-]+)(.*?)(?=(?:\s+\d+\.[A-Z0-9'\-]+\/[A-Z0-9'\-]+)|$)/gi;
    let m;
    while ((m = re.exec(nameBlock)) !== null) {
      pax.push({ num: parseInt(m[1],10), name: m[2], tail: (m[3] || "").trim() });
    }
    return pax.sort((a,b)=>a.num-b.num);
  }

  function countPaxTypes(paxEntries) {
    let adults = 0, children = 0, infants = 0;
    for (const p of paxEntries) {
      const token = `${p.name} ${p.tail}`.toUpperCase();
      const hasChd = /\(CHD\//i.test(token);
      const hasInf = /\(INF/i.test(token);
      if (hasChd) children += 1;
      else adults += 1;
      if (hasInf) infants += 1;
    }
    return { adults, children, infants, total: paxEntries.length };
  }

  // ---- Segment extraction ----
  function parseSegments(rawText) {
    const lines = rawText.split("\n").map(l => l.replace(/\s+$/,""));
    const segs = [];
    const statusRe = /\b(HK|NN|HL|HN|RR|SS|UC|US)(\d+)\b/g;

    for (const l of lines) {
      if (!/^\s*\d+\s+[A-Z0-9]{2}\s+\d{2,4}\b/.test(l)) continue;

      // Example: "3  SV 111 V 10FEB 2 RUHLHR HK2       4  0305 0730   *1A/E*"
      const m = l.match(/^\s*(\d+)\s+([A-Z0-9]{2})\s+(\d{2,4})\s+([A-Z])\s+(\d{1,2}[A-Z]{3})\s+\d+\s+([A-Z]{3})([A-Z]{3})\s+([A-Z]{2}\d+)?\s*(.*)$/i);
      // m[8] may not always match, so use statusRe separately
      let st = null;
      statusRe.lastIndex = 0;
      const sts = [];
      let sm;
      while ((sm = statusRe.exec(l)) !== null) sts.push({ st: sm[1], n: parseInt(sm[2],10) });

      const depArr = l.match(/\b(\d{4})\s+(\d{4})\b/);
      const dep = depArr ? depArr[1] : "";
      const arr = depArr ? depArr[2] : "";

      const first = sts[0] || null;
      const hk = sts.find(x=>x.st==="HK");

      if (m) {
        segs.push({
          seg: m[1],
          carrier: m[2],
          flight: m[3],
          rbd: m[4],
          date: m[5].toUpperCase(),
          from: m[6].toUpperCase(),
          to: m[7].toUpperCase(),
          dep, arr,
          statuses: sts,
          hkParty: hk ? hk.n : 0,
          firstStatus: first ? `${first.st}${first.n}` : ""
        });
      } else {
        const sm2 = l.match(/^\s*(\d+)\s+([A-Z0-9]{2})\s+(\d{2,4}).*?\b([A-Z]{3})([A-Z]{3})\b/i);
        if (sm2) {
          segs.push({
            seg: sm2[1],
            carrier: sm2[2],
            flight: sm2[3],
            rbd: "",
            date: "",
            from: sm2[4].toUpperCase(),
            to: sm2[5].toUpperCase(),
            dep, arr,
            statuses: sts,
            hkParty: (sts.find(x=>x.st==="HK")?.n)||0,
            firstStatus: (sts[0] ? `${sts[0].st}${sts[0].n}` : "")
          });
        }
      }
    }
    return segs;
  }

  // HK group size should be compared per segment (max HK in segments)
  function computeHkParty(segs) {
    const hk = segs.map(s=>s.hkParty||0).filter(n=>n>0);
    return hk.length ? Math.max(...hk) : 0;
  }

  // ---- OPC deadline ----
  function parseOpc(rawText) {
    const m = rawText.match(/\bOPC-(\d{1,2}[A-Z]{3}):(\d{4})\b/i);
    if (!m) return null;
    return { date: m[1].toUpperCase(), time: m[2], raw: m[0] };
  }

  // ---- Payment ----
  function parseFp(rawText) {
    const m = rawText.match(/\bFP\s+([A-Z0-9\-\/]+)\b/i);
    return m ? m[1].toUpperCase() : "";
  }

  // ---- DOCS presence ----
  function hasDocs(rawText) {
    return /\bSSR\s+DOCS\b/i.test(rawText);
  }

  // ---- Tickets referenced ----
  function parseTicketRefs(rawText) {
    const tix = new Set();
    const re1 = /\b(\d{3}-\d{10})\b/g;
    let m;
    while ((m = re1.exec(rawText)) !== null) tix.add(m[1]);
    const re2 = /\bFA\s+PAX\s+(\d{3}-\d{10})\b/gi;
    while ((m = re2.exec(rawText)) !== null) tix.add(m[1]);
    return Array.from(tix);
  }

  // ---- Pricing parsing (fare table + fare families) ----
  function parsePricing(rawText) {
    const amounts = [];
    if (/FARE<\s*SAR\s*>/i.test(rawText)) {
      const r = /\*\s*([0-9]{1,7}\.[0-9]{2})\s*\*/g;
      let m;
      while ((m = r.exec(rawText)) !== null) amounts.push(m[1]);
    }
    const fam = [];
    const famRe = /\*?\d*\*?\s*FARE\s+FAMILIES:\s*([A-Z0-9]+)\b/gi;
    let fm;
    while ((fm = famRe.exec(rawText)) !== null) fam.push(fm[1].toUpperCase());

    const nums = amounts.map(a=>parseFloat(a)).filter(n=>!Number.isNaN(n));
    const max = nums.length ? Math.max(...nums) : null;
    return { found: amounts.length>0 || fam.length>0, amounts: amounts.slice(0, 8), max, families: Array.from(new Set(fam)).slice(0, 8) };
  }

  function inferStateFromOutput(rawText, state) {
    if (/\bRP\//i.test(rawText)) state.hasPnr = true;
    if (/^\s*\d+\s+[A-Z0-9]{2}\s+\d{2,4}\b/m.test(rawText)) state.hasSell = true;

    const pax = extractPaxEntriesFromPnr(rawText);
    if (pax.length) state.hasNames = true;

    if (/\bAPE\b|\bAPM\b|\bAPN\b/i.test(rawText)) state.hasContact = true;
    if (/\bTK\s+OK\b/i.test(rawText)) state.hasTkOk = true;
    if (hasDocs(rawText)) state.hasDocs = true;
    if (/\bFP\s+/i.test(rawText)) state.hasPayment = true;
    if (/\bRF\b/i.test(rawText)) state.hasSaved = true;

    if (/\bFXP\b|\bFXX\b|\bFARE<\s*SAR\s*>/i.test(rawText)) state.hasPricing = true;
    if (/\bTST\b/i.test(rawText)) state.hasTst = true; // only if visible
  }

  function buildSummary(rawText) {
    const header = parsePnrHeader(rawText);
    const paxEntries = extractPaxEntriesFromPnr(rawText);
    const paxCounts = countPaxTypes(paxEntries);

    const segs = parseSegments(rawText);
    const hkParty = computeHkParty(segs);
    const paxSeats = paxCounts.adults + paxCounts.children;

    const opc = parseOpc(rawText);
    const fp = parseFp(rawText);
    const docsOk = hasDocs(rawText);
    const tix = parseTicketRefs(rawText);
    const pricing = parsePricing(rawText);

    const lines = [];
    if (header?.locator) lines.push(`PNR: ${header.locator}${header.stamp ? ` | وقت/سجل: ${header.stamp}` : ""}`);
    if (paxCounts.total) lines.push(`المسافرون: ${paxCounts.total} (بالغ=${paxCounts.adults} | طفل=${paxCounts.children} | رضيع=${paxCounts.infants})`);
    if (hkParty) {
      const mismatch = (hkParty !== paxSeats) ? ` ⚠ فرق=${Math.abs(hkParty - paxSeats)}` : " ✓";
      lines.push(`المقاعد المؤكدة HK: ${hkParty} | مقاعد حسب الأسماء: ${paxSeats}${mismatch}`);
    }
    if (segs.length) {
      for (const s of segs.slice(0, 5)) {
        const rbd = s.rbd ? ` ${s.rbd}` : "";
        const d = s.date ? ` ${s.date}` : "";
        const times = (s.dep && s.arr) ? ` ${s.dep}-${s.arr}` : "";
        const st = s.firstStatus ? ` ${s.firstStatus}` : "";
        lines.push(`S${s.seg}: ${s.carrier}${s.flight}${rbd}${d} ${s.from}-${s.to}${times}${st}`.trim());
      }
      if (segs.length > 5) lines.push(`... (${segs.length} segments)`);
    }
    if (opc) lines.push(`مهلة الإصدار (OPC): ${opc.date} ${opc.time}`);
    if (docsOk) lines.push(`DOCS: موجود ✓`);
    else if (header) lines.push(`DOCS: غير موجود ⚠`);
    if (fp) lines.push(`الدفع FP: ${fp}`);
    if (tix.length) lines.push(`تذاكر مرصودة: ${tix.slice(0,4).join(", ")}${tix.length>4 ? "..." : ""}`);
    if (pricing.families.length) lines.push(`Fare Family: ${pricing.families.join(", ")}`);
    if (pricing.max !== null) lines.push(`أعلى مبلغ ظاهر: SAR ${pricing.max.toFixed(2)}`);

    return lines.length ? lines.join("\n") : "-";
  }

  // ---- Suggestions ----
  function buildSuggestions(state, rawText) {
    const flow = window.ASHELP_FLOW;
    const nxt = flow.next(state);
    const want = nxt.want || [];
    const tix = parseTicketRefs(rawText);

    const items = [];

    for (const w of want) {
      const meta = findCommandMeta(w) || { key: w, desc: "" };
      items.push({ key: meta.key || w, desc: meta.desc || "", ex: meta.ex || "" });
    }

    // Contextual extras:
    if (state.hasPnr && tix.length) {
      items.push({ key: "TWD", desc: "استعراض التذكرة", ex: `TWD/TKT${tix[0]}` });
      items.push({ key: "RT TKT", desc: "استعراض الحجز برقم التذكرة", ex: `RT TKT/${tix[0]}` });
    }
    if (state.hasPnr && !state.hasTst) items.push({ key: "TQT", desc: "تأكد من وجود TST", ex: "TQT" });
    if (state.hasPnr) items.push({ key: "RHG", desc: "عرض DOCS/الخدمات", ex: "RHG" });

    // De-dup by key+ex
    const seen = new Set();
    return items.filter(it => {
      const k = `${it.key}|${it.ex}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 10);
  }

  // ---- UI ----
  function mountUI() {
    if (document.getElementById("__ashelp_ro_host")) return null;

    const host = document.createElement("div");
    host.id = "__ashelp_ro_host";
    host.style.cssText = "position:fixed;top:0;right:0;z-index:2147483647;";

    const sh = host.attachShadow({ mode: "open" });
    sh.innerHTML = `
      <style>
        .tab {
          position: fixed;
          top: 120px;
          right: 0;
          background: #111;
          color: #fff;
          border: 1px solid #333;
          border-right: 0;
          padding: 10px 8px;
          border-radius: 12px 0 0 12px;
          cursor: pointer;
          font: 12px Arial;
          user-select: none;
        }
        .panel {
          position: fixed;
          top: 70px;
          right: 12px;
          width: 520px;
          max-width: 94vw;
          max-height: 82vh;
          overflow: auto;
          background: rgba(0,0,0,0.90);
          color: #fff;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 10px;
          font: 12px/1.45 Arial;
          display: none;
        }
        .row { margin-bottom: 10px; }
        .label { opacity:.85; margin-bottom: 4px; display:flex; justify-content:space-between; align-items:center; gap:8px;}
        .box {
          background:#0b0b0b;
          border:1px solid #333;
          border-radius:10px;
          padding:8px;
          white-space: pre-wrap;
        }
        button {
          padding:6px 10px;
          border-radius:8px;
          border:1px solid #444;
          background:#222;
          color:#fff;
          cursor:pointer;
          font: 12px Arial;
        }
        ul { margin:0; padding-left:18px; }
        .hint { color:#bfe3ff; margin-top:6px; }
        .small { opacity:.7; }
        .hr { height:1px; background:#333; margin:10px 0; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        input {
          width:100%;
          padding:8px 10px;
          border-radius:10px;
          border:1px solid #333;
          background:#0b0b0b;
          color:#fff;
          outline:none;
          font: 12px Arial;
          box-sizing:border-box;
        }
        .cmdItem { margin: 6px 0; }
        .cmdKey { font-weight:700; }
        .cmdEx { opacity:.85; margin-top:2px; }
      </style>

      <div class="tab" id="tab">مساعد</div>

      <div class="panel" id="panel">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-weight:700">مساعد (قراءة فقط)</div>
          <div style="display:flex;gap:6px;align-items:center;">
            <button id="toggleWatch">إيقاف المتابعة</button>
            <button id="close">×</button>
          </div>
        </div>

        <div class="row">
          <div class="label"><span>الأمر الحالي</span><span class="small" id="cmdName"></span></div>
          <div class="box mono" id="cur">-</div>
        </div>

        <div class="row">
          <div class="label"><span>الملخص</span><span class="small">PNR / تذاكر / أوقات / تواريخ</span></div>
          <div class="box mono" id="summary">-</div>
        </div>

        <div class="row">
          <div class="label"><span>الخطوة الجاية</span><span class="small">متوقع تختار</span></div>
          <div class="box" id="next">-</div>
        </div>

        <div class="row">
          <div class="label"><span>أوامر مقترحة</span><span class="small">حسب آخر إدخال + الحالة</span></div>
          <div class="box" id="suggest"></div>
        </div>

        <div class="row">
          <div class="label"><span>بحث داخل الأوامر</span><span class="small">اكتب RT أو TWD..</span></div>
          <input id="cmdSearch" placeholder="مثال: TWD أو FXP أو RHG" />
          <div class="box" id="cmdMatches" style="margin-top:8px;"></div>
        </div>

        <div class="row" id="nmBlock" style="display:none;">
          <div class="label"><span>نماذج NM (عرض فقط)</span><span class="small">لا يتم إدخالها تلقائيًا</span></div>
          <div class="box mono" id="nmTemplates"></div>
          <div class="small" id="nmNote"></div>
        </div>

        <div class="hr"></div>

        <div class="row">
          <div class="label">تنبيهات / نواقص</div>
          <ul id="issues"></ul>
        </div>
      </div>
    `;

    document.documentElement.appendChild(host);

    const tab = sh.getElementById("tab");
    const panel = sh.getElementById("panel");
    const close = sh.getElementById("close");
    const toggleWatch = sh.getElementById("toggleWatch");

    const cmdName = sh.getElementById("cmdName");
    const cur = sh.getElementById("cur");
    const summary = sh.getElementById("summary");
    const next = sh.getElementById("next");
    const suggest = sh.getElementById("suggest");

    const cmdSearch = sh.getElementById("cmdSearch");
    const cmdMatches = sh.getElementById("cmdMatches");

    const nmBlock = sh.getElementById("nmBlock");
    const nmTemplates = sh.getElementById("nmTemplates");
    const nmNote = sh.getElementById("nmNote");

    const issues = sh.getElementById("issues");

    let watching = true;

    tab.addEventListener("click", () => {
      panel.style.display = (panel.style.display === "block") ? "none" : "block";
    });
    close.addEventListener("click", () => { panel.style.display = "none"; });

    toggleWatch.addEventListener("click", () => {
      watching = !watching;
      toggleWatch.textContent = watching ? "إيقاف المتابعة" : "تشغيل المتابعة";
    });

    return {
      cmdName, cur, summary, next, suggest, cmdSearch, cmdMatches,
      nmBlock, nmTemplates, nmNote, issues,
      isWatching: () => watching,
      show: () => { panel.style.display = "block"; }
    };
  }

  const ui = mountUI();
  if (!ui) return;

  const state = ensureState();
  const flow = window.ASHELP_FLOW;

  function renderSuggestions(items) {
    if (!items.length) return "—";
    return items.map(it => {
      const ex = it.ex ? `\n  مثال: ${it.ex}` : "";
      const d = it.desc ? ` — ${it.desc}` : "";
      return `• ${it.key}${d}${ex}`;
    }).join("\n");
  }

  function renderMatches(query) {
    const q = upper(query);
    if (!q) return "—";
    const list = window.ASHELP_COMMANDS || [];
    const hits = list
      .filter(c => upper(c.key).includes(q) || upper(c.desc).includes(q))
      .slice(0, 12);
    if (!hits.length) return "لا يوجد.";
    return hits.map(c => {
      const ex = c.ex ? `\n  مثال: ${c.ex}` : "";
      return `• ${c.key} — ${c.desc}${ex}`;
    }).join("\n");
  }

  function updateNmBlock(cmd) {
    const show = /^NM\b/i.test(cmd);
    ui.nmBlock.style.display = show ? "block" : "none";
    if (!show) return;
    const tpls = window.ASHELP_NM_TEMPLATES || [];
    ui.nmTemplates.textContent = tpls.map(t => `- ${t.label}: ${t.ex}`).join("\n");
    ui.nmNote.textContent = window.ASHELP_NM_NOTE || "";
  }

  function validate(cmd, outText) {
    const list = [];
    // system errors -> show
    for (const e of detectErrors(outText)) {
      const hint = e.hint ? `خطأ بالنظام: ${e.hint}` : "خطأ بالنظام.";
      const fix = (e.fix && e.fix.length) ? `الحل: ${e.fix.join(" ثم ")}` : "";
      list.push([hint, fix].filter(Boolean).join(" | "));
    }
    // minimal typed-command sanity:
    if (/^RT\b/i.test(cmd) && cmd.length < 5) list.push("RT: ناقص رقم الحجز/التذكرة.");
    if (/^TWD\b/i.test(cmd) && !/065-\d{10}/.test(cmd) && !/\/L\d+/.test(cmd)) list.push("TWD: استخدم رقم تذكرة 065-XXXXXXXXXX أو /L#.");
    return list;
  }

  let scheduled = false;
  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; update(); }, 250);
  }

  function update() {
    const cmdBox = findCmdBox();
    const cmd = upper(cmdBox?.value || "");
    const outRaw = readOutputTextRaw();
    const outNorm = norm(outRaw);

    // infer from output
    inferStateFromOutput(outRaw, state);

    ui.cur.textContent = cmd || "-";
    ui.cmdName.textContent = cmd ? (cmdMeaning(cmd) ? `(${cmdMeaning(cmd)})` : "") : "";

    // summary
    ui.summary.textContent = buildSummary(outRaw);

    // next + suggestions
    const nxt = flow.next(state);
    ui.next.textContent = nxt.text || "-";
    const sug = buildSuggestions(state, outRaw);
    ui.suggest.textContent = renderSuggestions(sug);

    // NM block
    updateNmBlock(cmd);

    // Issues
    const warns = validate(cmd, outNorm);
    ui.issues.innerHTML = "";
    if (!warns.length) {
      const li = document.createElement("li");
      li.textContent = "لا يوجد.";
      ui.issues.appendChild(li);
    } else {
      for (const w of warns.slice(0, 16)) {
        const li = document.createElement("li");
        li.textContent = w;
        ui.issues.appendChild(li);
      }
    }
  }

  // command search box
  ui.cmdSearch.addEventListener("input", () => {
    ui.cmdMatches.textContent = renderMatches(ui.cmdSearch.value || "");
  }, { passive: true });

  function hookCmdBox() {
    const cmdBox = findCmdBox();
    if (!cmdBox || cmdBox.__ashelpROHooked) return;
    cmdBox.__ashelpROHooked = true;

    cmdBox.addEventListener("input", () => {
      if (!ui.isWatching()) return;
      scheduleUpdate();
    }, { passive: true });

    cmdBox.addEventListener("keydown", (e) => {
      if (!ui.isWatching()) return;
      if (e.key === "Enter" && !e.shiftKey) {
        const entered = upper(cmdBox.value);
        setTimeout(() => {
          flow.apply(entered, state);
          scheduleUpdate();
        }, 250);
      }
    }, { passive: true });
  }

  const mo = new MutationObserver(() => {
    hookCmdBox();
    if (ui.isWatching()) scheduleUpdate();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  hookCmdBox();
  ui.cmdMatches.textContent = "—";
  update();
  ui.show();
})();
