// Read-only rules. No auto-fill, no auto-correct, no writing into the page.
// Only read the command you type + read visible output blocks.

window.ASHELP_COMMANDS = [
  // PNR / Tickets / EMD
  { key: "RT", desc: "استعراض الحجز (PNR)" , ex: "RT 8GX5S7" },
  { key: "RT TKT", desc: "استعراض الحجز برقم التذكرة", ex: "RT TKT/065-2188718468" },
  { key: "E*RT", desc: "استعراض الحجز من داخل التذكرة", ex: "E*RT" },

  { key: "TWD", desc: "استعراض التذكرة", ex: "TWD/TKT065-2188718468" },
  { key: "TWD/L", desc: "استعراض التذكرة برقم السطر", ex: "TWD/L15" },
  { key: "TWD/O*", desc: "استعراض أصل التذكرة", ex: "TWD/O*" },
  { key: "TWD/XT", desc: "تفاصيل/ضرائب التذكرة", ex: "TWD/XT" },
  { key: "TWH/XT", desc: "تاريخ التذكرة", ex: "TWH/XT" },

  { key: "EWD", desc: "استعراض القسيمة (EMD)", ex: "EWD/EMD065-1234567890" },
  { key: "EWD/L", desc: "استعراض القسيمة برقم السطر", ex: "EWD/L5" },

  { key: "RTF", desc: "استعراض التذاكر/القسائم المرتبطة بالحجز", ex: "RTF" },
  { key: "RHG", desc: "استعراض وثائق السفر (DOCS) / الخدمات", ex: "RHG" },
  { key: "RHF", desc: "استعراض سجل عمليات الدفع", ex: "RHF" },
  { key: "RHI", desc: "استعراض تحديثات الحجز", ex: "RHI" },
  { key: "RTSTR", desc: "استعراض المقاعد المحجوزة", ex: "RTSTR" },
  { key: "RTJ", desc: "استعراض سجل معلومات التواصل", ex: "RTJ" },
  { key: "RTR", desc: "استعراض الملاحظات ورمز الأمان", ex: "RTR" },
  { key: "TDD", desc: "التأكد من ربط التذاكر", ex: "TDD" },
  { key: "AXR RT", desc: "استعراض الحجوزات المفصولة", ex: "AXR RT" },

  // Pricing / Ticketing
  { key: "FXX", desc: "تسعير (عرض)", ex: "FXX" },
  { key: "FXP", desc: "تسعير (تثبيت)", ex: "FXP" },
  { key: "FXP/FF-", desc: "تثبيت التسعير مع باقة", ex: "FXP/FF-NSAVERE" },
  { key: "TQT", desc: "عرض التسعيرة (TST)", ex: "TQT" },
  { key: "TTE/ALL", desc: "حذف تسعيرات (TST)", ex: "TTE/ALL" },
  { key: "TMX/ALL", desc: "تنظيف/إلغاء تسعيرات", ex: "TMX/ALL" },

  { key: "FP", desc: "وسيلة الدفع", ex: "FP SADAD" },
  { key: "TKOK", desc: "ترتيب الحجز", ex: "TKOK" },
  { key: "RFF", desc: "حفظ (Received From)", ex: "RFF" },
  { key: "ER", desc: "حفظ وتأكيد", ex: "ER" },
  { key: "IG", desc: "تجاهل التعديلات", ex: "IG" },
  { key: "TTP/RT", desc: "إصدار التذكرة", ex: "TTP/RT" },

  // Contact
  { key: "APM", desc: "إضافة جوال/تواصل (مشترك)", ex: "APM-SV/M+9665XXXXXXX" },
  { key: "APN", desc: "إضافة جوال/تواصل لمسافر", ex: "APN-SV/M+9665XXXXXXX/P1" },
  { key: "APE", desc: "إضافة بريد إلكتروني", ex: "APE-EMAIL@DOMAIN.COM" },

  // SSR (examples)
  { key: "SSR DOCS", desc: "وثائق السفر (APIS/DOCS)", ex: "SSR DOCS SV HK1 I/SA/.... /P1" },
  { key: "SR WCHC", desc: "كرسي متحرك (مقصورة)", ex: "SR WCHC/P1" },
  { key: "SR BSCT", desc: "سرير رضيع", ex: "SR BSCT/P1" },
  { key: "SR XBAG", desc: "حقيبة إضافية", ex: "SR XBAG NN1/S3/P1" },
  { key: "SM", desc: "اختيار مقعد (قد يكون مدفوع)", ex: "SM" },

  // Lookups / Codes
  { key: "DD", desc: "توقيت مدينة", ex: "DD RUH" },
  { key: "DC", desc: "الاستعلام عن الجنسية", ex: "DC SAUDIARABIA" },
  { key: "DAC", desc: "تحويل من رمز إلى اسم", ex: "DAC SAU" },
  { key: "DAN", desc: "تحويل اسم إلى رمز مدينة", ex: "DAN RIYADH" },
  { key: "DNA", desc: "معرفة رمز المطار", ex: "DNA RIYADH" },

  // AlFursan (as provided)
  { key: "PDAP/PHONE-", desc: "استعلام الفرسان برقم الجوال", ex: "PDAP/PHONE-9665XXXXXXX" },
  { key: "FFD SV-", desc: "تفاصيل عضوية الفرسان", ex: "FFD SV-XXXXXX" },
  { key: "FFA SV-", desc: "إضافة الاسم/التواصل لحجز جديد عبر الفرسان", ex: "FFA SV-XXXXXX" },
  { key: "FFN SV-", desc: "إضافة عضوية الفرسان لحجز جاهز", ex: "FFN SV-XXXXXX" }
];

window.ASHELP_ERRORS = [
  { re: /NEED\s+TICKETING\s+ARGUMENTS/i, hint: "ناقص TKOK.", fix: ["TKOK"] },
  { re: /NEED\s+TST/i, hint: "ما فيه TST داخل الحجز.", fix: ["FXP لإنشاء TST", "ثم TQT للتأكد", "ثم TTP/RT"] },
  { re: /NO\s+FARES\/RBD\/CARRIER\/PASSENGER\s+TYPE/i, hint: "لا يوجد Fare يطابق RBD/Carrier/Passenger Type.", fix: ["راجع RBD (FQS)", "ثم جرّب FXV + رقم السطر", "ثم FXP"] },
  { re: /FINISH\s+OR\s+IGNORE/i, hint: "عملية معلّقة: أكمل أو تجاهل.", fix: ["ER لإكمال", "IG للتجاهل"] },
  { re: /SERVICES\s+EXCEED\s+NAMES/i, hint: "عدد المقاعد/الخدمات أكبر من عدد الأسماء.", fix: ["أضف أسماء أو قلل المقاعد/الخدمات"] }
];

// Flow state (driven by inference + typed commands)
window.ASHELP_FLOW = {
  stateKeys: ["hasPnr","hasSell","hasNames","hasContact","hasTkOk","hasDocs","hasPricing","hasTst","hasPayment","hasSaved"],

  apply(cmd, state) {
    if (/^RT\b/.test(cmd)) state.hasPnr = true;
    if (/^(SS|SN)\b/.test(cmd)) state.hasSell = true;
    if (/^NM\b/.test(cmd)) state.hasNames = true;
    if (/^AP(M|N|E)\b/.test(cmd)) state.hasContact = true;
    if (/^TKOK\b/.test(cmd)) state.hasTkOk = true;
    if (/^(SR\s+DOCS|SSR\s+DOCS|SRDOCS)\b/i.test(cmd) || /\bDOCS\b/i.test(cmd)) state.hasDocs = true;
    if (/^(FXP|FXX)\b/.test(cmd)) state.hasPricing = true;
    if (/^TQT\b/.test(cmd)) state.hasTst = true;
    if (/^FP\b/.test(cmd)) state.hasPayment = true;
    if (/^(RFF|ER)\b/.test(cmd)) state.hasSaved = true;
  },

  next(state) {
    if (!state.hasPnr) return { text: "الخطوة الجاية: RT (افتح الحجز) أو AN (بحث)", want: ["RT", "AN"] };
    if (!state.hasSell) return { text: "الخطوة الجاية: تأكد من القطاعات (SS/RT)", want: ["RT", "SS"] };
    if (!state.hasNames) return { text: "الخطوة الجاية: أسماء (NM...)", want: ["NM"] };
    if (!state.hasContact) return { text: "الخطوة الجاية: تواصل (APM/APN/APE...)", want: ["APM", "APN", "APE"] };
    if (!state.hasTkOk) return { text: "الخطوة الجاية: TKOK", want: ["TKOK"] };
    if (!state.hasDocs) return { text: "الخطوة الجاية: SSR DOCS (أو RHG للمراجعة)", want: ["SSR DOCS", "RHG"] };
    if (!state.hasPricing) return { text: "الخطوة الجاية: تسعير (FXP أو FXX)", want: ["FXP", "FXX"] };
    if (!state.hasTst) return { text: "الخطوة الجاية: TQT (تأكد من TST)", want: ["TQT"] };
    if (!state.hasPayment) return { text: "الخطوة الجاية: FP ...", want: ["FP"] };
    if (!state.hasSaved) return { text: "الخطوة الجاية: حفظ (RFF ثم ER)", want: ["RFF", "ER"] };
    return { text: "إذا مكتمل: TTP/RT", want: ["TTP/RT"] };
  }
};

// NM Templates (display only)
window.ASHELP_NM_TEMPLATES = [
  { label: "بالغ (ذكر)",   ex: "NM1 ALZUWAYDI-ALZUWAYDI/WALEED MR" },
  { label: "بالغة (أنثى)", ex: "NM1 ALZUWAYDI-ALZUWAYDI/HAYA MS" },
  { label: "طفل",          ex: "NM1 ALZUWAYDI-ALZUWAYDI/SARA MSTR(CHD/19DEC18)" },
  { label: "طفلة",         ex: "NM1 ALZUWAYDI-ALZUWAYDI/SARA MISS(CHD/19DEC18)" },
  { label: "رضيع مع بالغ", ex: "NM1 ALDOSSARI-ALDOSSARI/HAYA MS(INFALDOSSARI/FAHAD/29OCT24)" },
  { label: "رضيعة مع بالغة", ex: "NM1 ALDOSSARI-ALDOSSARI/HAYA MS(INFALDOSSARI/HAYA/29OCT24)" }
];

window.ASHELP_NM_NOTE = "تنبيه: النظام غالبًا يعتمد '/' بين العائلة والاسم. الشرطة '-' هنا (عرض/تدريب) فقط. الإضافة لا تعدّل كتابتك.";
