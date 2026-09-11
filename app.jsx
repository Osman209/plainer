const { useState, useRef, useEffect, useMemo } = React;

/* ------------------------------------------------------------------ *
 * plainer — a style editor for academic and technical prose.
 *
 * English, Arabic and Spanish. It makes a passage clearer and shows
 * every change with the reason, so the writer decides. It is not a
 * rewriter that hands back a finished block, and it does not target
 * AI detectors.
 *
 * Two independent controls:
 *   strength — how much to change
 *   register — leave the tone alone, or push it less/more formal
 *
 * The model returns sentence-level revisions. The word-level diff, the
 * mark-up, the filtering and the counts are computed here, so what you
 * see marked is exactly what changed.
 * ------------------------------------------------------------------ */

/* ================= language tables ================= */

const FONT_EN = "'Spectral', Georgia, serif";
const FONT_AR = "'Amiri', 'Noto Naskh Arabic', serif";
const UI = "'IBM Plex Sans', system-ui, sans-serif";

const CATS = {
  en: {
    "stock phrase": "Opening words that carry no information",
    wordy: "A shorter phrase says the same thing",
    nominalization: "A verb hidden inside a noun",
    passive: "Active is clearer and the agent is known",
    "empty intensifier": "A word that sounds like a measurement but is not",
    hedging: "Hedges stacked on hedges",
    "sentence pattern": "A formula where a plain sentence reads better",
    "noun chain": "Too many nouns in a row to parse",
    redundant: "The same idea twice",
    monotony: "Several sentences with the same shape",
    register: "Tone moved to the level you asked for",
  },
  ar: {
    حشو: "عبارات افتتاحية لا تحمل معلومة",
    "ترجمة حرفية": "تركيب منقول حرفيًا عن الإنجليزية",
    "تم والمبني للمجهول": "الإفراط في تم والمبني للمجهول بدل الفعل المباشر",
    "قام بـ": "فعل مساعد حول المصدر بدل الفعل نفسه",
    "جملة طويلة": "جملة متصلة بالواو يصعب تتبعها",
    "إضافات متتابعة": "سلسلة إضافات طويلة",
    تكرار: "المعنى نفسه مرتين",
    "مصطلح غير دقيق": "مقابل عربي أدق للمصطلح",
    ترقيم: "الترقيم يغيّر قراءة الجملة",
    "مستوى اللغة": "نُقل مستوى الأسلوب إلى الدرجة المطلوبة",
  },
  es: {
    "frase hecha": "Palabras de apertura que no aportan información",
    verboso: "Una frase más corta dice lo mismo",
    nominalización: "Un verbo escondido dentro de un sustantivo",
    pasiva: "La activa o la pasiva refleja se leen mejor",
    "intensificador vacío": "Una palabra que suena a medida pero no lo es",
    gerundio: "Gerundio de posterioridad o mal empleado",
    "oración larga": "Subordinadas encadenadas difíciles de seguir",
    dequeísmo: "Uso incorrecto de de que o que",
    anglicismo: "Hay un término español corriente",
    redundante: "La misma idea dos veces",
    registro: "Tono ajustado al nivel que pediste",
  },
};

const REGISTER_CAT = { en: "register", ar: "مستوى اللغة", es: "registro" };

const SAMPLES = {
  en: `It is important to note that the proposed methodology demonstrates significant potential for the optimization of computational efficiency. In order to validate our approach, a comprehensive series of experiments was conducted. The results obtained from these experiments clearly indicate that the method is not only faster but also more accurate than existing approaches. Due to the fact that the computational cost is reduced substantially, the method can be applied to considerably larger problem instances.`,
  ar: `من الجدير بالذكر أنه قد تم إجراء عملية تحليل شاملة للنتائج التي تم الحصول عليها من خلال التجارب المعملية، وذلك في ضوء المعايير المعتمدة دولياً في هذا المجال، حيث أنه قد قامت المجموعة البحثية بالقيام بعدد من القياسات المتكررة. وفي هذا الصدد، لا بد من الإشارة إلى أن النتائج تشير إلى وجود تحسن ملحوظ في الأداء.`,
  es: `Cabe destacar que la metodología propuesta demuestra un potencial sumamente significativo para la optimización de la eficiencia computacional. Con el objeto de proceder a la validación de nuestro enfoque, fue realizada una serie exhaustiva de experimentos por parte del equipo. Los resultados obtenidos indican claramente que el método resulta ser más rápido, siendo además más preciso que los enfoques existentes.`,
};

const T = {
  en: {
    label: "English",
    dir: "ltr",
    font: FONT_EN,
    size: 18,
    lh: 1.85,
    tagline: "shows you what it changed, and why",
    placeholder: "Paste a paragraph from a paper, an abstract, or an email.",
    markUp: "Mark up the draft",
    reading: "Reading…",
    kept: "changes kept",
    words: "words",
    back: "Back to the draft",
    copyLog: "Copy change log",
    copyClean: "Copy clean text",
    download: "Download",
    stop: "Stop",
    noteWord: "note",
    editNote: "Every change is shown with the reason for it, and you decide one by one.",
    sampleWord: "Example",
    sampleTitle: "Load an example passage",
    pasteFirst: "Paste or type something above first.",
    explainBtn: "Why?",
    explainAgain: "Why?",
    explaining: "Thinking…",
    explainFailed: "Could not explain this one. Try again.",
    lessonWhat: "What changed",
    lessonWhy: "The principle",
    lessonAlt: "Another way to fix it",
    lessonWhenNot: "When this edit is the wrong call",
    lessonExample: "The same problem elsewhere",
    dashOpen: "Your writing over time",
    dashTotals: "Totals",
    passages: "passages",
    wordsWord: "words",
    changesMade: "changes made",
    flaggedTotal: "flagged in all",
    dashCurve: "Problems per 100 words",
    per100Word: "per 100 words",
    curveNote: "Counted, not judged: the same check applied to every passage.",
    tooFew: "Six passages are needed before a line here means anything.",
    dashProblems: "What comes up most",
    noProblemsYet: "Nothing recurring yet.",
    problemsNote: "Only changes you agreed with are counted.",
    readTrendNote: "Calculated from sentence and word length, so it is comparable across months.",
    dashEmpty: "Nothing here yet. Mark up a draft and it starts recording.",
    dashCaveat: "These are counts and calculations, not a score. The curve moves with what you write as much as with how you write: a dense paper will flag more than a short email, so read a change over many passages rather than between two. Nothing here leaves this browser.",
    modeClaims: "Claims and logic",
    runClaims: "Check the claims",
    claimsNote: "What kind of statement each sentence is, which claims have nothing behind them in this passage, and whether the passage contradicts itself.",
    contradictions: "Contradictions",
    noContradictions: "No contradiction found between any two statements.",
    unsupportedWord: "Claims with nothing behind them",
    allSupported: "Every fact and conclusion here is backed by something in the passage.",
    kindsWord: "What the sentences are",
    evidenceWord: "Evidence",
    claimsMissed: "sentence(s) could not be matched and are unmarked.",
    modeDebate: "Debate",
    runDebate: "Argue both sides",
    debating: "Arguing…",
    debateNote: "The strongest honest case for the claim and the strongest against it, written separately so neither is a straw man. Each argument shows what it rests on.",
    thesisWord: "The claim being argued",
    restsOn: "Rests on",
    strongestWord: "Strongest point",
    changesMind: "What would change this position",
    thesisClash: "The two sides are arguing about different claims. That usually means the passage has not said plainly what it argues.",
    modeRead: "How it reads",
    seeRead: "Show me how it reads",
    readNote: "Where a reader slows down, and four judgements on a 1-5 scale with the reason for each. Readability is calculated from the text itself, so it does not change between runs.",
    band1: "Clear first time",
    band2: "Reader slows down",
    band3: "Reader stops",
    clarity: "Clarity",
    logic: "Logic",
    structure: "Structure",
    evidence: "Evidence",
    readability: "Readability",
    scoresNote: "Judgements, not measurements. Run it twice and these may move by a point.",
    wps: "words per sentence",
    longestS: "longest sentence",
    fleschNote: "Flesch Reading Ease, calculated from sentence and word length.",
    huertaNote: "Fernandez Huerta index, calculated from sentence and word length.",
    arabicNote: "Arabic has no widely agreed readability formula, so none is invented here. Sentence length is reported on its own.",
    missedS: "sentence(s) could not be matched and are unmarked.",
    sendReview: "Send to review",
    reviewing: "Reviewing…",
    modeEdit: "Copy edit",
    modeReview: "Peer review",
    majorWord: "Major concerns",
    minorWord: "Minor points",
    whereWord: "Where",
    fixWord: "What would answer it",
    readsAs: "Reads as",
    copyReports: "Copy all three reports",
    copiedReports: "Reports copied",
    reviewNote: "Three referees, three angles, written independently. They review what is on the page: they cannot check that your results are true, that your citations exist, or what your field has already published.",
    backDraft: "Back to the draft",
    reviewerFailed: "One reviewer could not be reached. The others are here.",
    copySentence: "Copy this sentence",
    copiedSentence: "Sentence copied",
    keysMove: "to move",
    keysToggle: "to apply or undo",
    copiedLog: "Change log copied",
    copiedClean: "Clean text copied",
    summary: "Summary",
    before: "before",
    after: "after",
    notes: "notes",
    muteHint: "Click a category to mute it",
    applyAll: "Apply all",
    undoAll: "Undo all",
    nothing: "Nothing to change. The passage already reads plainly.",
    undoOne: "Undo this change",
    applyOne: "Apply this change",
    dropped: (n) =>
      `${n} suggestion${n > 1 ? "s" : ""} did not match your text word for word and ${
        n > 1 ? "were" : "was"
      } dropped.`,
    failedBlocks: (n) =>
      `${n} block${n > 1 ? "s" : ""} could not be read and ${
        n > 1 ? "were" : "was"
      } left unmarked. Everything else is here.`,
  },
  ar: {
    label: "العربية",
    dir: "rtl",
    font: FONT_AR,
    size: 19,
    lh: 2.1,
    tagline: "يوريك إيه اتغيّر، وليه",
    placeholder: "الصق فقرة من ورقة أو ملخصًا أو رسالة.",
    markUp: "راجع المسودة",
    reading: "يقرأ…",
    kept: "تعديل مطبَّق",
    words: "كلمة",
    back: "رجوع للمسودة",
    copyLog: "نسخ سجل التعديلات",
    copyClean: "نسخ النص النهائي",
    download: "تنزيل",
    stop: "إيقاف",
    noteWord: "ملاحظة",
    editNote: "كل تعديل يظهر ومعه سببه، وأنت تقرر واحدًا واحدًا.",
    sampleWord: "مثال",
    sampleTitle: "حمّل مقطعًا للتجربة",
    pasteFirst: "الصق نصًا في الأعلى أولًا.",
    explainBtn: "ليه؟",
    explainAgain: "ليه؟",
    explaining: "يفكر…",
    explainFailed: "تعذّر شرح هذه. حاول مرة أخرى.",
    lessonWhat: "ما الذي تغيّر",
    lessonWhy: "المبدأ",
    lessonAlt: "طريقة أخرى للعلاج",
    lessonWhenNot: "متى يكون هذا التعديل خطأ",
    lessonExample: "المشكلة نفسها في موضع آخر",
    dashOpen: "كتابتك عبر الوقت",
    dashTotals: "الإجمالي",
    passages: "مقطعًا",
    wordsWord: "كلمة",
    changesMade: "تعديلًا مطبَّقًا",
    flaggedTotal: "ملاحظة في المجمل",
    dashCurve: "الملاحظات لكل 100 كلمة",
    per100Word: "لكل 100 كلمة",
    curveNote: "معدود لا محكوم عليه: الفحص نفسه مطبَّق على كل مقطع.",
    tooFew: "يلزم ستة مقاطع قبل أن يعني هذا الخط شيئًا.",
    dashProblems: "الأكثر تكرارًا",
    noProblemsYet: "لا شيء متكرر بعد.",
    problemsNote: "تُحسب التعديلات التي وافقت عليها فقط.",
    readTrendNote: "محسوبة من طول الجملة وطول الكلمة، فهي قابلة للمقارنة عبر الشهور.",
    dashEmpty: "لا شيء هنا بعد. راجع مسودة ويبدأ التسجيل.",
    dashCaveat: "هذه أعداد وحسابات، لا درجة. المنحنى يتحرك بما تكتبه بقدر ما يتحرك بكيف تكتب: ورقة كثيفة ستُظهر ملاحظات أكثر من رسالة قصيرة، فاقرأ التغير عبر مقاطع كثيرة لا بين اثنين. ولا شيء هنا يغادر هذا المتصفح.",
    modeClaims: "الادعاءات والمنطق",
    runClaims: "افحص الادعاءات",
    claimsNote: "نوع كل جملة، وأي الادعاءات ليس خلفها شيء في هذا المقطع، وهل يناقض المقطع نفسه.",
    contradictions: "التناقضات",
    noContradictions: "لم يُعثر على تناقض بين أي قولين.",
    unsupportedWord: "ادعاءات بلا سند",
    allSupported: "كل واقعة واستنتاج هنا مسنود بشيء في المقطع.",
    kindsWord: "أنواع الجمل",
    evidenceWord: "الأدلة",
    claimsMissed: "جملة تعذّر مطابقتها فتُركت بلا تصنيف.",
    modeDebate: "مناظرة",
    runDebate: "حاجج الجهتين",
    debating: "يُحاجج…",
    debateNote: "أقوى حجة أمينة مع الادعاء وأقوى حجة ضده، مكتوبتان منفصلتين حتى لا تكون إحداهما خصمًا من قش. وكل حجة تُظهر ما تقوم عليه.",
    thesisWord: "الادعاء محل النقاش",
    restsOn: "يقوم على",
    strongestWord: "أقوى نقطة",
    changesMind: "ما الذي يزحزح هذا الموقف",
    thesisClash: "الجهتان تتناقشان حول ادعاءين مختلفين. هذا غالبًا يعني أن المقطع لم يقل صراحة ما الذي يجادل عنه.",
    modeRead: "كيف يُقرأ",
    seeRead: "اعرض كيف يُقرأ",
    readNote: "أين يتمهّل القارئ، وأربعة أحكام على مقياس من 1 إلى 5 مع سبب كل حكم. أما سهولة القراءة فتُحسب من النص نفسه، فلا تتغير بين تشغيل وآخر.",
    band1: "واضحة من أول مرة",
    band2: "القارئ يتمهّل",
    band3: "القارئ يتوقف",
    clarity: "الوضوح",
    logic: "التسلسل المنطقي",
    structure: "البنية",
    evidence: "الأدلة",
    readability: "سهولة القراءة",
    scoresNote: "أحكام لا قياسات. شغّلها مرتين وقد تتحرك درجة.",
    wps: "كلمة في الجملة",
    longestS: "أطول جملة",
    fleschNote: "مؤشر فليش، محسوب من طول الجملة وطول الكلمة.",
    huertaNote: "مؤشر فرنانديث هويرتا، محسوب من طول الجملة وطول الكلمة.",
    arabicNote: "لا توجد صيغة متفق عليها لسهولة القراءة في العربية، فلم تُخترع واحدة هنا. يُعرض طول الجملة وحده.",
    missedS: "جملة تعذّر مطابقتها فتُركت بلا تلوين.",
    sendReview: "أرسل للمراجعة",
    reviewing: "تُراجَع…",
    modeEdit: "تحرير لغوي",
    modeReview: "مراجعة أقران",
    majorWord: "ملاحظات كبرى",
    minorWord: "ملاحظات صغرى",
    whereWord: "الموضع",
    fixWord: "ما الذي يعالجها",
    readsAs: "يُقرأ على أنه",
    copyReports: "نسخ التقارير الثلاثة",
    copiedReports: "نُسخت التقارير",
    reviewNote: "ثلاثة مراجعين، ثلاث زوايا، كل تقرير مستقل. يراجعون ما هو مكتوب أمامهم: لا يمكنهم التحقق من صحة نتائجك ولا من وجود مراجعك ولا مما نُشر في مجالك.",
    backDraft: "رجوع للمسودة",
    reviewerFailed: "تعذّر الوصول إلى أحد المراجعين. الباقي هنا.",
    copySentence: "نسخ هذه الجملة",
    copiedSentence: "نُسخت الجملة",
    keysMove: "للتنقل",
    keysToggle: "للتطبيق أو التراجع",
    copiedLog: "نُسخ سجل التعديلات",
    copiedClean: "نُسخ النص",
    summary: "الخلاصة",
    before: "قبل",
    after: "بعد",
    notes: "ملاحظة",
    muteHint: "اضغط على فئة لإخفائها",
    applyAll: "طبّق الكل",
    undoAll: "تراجع عن الكل",
    nothing: "لا شيء يستحق التغيير. النص يقرأ بوضوح.",
    undoOne: "تراجع عن هذا التعديل",
    applyOne: "طبّق هذا التعديل",
    dropped: (n) => `${n} اقتراح لم يطابق نصك حرفيًا فتم تجاهله.`,
    failedBlocks: (n) => `تعذّرت قراءة ${n} مقطع فتُرك بلا تعليم. الباقي كله هنا.`,
  },
  es: {
    label: "Español",
    dir: "ltr",
    font: FONT_EN,
    size: 18,
    lh: 1.9,
    tagline: "te enseña qué cambió, y por qué",
    placeholder: "Pega un párrafo de un artículo, un resumen o un correo.",
    markUp: "Revisar el borrador",
    reading: "Leyendo…",
    kept: "cambios aplicados",
    words: "palabras",
    back: "Volver al borrador",
    copyLog: "Copiar lista de cambios",
    copyClean: "Copiar texto final",
    download: "Descargar",
    stop: "Detener",
    noteWord: "nota",
    editNote: "Cada cambio se muestra con su motivo, y tú decides uno a uno.",
    sampleWord: "Ejemplo",
    sampleTitle: "Cargar un texto de ejemplo",
    pasteFirst: "Pega o escribe algo arriba primero.",
    explainBtn: "¿Por qué?",
    explainAgain: "¿Por qué?",
    explaining: "Pensando…",
    explainFailed: "No se pudo explicar. Inténtalo de nuevo.",
    lessonWhat: "Qué cambió",
    lessonWhy: "El principio",
    lessonAlt: "Otra forma de resolverlo",
    lessonWhenNot: "Cuándo este cambio es un error",
    lessonExample: "El mismo problema en otro sitio",
    dashOpen: "Tu escritura con el tiempo",
    dashTotals: "Totales",
    passages: "textos",
    wordsWord: "palabras",
    changesMade: "cambios aplicados",
    flaggedTotal: "señalados en total",
    dashCurve: "Problemas por 100 palabras",
    per100Word: "por 100 palabras",
    curveNote: "Contado, no juzgado: la misma comprobación en cada texto.",
    tooFew: "Hacen falta seis textos para que esta línea signifique algo.",
    dashProblems: "Lo que más aparece",
    noProblemsYet: "Nada recurrente todavía.",
    problemsNote: "Solo se cuentan los cambios que aceptaste.",
    readTrendNote: "Calculada a partir de la longitud de frase y palabra, así que es comparable entre meses.",
    dashEmpty: "Aquí no hay nada aún. Revisa un borrador y empezará a registrarse.",
    dashCaveat: "Esto son recuentos y cálculos, no una puntuación. La curva se mueve tanto con lo que escribes como con cómo escribes: un artículo denso señalará más que un correo corto, así que lee el cambio a lo largo de muchos textos, no entre dos. Nada de esto sale de este navegador.",
    modeClaims: "Afirmaciones y lógica",
    runClaims: "Revisar las afirmaciones",
    claimsNote: "Qué tipo de enunciado es cada frase, qué afirmaciones no tienen nada detrás en este texto, y si el texto se contradice.",
    contradictions: "Contradicciones",
    noContradictions: "No se encontró contradicción entre dos enunciados.",
    unsupportedWord: "Afirmaciones sin respaldo",
    allSupported: "Todo hecho y conclusión aquí se apoya en algo del texto.",
    kindsWord: "Qué son las frases",
    evidenceWord: "Evidencia",
    claimsMissed: "frase(s) no se pudieron emparejar y quedan sin marcar.",
    modeDebate: "Debate",
    runDebate: "Argumentar ambos lados",
    debating: "Argumentando…",
    debateNote: "El caso honesto más fuerte a favor de la afirmación y el más fuerte en contra, escritos por separado para que ninguno sea un hombre de paja. Cada argumento muestra en qué se apoya.",
    thesisWord: "La afirmación en discusión",
    restsOn: "Se apoya en",
    strongestWord: "Punto más fuerte",
    changesMind: "Qué cambiaría esta posición",
    thesisClash: "Los dos lados discuten afirmaciones distintas. Suele significar que el texto no ha dicho con claridad qué defiende.",
    modeRead: "Cómo se lee",
    seeRead: "Enséñame cómo se lee",
    readNote: "Dónde frena el lector, y cuatro juicios en escala de 1 a 5 con su motivo. La legibilidad se calcula del propio texto, así que no cambia entre ejecuciones.",
    band1: "Clara a la primera",
    band2: "El lector frena",
    band3: "El lector se detiene",
    clarity: "Claridad",
    logic: "Lógica",
    structure: "Estructura",
    evidence: "Evidencia",
    readability: "Legibilidad",
    scoresNote: "Juicios, no medidas. Ejecútalo dos veces y pueden moverse un punto.",
    wps: "palabras por frase",
    longestS: "frase más larga",
    fleschNote: "Índice Flesch, calculado a partir de la longitud de frase y palabra.",
    huertaNote: "Índice Fernández Huerta, calculado a partir de la longitud de frase y palabra.",
    arabicNote: "El árabe no tiene una fórmula de legibilidad consensuada, así que aquí no se inventa ninguna.",
    missedS: "frase(s) no se pudieron emparejar y quedan sin marcar.",
    sendReview: "Enviar a revisión",
    reviewing: "Revisando…",
    modeEdit: "Corrección",
    modeReview: "Revisión por pares",
    majorWord: "Objeciones mayores",
    minorWord: "Puntos menores",
    whereWord: "Dónde",
    fixWord: "Qué lo resolvería",
    readsAs: "Se lee como",
    copyReports: "Copiar los tres informes",
    copiedReports: "Informes copiados",
    reviewNote: "Tres revisores, tres ángulos, cada informe independiente. Revisan lo que hay en la página: no pueden comprobar que tus resultados sean ciertos, que tus citas existan ni qué ha publicado ya tu campo.",
    backDraft: "Volver al borrador",
    reviewerFailed: "No se pudo contactar con un revisor. Los demás están aquí.",
    copySentence: "Copiar esta frase",
    copiedSentence: "Frase copiada",
    keysMove: "para moverte",
    keysToggle: "para aplicar o deshacer",
    copiedLog: "Lista de cambios copiada",
    copiedClean: "Texto copiado",
    summary: "Resumen",
    before: "antes",
    after: "después",
    notes: "notas",
    muteHint: "Pulsa una categoría para ocultarla",
    applyAll: "Aplicar todo",
    undoAll: "Deshacer todo",
    nothing: "No hay nada que cambiar. El texto ya se lee con claridad.",
    undoOne: "Deshacer este cambio",
    applyOne: "Aplicar este cambio",
    dropped: (n) =>
      `${n} sugerencia${n > 1 ? "s" : ""} no coincid${
        n > 1 ? "ieron" : "ió"
      } literalmente con tu texto y se descart${n > 1 ? "aron" : "ó"}.`,
    failedBlocks: (n) =>
      `No se pud${n > 1 ? "ieron" : "o"} leer ${n} bloque${
        n > 1 ? "s" : ""
      } y qued${n > 1 ? "aron" : "ó"} sin marcar. Todo lo demás está aquí.`,
  },
};

/* ================= diff ================= */

function tokenize(s) {
  return s.match(/\s+|[^\s]+/g) || [];
}

function diffWords(a, b) {
  const A = tokenize(a);
  const B = tokenize(b);
  const n = A.length;
  const m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  const push = (type, text) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ type, text });
  };
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      push("same", A[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("del", A[i]);
      i++;
    } else {
      push("ins", B[j]);
      j++;
    }
  }
  while (i < n) push("del", A[i++]);
  while (j < m) push("ins", B[j++]);
  return out;
}

/* ================= language detection ================= */

const ES_WORDS = `de la el que en los del se las por un para con una su al es lo como mas pero sus le ya este esta entre cuando muy sin sobre tambien hasta hay donde desde todo nos durante todos uno les ni contra otros ese eso ante ellos esto antes algunos unos otro otra tanto esa estos mucho nada muchos cual poco ella estar estas algunas algo nosotros cabe destacar mediante asimismo ademas resultados metodo analisis estudio datos`.split(
  " "
);
const EN_WORDS = `the of and to in is that for it with as was on be by this are from at or an which we can has have not but been were their more than these such also however therefore results method analysis study data`.split(
  " "
);

function detectLang(text) {
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z\u00C0-\u024F]/g) || []).length;
  if (arabic === 0 && latin === 0) return "en";
  if (arabic > latin) return "ar";

  const lower = text.toLowerCase();
  const words = lower.match(/[a-z\u00C0-\u024F]+/g) || [];
  if (words.length === 0) return "en";

  let es = 0;
  let en = 0;
  const esSet = new Set(ES_WORDS);
  const enSet = new Set(EN_WORDS);
  for (const w of words) {
    if (esSet.has(w)) es++;
    if (enSet.has(w)) en++;
  }
  // Spanish-only orthography is a strong signal
  const marks = (text.match(/[ñáéíóúü¿¡]/gi) || []).length;
  es += marks * 2;

  return es > en ? "es" : "en";
}

const countWords = (s) => (s.trim().match(/\S+/g) || []).length;

/* ================= prompts ================= */

const STRENGTH = {
  en: {
    light:
      "Be conservative. Change only what clearly damages clarity. Expect to return very few edits.",
    standard: "Use normal editorial judgement.",
    thorough:
      "Be thorough. Also flag milder wordiness and repeated sentence shapes, while still leaving correct, clear sentences alone.",
  },
  ar: {
    light: "كن متحفظًا. لا تغيّر إلا ما يضر الوضوح بوضوح. توقع عددًا قليلًا جدًا من التعديلات.",
    standard: "استخدم حكمًا تحريريًا معتادًا.",
    thorough:
      "كن دقيقًا. أشر أيضًا إلى الحشو الخفيف وتكرار شكل الجمل، مع ترك الجمل الصحيحة الواضحة كما هي.",
  },
  es: {
    light:
      "Sé conservador. Cambia solo lo que perjudica claramente la claridad. Devuelve muy pocos cambios.",
    standard: "Aplica un criterio editorial normal.",
    thorough:
      "Sé exhaustivo. Señala también la verbosidad leve y las estructuras repetidas, dejando intactas las frases correctas y claras.",
  },
};

const REGISTER = {
  en: {
    keep: "Do not change the level of formality. Edit only for clarity.",
    less: `Also move the tone one step less formal, as for a research blog, a grant summary for a general reader, or a message to a colleague you know: contractions are fine, prefer plain everyday words over Latinate ones, and address the reader directly where it is natural. Never make it slangy or casual to the point of sounding unserious. Use the category "register" for these tone edits, separately from clarity edits.`,
    more: `Also move the tone one step more formal, as for a journal submission or a formal report: avoid contractions, avoid addressing the reader as "you", and prefer precise discipline vocabulary. Do not add padding, and do not reintroduce the stock phrases you are supposed to remove. Formal does not mean wordy. Use the category "register" for these tone edits, separately from clarity edits.`,
  },
  ar: {
    keep: "لا تغيّر درجة الرسمية. حرّر من أجل الوضوح فقط.",
    less: `اخفض مستوى الرسمية درجة واحدة أيضًا، كما في مدونة بحثية أو ملخص لقارئ عام أو رسالة لزميل تعرفه: استخدم مفردات عربية معاصرة مباشرة، وخاطب القارئ مباشرة حيث يكون ذلك طبيعيًا. لا تنزل إلى العامية ولا إلى ما يبدو غير جاد. استخدم الفئة "مستوى اللغة" لتعديلات النبرة، منفصلة عن تعديلات الوضوح.`,
    more: `ارفع مستوى الرسمية درجة واحدة أيضًا، كما في بحث محكَّم أو تقرير رسمي: استخدم المفردات الاصطلاحية الدقيقة، وتجنب مخاطبة القارئ مباشرة. الرسمية لا تعني الحشو، فلا تعد إدخال العبارات الإنشائية التي يفترض حذفها. استخدم الفئة "مستوى اللغة" لتعديلات النبرة، منفصلة عن تعديلات الوضوح.`,
  },
  es: {
    keep: "No cambies el nivel de formalidad. Edita solo para mejorar la claridad.",
    less: `Baja también el tono un nivel, como en un blog de investigación o un mensaje a un colega: usa palabras corrientes en vez de cultismos y dirígete al lector cuando sea natural. No lo vuelvas coloquial ni poco serio. Usa la categoría "registro" para estos cambios de tono, aparte de los cambios de claridad.`,
    more: `Sube también el tono un nivel, como en un artículo para revista o un informe formal: usa terminología precisa de la disciplina y evita dirigirte al lector de tú. Formal no significa verboso: no vuelvas a meter las frases hechas que debes quitar. Usa la categoría "registro" para estos cambios de tono, aparte de los cambios de claridad.`,
  },
};

/* What kind of text this is. Each kind has its own conventions, and
 * they override the general advice: the passive is fine in a methods
 * section, an email lives or dies on its first two sentences, a chat
 * message should not be expanded into paragraphs. */
const DOCTYPE = {
  en: {
    paper: `This is an academic paper, thesis or abstract. Keep citations, hedging and field conventions. The passive is acceptable in a methods section where the agent does not matter. Keep the vocabulary of the discipline. Do not make it chatty.`,
    report: `This is a technical or client report. Prefer the active voice and short paragraphs. State findings plainly so the reader can act on them. Leave headings, numbering, figure and table references exactly as they are.`,
    email: `This is an email. Brevity matters most: the request or the point should be visible in the first two sentences. Leave the greeting, the sign-off and all names exactly as written. Cut padding, throat-clearing and apology filler such as "I just wanted to reach out".`,
    post: `This is a blog post or a social post. Short sentences, one idea per sentence, and addressing the reader directly are all fine. Keep the opening line strong. Do not add hype, exclamation marks or emoji that were not there.`,
    chat: `This is a chat or instant message. Keep it very short and plain: one idea, no formal opening or closing, no paragraphs. Never expand it. If it is already short and clear, return an empty array.`,
  },
  ar: {
    paper: `النص ورقة أكاديمية أو رسالة علمية أو ملخص بحث. احتفظ بالاستشهادات والتحفظ العلمي وأعراف التخصص. المبني للمجهول مقبول في قسم المنهجية حين لا يهم الفاعل. لا تجعل الأسلوب دارجًا.`,
    report: `النص تقرير فني أو تقرير لعميل. فضّل الفعل المباشر والفقرات القصيرة. اعرض النتائج بوضوح ليتمكن القارئ من اتخاذ قرار. اترك العناوين والترقيم وإشارات الأشكال والجداول كما هي تمامًا.`,
    email: `النص رسالة بريد إلكتروني. الإيجاز هو الأهم: يجب أن يظهر الطلب أو المقصد في أول جملتين. اترك التحية والخاتمة وكل الأسماء كما كتبها صاحبها. احذف المقدمات الطويلة وعبارات الاعتذار الحشوية.`,
    post: `النص منشور على مدونة أو على وسائل التواصل. الجمل القصيرة وفكرة واحدة في كل جملة ومخاطبة القارئ مباشرة كلها مقبولة. أبقِ الجملة الأولى قوية. لا تضف مبالغة ولا علامات تعجب ولا رموزًا لم تكن موجودة.`,
    chat: `النص رسالة محادثة قصيرة. أبقِه قصيرًا جدًا ومباشرًا: فكرة واحدة، بلا تحية رسمية ولا خاتمة ولا فقرات. لا توسّعه أبدًا. إن كان قصيرًا وواضحًا بالفعل، أعد مصفوفة فارغة.`,
  },
  es: {
    paper: `Es un artículo académico, una tesis o un resumen. Conserva las citas, los matices y las convenciones del área. La pasiva refleja es aceptable en la sección de métodos cuando el agente no importa. No lo vuelvas coloquial.`,
    report: `Es un informe técnico o para un cliente. Prefiere la voz activa y los párrafos cortos. Expón los resultados con claridad para que el lector pueda decidir. Deja los títulos, la numeración y las referencias a figuras y tablas tal como están.`,
    email: `Es un correo electrónico. Lo que más importa es la brevedad: la petición o el punto principal debe verse en las dos primeras frases. Deja el saludo, la despedida y todos los nombres tal como están. Elimina los rodeos y las disculpas de relleno.`,
    post: `Es una entrada de blog o una publicación en redes. Las frases cortas, una idea por frase y dirigirse al lector están bien. Mantén fuerte la primera línea. No añadas exageración, signos de exclamación ni emojis que no estuvieran.`,
    chat: `Es un mensaje de chat. Mantenlo muy corto y directo: una idea, sin saludo ni despedida formales, sin párrafos. No lo alargues nunca. Si ya es corto y claro, devuelve un array vacío.`,
  },
};

/* Who is going to read it. This is a different question from what kind
 * of text it is: the same report goes to a specialist and to a client,
 * and only the second one needs the jargon unpacked. */
const AUDIENCE = {
  en: {
    specialists: `The readers are specialists in the same field. Keep the discipline's vocabulary and do not explain standard terms. Precision beats accessibility here.`,
    adjacent: `The readers are researchers or engineers from other fields. Keep technical terms but make sure each one is usable from context on first appearance. Do not water down the content.`,
    general: `The readers are not specialists. Prefer everyday words, keep sentences short and one idea long, and explain a technical term the first time it appears. Never drop a qualification just to make a sentence read easily.`,
    client: `The reader is a client or a manager deciding something. Put the finding and what it means for them before the method. Cut procedural detail that does not change the decision. No jargon without a plain gloss.`,
  },
  ar: {
    specialists: `القراء متخصصون في المجال نفسه. احتفظ بمصطلحات التخصص ولا تشرح المصطلحات المعروفة. الدقة هنا أهم من السهولة.`,
    adjacent: `القراء باحثون أو مهندسون من تخصصات أخرى. احتفظ بالمصطلحات التقنية مع جعل كل مصطلح مفهومًا من السياق عند أول ذكر. لا تخفف المحتوى.`,
    general: `القراء غير متخصصين. فضّل الكلمات المتداولة، وأبقِ الجمل قصيرة بفكرة واحدة، واشرح المصطلح التقني عند أول ظهور. لا تحذف أي تحفظ علمي لمجرد تسهيل الجملة.`,
    client: `القارئ عميل أو مسؤول يتخذ قرارًا. ضع النتيجة ومعناها بالنسبة له قبل المنهج. احذف التفاصيل الإجرائية التي لا تغيّر القرار. لا مصطلح من غير شرح مبسط.`,
  },
  es: {
    specialists: `Los lectores son especialistas del mismo campo. Conserva el vocabulario de la disciplina y no expliques los términos estándar. Aquí la precisión importa más que la accesibilidad.`,
    adjacent: `Los lectores son investigadores o ingenieros de otros campos. Conserva los términos técnicos, pero que cada uno se entienda por el contexto la primera vez. No rebajes el contenido.`,
    general: `Los lectores no son especialistas. Prefiere palabras corrientes, frases cortas de una sola idea, y explica cada término técnico la primera vez. No elimines nunca un matiz solo para que la frase se lea mejor.`,
    client: `El lector es un cliente o un responsable que debe decidir. Pon el resultado y lo que significa para él antes del método. Quita el detalle de procedimiento que no cambia la decisión. Ningún tecnicismo sin una glosa sencilla.`,
  },
};

const AUD_LABELS = {
  en: {
    specialists: "Specialists",
    adjacent: "Other fields",
    general: "General reader",
    client: "Client",
  },
  ar: {
    specialists: "متخصصون",
    adjacent: "تخصصات أخرى",
    general: "قارئ عام",
    client: "عميل",
  },
  es: {
    specialists: "Especialistas",
    adjacent: "Otras áreas",
    general: "Público general",
    client: "Cliente",
  },
};

const AUD_HINTS = {
  specialists: "Discipline vocabulary stays. Nothing is explained down.",
  adjacent: "Terms stay, but each one has to be usable from context.",
  general: "Everyday words and short sentences. Qualifications are still kept.",
  client: "The finding first, the method second. No jargon without a gloss.",
};

const DOC_HINTS = {
  paper: "Citations, hedging and field conventions are left alone.",
  report: "Active voice and short paragraphs; headings and figure references untouched.",
  email: "The point has to land in the first two sentences. Greeting and sign-off untouched.",
  post: "Short sentences and direct address are fine. No hype added.",
  chat: "Kept very short. Never expanded into paragraphs.",
};

const DOC_LABELS = {
  en: { paper: "Paper", report: "Report", email: "Email", post: "Post", chat: "Chat" },
  ar: { paper: "ورقة", report: "تقرير", email: "إيميل", post: "منشور", chat: "محادثة" },
  es: { paper: "Artículo", report: "Informe", email: "Correo", post: "Publicación", chat: "Chat" },
};

/* ================= what it remembers about you =================
 *
 * This is not training and it is not a model that gets better on its
 * own. It is a record of the decisions you have already made, fed back
 * to the editor with the next passage:
 *
 *   - categories you keep rejecting, so it stops flagging them
 *   - exact phrases you have restored, so it leaves them alone
 *   - words you have listed as off limits
 *
 * It lives in this browser only, you can read all of it in the panel,
 * and Forget everything wipes it.
 */
const MEM_KEY = "plainer:profile";
const EMPTY_LANG = { accepted: {}, rejected: {}, restored: [] };

/* Kept per language. The categories have different names in each one,
 * and a phrase you chose to keep in Arabic says nothing about your
 * English. Mixing them would feed an English prompt Arabic category
 * names and Arabic sentences. Terms to leave alone are shared, because
 * a product name is a product name in any language. */
const EMPTY_MEM = {
  en: { ...EMPTY_LANG },
  ar: { ...EMPTY_LANG },
  es: { ...EMPTY_LANG },
  terms: [],
  history: [],
};

function blankMem() {
  return {
    en: { accepted: {}, rejected: {}, restored: [] },
    ar: { accepted: {}, rejected: {}, restored: [] },
    es: { accepted: {}, rejected: {}, restored: [] },
    terms: [],
    history: [],
  };
}

/* One row per passage you mark up. Only things that can be counted or
 * computed go in here. There is deliberately no stored "clarity score":
 * a judgement taken in March and another taken in September, on two
 * different pieces of writing, do not make a trend line.
 *
 *   flagged   how many things the editor objected to
 *   kept      how many of those you agreed with
 *   read      readability, computed from the text, not asked of a model
 */
const HISTORY_CAP = 300;

function pushHistory(mem, row) {
  const h = [...(mem.history || []), row];
  return { ...mem, history: h.slice(-HISTORY_CAP) };
}

/* Flagged problems per 100 words, which is the one honest improvement
 * curve available here: the same instrument applied to every passage,
 * counting rather than judging. It still moves with what you write - a
 * hard paper will flag more than a short email - so the dashboard says
 * so rather than pretending the number is clean. */
function per100(row) {
  return row.words > 0 ? (row.flagged / row.words) * 100 : 0;
}

function trendOf(rows) {
  if (rows.length < 6) return null; // below this it is noise, not a trend
  const cut = Math.floor(rows.length / 3);
  const early = rows.slice(0, cut);
  const late = rows.slice(-cut);
  const avg = (xs) => xs.reduce((a, b) => a + per100(b), 0) / xs.length;
  return { from: avg(early), to: avg(late), n: rows.length };
}

function normaliseMem(raw) {
  const m = blankMem();
  if (!raw || typeof raw !== "object") return m;
  m.terms = Array.isArray(raw.terms) ? raw.terms : [];
  m.history = Array.isArray(raw.history)
    ? raw.history.filter((r) => r && typeof r.words === "number").slice(-HISTORY_CAP)
    : [];
  // an older flat profile: keep the terms, drop the rest rather than
  // guess which language it came from
  for (const lg of ["en", "ar", "es"]) {
    const src = raw[lg];
    if (src && typeof src === "object") {
      m[lg].accepted = src.accepted || {};
      m[lg].rejected = src.rejected || {};
      m[lg].restored = Array.isArray(src.restored) ? src.restored : [];
    }
  }
  return m;
}

async function loadMemory() {
  try {
    const r = await window.storage.get(MEM_KEY);
    if (!r) return blankMem();
    return normaliseMem(JSON.parse(r.value));
  } catch {
    return blankMem();
  }
}

async function saveMemory(m) {
  try {
    await window.storage.set(MEM_KEY, JSON.stringify(m));
  } catch {
    /* memory is a convenience; the editor works without it */
  }
}

/* Categories the author rejects more often than accepts, seen enough
 * times that it is a pattern and not one bad suggestion. */
function tiredCategories(mem, lang) {
  const slice = (mem && mem[lang]) || EMPTY_LANG;
  return Object.keys(slice.rejected || {}).filter((c) => {
    const r = slice.rejected[c] || 0;
    const a = (slice.accepted || {})[c] || 0;
    return r >= 3 && r > a;
  });
}

function restoredFor(mem, lang) {
  return ((mem && mem[lang] && mem[lang].restored) || []).slice(-12);
}

function memHasContent(m) {
  if (!m) return false;
  if ((m.terms || []).length > 0) return true;
  return ["en", "ar", "es"].some(
    (lg) => tiredCategories(m, lg).length > 0 || (m[lg]?.restored || []).length > 0
  );
}

const MEM_PREFACE = {
  en: (tired, restored) => {
    const bits = [];
    if (tired.length)
      bits.push(
        `This author has repeatedly rejected changes of these kinds: ${tired.join(
          ", "
        )}. Flag those only when the problem is severe.`
      );
    if (restored.length)
      bits.push(
        `This author has deliberately kept the following wording before. Leave it alone: ${restored
          .map((r) => `"${r}"`)
          .join("; ")}`
      );
    return bits.length ? `\nWhat you already know about this author:\n- ${bits.join("\n- ")}` : "";
  },
  ar: (tired, restored) => {
    const bits = [];
    if (tired.length)
      bits.push(`رفض هذا الكاتب مرارًا تعديلات من هذه الفئات: ${tired.join("، ")}. لا تشر إليها إلا إذا كان الخلل جسيمًا.`);
    if (restored.length)
      bits.push(`أبقى هذا الكاتب عمدًا على هذه الصياغات من قبل، فاتركها كما هي: ${restored.map((r) => `"${r}"`).join("؛ ")}`);
    return bits.length ? `\nما تعرفه بالفعل عن هذا الكاتب:\n- ${bits.join("\n- ")}` : "";
  },
  es: (tired, restored) => {
    const bits = [];
    if (tired.length)
      bits.push(
        `Este autor ha rechazado repetidamente cambios de estos tipos: ${tired.join(
          ", "
        )}. Señálalos solo si el problema es grave.`
      );
    if (restored.length)
      bits.push(
        `Este autor ha mantenido a propósito estas formulaciones. Déjalas tal cual: ${restored
          .map((r) => `"${r}"`)
          .join("; ")}`
      );
    return bits.length ? `\nLo que ya sabes de este autor:\n- ${bits.join("\n- ")}` : "";
  },
};

const SHARED_RULES = {
  en: (terms) => `
Rules that always apply:
- Do not add information. Do not remove information.
- Never change the strength of a claim: a hedged claim stays hedged, a definite claim stays definite.
- Leave technical terms, variable names, units, equations, citations and numbers exactly as they are.
- Leave sentences that are already clear. Most sentences in decent prose need no change.
- You are editing for the reader. Never try to change how any AI-detection tool would classify the text; that is not what this tool is for.
${terms ? `- Never alter these terms in any way: ${terms}` : ""}`,
  ar: (terms) => `
قواعد ثابتة:
- لا تضف معلومة ولا تحذف معلومة.
- لا تغيّر قوة الادعاء أبدًا: ما كان متحفظًا يبقى متحفظًا، وما كان مؤكدًا يبقى مؤكدًا.
- اترك المصطلحات التقنية وأسماء المتغيرات والوحدات والمعادلات والاستشهادات والأرقام كما هي تمامًا.
- اترك الجمل الواضحة كما هي. أغلب الجمل في نص جيد لا تحتاج تغييرًا.
- أنت تحرر من أجل القارئ. لا تحاول أبدًا تغيير تصنيف أي أداة كشف للذكاء الاصطناعي؛ ليس هذا غرض الأداة.
${terms ? `- لا تغيّر هذه المصطلحات بأي شكل: ${terms}` : ""}`,
  es: (terms) => `
Reglas que siempre se aplican:
- No añadas información. No quites información.
- No cambies nunca la fuerza de una afirmación: lo matizado sigue matizado, lo rotundo sigue rotundo.
- Deja intactos los términos técnicos, nombres de variables, unidades, ecuaciones, citas y números.
- Deja las frases que ya están claras. La mayoría de las frases de un texto decente no necesitan cambios.
- Editas para el lector. No intentes nunca cambiar cómo clasificaría el texto un detector de IA; esa no es la función de esta herramienta.
${terms ? `- No modifiques nunca estos términos: ${terms}` : ""}`,
};

const JSON_SPEC = `
Return ONLY a JSON array, no prose and no markdown fences. Each element:
{"original":"<the sentence exactly as it appears in the input, character for character>",
 "revised":"<your edited sentence>",
 "category":"<one of the categories listed above>",
 "reason":"<one short sentence on what the change does for the reader>"}
If nothing needs changing, return [].`;

function systemPrompt(lang, docType, audience, strength, register, terms, mem) {
  const cats = Object.keys(CATS[lang]).join(lang === "ar" ? "، " : ", ");
  const recall = mem
    ? MEM_PREFACE[lang](tiredCategories(mem, lang), restoredFor(mem, lang))
    : "";
  const tail = `
${DOCTYPE[lang][docType]}
${AUDIENCE[lang][audience]}
${SHARED_RULES[lang](terms)}
${STRENGTH[lang][strength]}
${REGISTER[lang][register]}
${recall}
${JSON_SPEC}`;

  if (lang === "ar") {
    return `أنت محرر لغوي للنصوص العربية الأكاديمية والتقنية. مهمتك أن تجعل النص أوضح وأسهل قراءة مع الحفاظ على المعنى وصوت الكاتب.

ابحث عن:
- الحشو: "من الجدير بالذكر"، "لا بد من الإشارة إلى"، "في هذا الصدد"، "وذلك"
- الترجمة الحرفية عن الإنجليزية: الإفراط في "من خلال"، "في ضوء"، "حيث أن"، "فيما يتعلق بـ"
- الإفراط في "تم" والمبني للمجهول حيث الفاعل معروف: "تم إجراء التجربة" تصير "أجرينا التجربة"
- "قام بـ + مصدر" بدل الفعل المباشر: "قام بالقياس" تصير "قاس"
- الجمل الطويلة المتصلة بالواو التي يصعب تتبعها
- سلاسل الإضافات الطويلة: "تحليل نتائج قياسات تجارب المجموعة"
- التكرار: المعنى نفسه مرتين بألفاظ مختلفة
- الترقيم الذي يغيّر قراءة الجملة

الفئة (category) يجب أن تكون واحدة من: ${cats}
اكتب سبب التعديل (reason) بالعربية، في جملة واحدة قصيرة.

اترك كما هو: التشكيل إن وُجد، والأسلوب الصحيح حتى لو كان طويلًا إذا كان التقليد العلمي يقتضيه.
${tail}`;
  }

  if (lang === "es") {
    return `Eres corrector de estilo de textos académicos y técnicos en español. Tu trabajo es hacer la prosa más clara y sencilla conservando el significado y la voz del autor.

Busca y corrige:
- frases hechas sin contenido: "cabe destacar que", "es importante señalar que", "en el marco de"
- verbosidad con equivalente más corto: "con el objeto de" -> "para", "proceder a realizar" -> "realizar"
- nominalizaciones: "realizar un análisis de" -> "analizar"
- pasiva perifrástica calcada del inglés ("fue realizado por el equipo") cuando la activa o la pasiva refleja ("el equipo realizó", "se realizó") se lee mejor
- intensificadores vacíos: "muy", "sumamente", "claramente", "significativamente" sin medida detrás
- gerundio de posterioridad o mal empleado: "siendo además más preciso"
- oraciones largas con subordinadas encadenadas
- dequeísmo y queísmo
- anglicismos innecesarios cuando existe un término español corriente
- redundancias: la misma idea dos veces

La categoría (category) debe ser una de: ${cats}
Escribe el motivo (reason) en español, en una sola frase corta.

Deja como está: las convenciones del área que son correctas aunque resulten largas, como la pasiva refleja en la sección de métodos cuando el agente no importa.
${tail}`;
  }

  return `You are a copy editor for academic and technical English. Your job is to make prose clearer and simpler while keeping the author's meaning and voice.

Look for and fix:
- stock phrases that carry no information ("it is important to note that", "it should be emphasized")
- wordy constructions with shorter equivalents ("due to the fact that" -> "because", "in order to" -> "to")
- nominalizations ("performed an analysis of" -> "analysed")
- passive voice where an active sentence is clearer and the agent is known
- empty intensifiers ("very", "significantly", "substantially", "clearly") that add no measurement
- hedging stacked on hedging ("it may possibly suggest that")
- the "not only X but also Y" and "not X, but Y" patterns when a plain sentence is clearer
- long noun chains that are hard to parse
- runs of sentences that all have the same shape
- redundant pairs ("each and every", "first and foremost")

The category must be one of: ${cats}

Also leave alone: British or American spelling as the author wrote it, and field conventions that are correct even if wordy, such as the passive in a methods section where the agent genuinely does not matter.
${tail}`;
}

async function askOnce(text, lang, docType, audience, strength, register, terms, mem, signal) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: systemPrompt(lang, docType, audience, strength, register, terms, mem),
      messages: [{ role: "user", content: text }],
    }),
  });
  if (!res.ok) throw new Error(`The editor did not respond (${res.status}).`);
  const data = await res.json();
  const raw = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .replace(/```json|```/g, "")
    .trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("unreadable");
  const parsed = JSON.parse(raw.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("unreadable");
  return parsed;
}

/* The reply is occasionally prose instead of JSON, or JSON cut off at
 * the token limit. One retry clears almost all of those, and costs a
 * second or two rather than the whole run. A cancelled request is
 * passed straight through so the Stop button stays instant. */
async function requestEdits(text, lang, docType, audience, strength, register, terms, mem, signal) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await askOnce(text, lang, docType, audience, strength, register, terms, mem, signal);
    } catch (err) {
      if (err.name === "AbortError") throw err;
      if (attempt === 1) throw err;
    }
  }
  return [];
}

/* ================= chunking =================
 *
 * One request per passage does not survive a whole section: the reply
 * is truncated and every edit after the cut is lost. So the source is
 * split on blank lines, each block is sent on its own, and the pieces
 * are stitched back together by absolute position. Blocks are merged
 * until they reach CHUNK_TARGET words, so a page of short paragraphs
 * does not turn into twenty requests.
 */
const CHUNK_TARGET = 220;

function splitChunks(source) {
  const out = [];
  const re = /\n\s*\n/g;
  let last = 0;
  let m;
  const blocks = [];
  while ((m = re.exec(source)) !== null) {
    blocks.push({ text: source.slice(last, m.index), start: last });
    last = m.index + m[0].length;
  }
  blocks.push({ text: source.slice(last), start: last });

  let cur = null;
  for (const b of blocks) {
    if (!b.text.trim()) continue;
    if (cur && countWords(cur.text) + countWords(b.text) <= CHUNK_TARGET) {
      cur.text = source.slice(cur.start, b.start + b.text.length);
    } else {
      if (cur) out.push(cur);
      cur = { text: b.text, start: b.start };
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [{ text: source, start: 0 }];
}

/* ================= build the marked-up document ================= */

/* edits arrive as [{chunk, list}]; each original is located inside its
 * own chunk and then shifted to an absolute offset, so a sentence that
 * appears twice in the document is never attached to the wrong copy. */
function buildSegments(source, groups) {
  const found = [];
  let unmatched = 0;
  const flat = [];
  groups.forEach((g) => {
    (g.list || []).forEach((e) => flat.push({ e, chunk: g.chunk }));
  });
  flat.forEach(({ e, chunk }) => {
    if (!e || typeof e.original !== "string" || typeof e.revised !== "string") return;
    if (e.original === e.revised) return;
    const rel = chunk.text.indexOf(e.original);
    if (rel === -1) {
      unmatched++;
      return;
    }
    const at = chunk.start + rel;
    found.push({ ...e, at, end: at + e.original.length });
  });
  found.sort((a, b) => a.at - b.at);

  const kept = [];
  let cursor = 0;
  for (const f of found) {
    if (f.at < cursor) continue;
    kept.push(f);
    cursor = f.end;
  }

  const segs = [];
  let pos = 0;
  kept.forEach((f, n) => {
    if (f.at > pos) segs.push({ kind: "plain", text: source.slice(pos, f.at) });
    segs.push({ kind: "edit", num: n + 1, ...f, parts: diffWords(f.original, f.revised) });
    pos = f.end;
  });
  if (pos < source.length) segs.push({ kind: "plain", text: source.slice(pos) });
  return { segs, unmatched };
}

/* ================= explain one edit =================
 *
 * Asked only when you ask for it, one note at a time, and cached so a
 * second look costs nothing.
 *
 * The field that earns this feature is "when_not": the case where the
 * edit is the wrong call. A tool that only ever justifies its own
 * suggestions teaches you to accept them; one that names its own
 * exceptions teaches you to judge.
 */
const EXPLAIN_PROMPT = {
  en: `A writer has been shown one edit to one sentence and wants to understand it, not just take it. Teach the principle behind it so they can apply it themselves next time.

Be concrete and short. No encouragement, no restating the sentence back at them.

Return ONLY JSON, no prose and no fences:
{"what":"<what actually changed, in plain terms, one sentence>",
 "why":"<the principle behind it and what it does for the reader, two sentences at most>",
 "alternative":"<a different way of fixing the same problem, given as the rewritten sentence>",
 "when_not":"<a real case where this edit would be the wrong call, and why. If the edit is nearly always right, say what narrow case is the exception rather than claiming there is none>",
 "example":"<a different short sentence with the same problem, then its fix, in the form: before -> after>"}`,
  ar: `عُرض على كاتب تعديل واحد في جملة واحدة، وهو يريد أن يفهمه لا أن يأخذه فحسب. علّمه المبدأ وراءه ليطبقه بنفسه في المرة القادمة.

كن محددًا وموجزًا. بلا تشجيع وبلا إعادة الجملة عليه.

أعد JSON فقط، بلا نثر وبلا أسوار:
{"what":"<ما الذي تغيّر فعلًا، بعبارة بسيطة، في جملة>",
 "why":"<المبدأ وراءه وما يفعله للقارئ، في جملتين على الأكثر>",
 "alternative":"<طريقة أخرى لعلاج المشكلة نفسها، مكتوبة كجملة بديلة>",
 "when_not":"<حالة حقيقية يكون فيها هذا التعديل خطأ، ولماذا. وإن كان التعديل صحيحًا في الغالب الأعم، فاذكر الحالة الضيقة التي تستثنى بدل ادعاء أنه لا استثناء>",
 "example":"<جملة قصيرة مختلفة بها المشكلة نفسها، ثم علاجها، بالصيغة: قبل -> بعد>"}`,
  es: `A un escritor se le ha mostrado un cambio en una frase y quiere entenderlo, no solo aceptarlo. Enséñale el principio que hay detrás para que pueda aplicarlo él mismo la próxima vez.

Sé concreto y breve. Sin ánimos y sin repetirle la frase.

Devuelve SOLO JSON, sin prosa ni vallas:
{"what":"<qué cambió realmente, en términos llanos, una frase>",
 "why":"<el principio detrás y qué hace por el lector, dos frases como mucho>",
 "alternative":"<otra manera de resolver el mismo problema, dada como la frase reescrita>",
 "when_not":"<un caso real donde este cambio sería un error, y por qué. Si el cambio casi siempre acierta, di cuál es la excepción estrecha en vez de afirmar que no hay ninguna>",
 "example":"<otra frase corta con el mismo problema, y su arreglo, con la forma: antes -> después>"}`,
};

async function askExplain(note, lang, signal) {
  const body = `${lang === "ar" ? "الجملة الأصلية" : lang === "es" ? "Frase original" : "Original"}: ${note.original}
${lang === "ar" ? "الجملة المعدّلة" : lang === "es" ? "Frase editada" : "Edited"}: ${note.revised}
${lang === "ar" ? "الفئة" : lang === "es" ? "Categoría" : "Category"}: ${note.category}
${lang === "ar" ? "السبب المعطى" : lang === "es" ? "Motivo dado" : "Reason given"}: ${note.reason}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      system: EXPLAIN_PROMPT[lang],
      messages: [{ role: "user", content: body }],
    }),
  });
  if (!res.ok) throw new Error(`No response (${res.status}).`);
  const data = await res.json();
  const raw = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .replace(/```json|```/g, "")
    .trim();
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("unreadable");
  const parsed = JSON.parse(raw.slice(a, b + 1));
  const str = (v) => (typeof v === "string" ? v : "");
  return {
    what: str(parsed.what),
    why: str(parsed.why),
    alternative: str(parsed.alternative),
    when_not: str(parsed.when_not),
    example: str(parsed.example),
  };
}

async function requestExplain(note, lang, signal) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await askExplain(note, lang, signal);
    } catch (err) {
      if (err.name === "AbortError") throw err;
      if (attempt === 1) throw err;
    }
  }
  return null;
}

/* ================= claims and logic =================
 *
 * Three questions that the copy editor cannot answer, asked in one
 * pass because they need the whole passage at once:
 *
 *   what kind of statement is each sentence
 *   which claims are asserted with nothing behind them
 *   does the passage contradict itself
 *
 * The contradiction check is the reason this is not chunked. A claim
 * made in the first paragraph and undone in the last is exactly the
 * failure worth catching, and splitting the text would hide it.
 */
const KINDS = ["fact", "opinion", "assumption", "conclusion"];

const KIND_COLOR = {
  fact: "#D6E4EF",
  opinion: "#F5EAC8",
  assumption: "#E6DCEF",
  conclusion: "#DDEAE2",
};
const KIND_EDGE = {
  fact: "#2C5D80",
  opinion: "#9A6B15",
  assumption: "#6B4E8F",
  conclusion: "#15645A",
};

const KIND_LABELS = {
  en: {
    fact: "Fact",
    opinion: "Opinion",
    assumption: "Assumption",
    conclusion: "Conclusion",
  },
  ar: { fact: "واقعة", opinion: "رأي", assumption: "افتراض", conclusion: "استنتاج" },
  es: { fact: "Hecho", opinion: "Opinión", assumption: "Supuesto", conclusion: "Conclusión" },
};

const EV_LABELS = {
  en: { none: "No source given", weak: "Source does not carry it", ok: "" },
  ar: { none: "بلا مرجع", weak: "المرجع لا يحمل الادعاء", ok: "" },
  es: { none: "Sin fuente", weak: "La fuente no lo sostiene", ok: "" },
};

const CLAIM_PROMPT = {
  en: `Read the passage as an analyst, not an editor. Do three things.

1. Classify every sentence that makes a statement:
   fact - something presented as the case, checkable in principle
   opinion - a judgement, preference or evaluation
   assumption - taken as given, used but never argued for
   conclusion - drawn from something else in the passage
   Sentences that are transitions, definitions or questions get kind "none".

2. For each fact or conclusion, say what stands behind it:
   "ok" - supported here, by a citation, a number, or a result shown in the passage
   "weak" - a source or number is offered but does not actually carry the weight of the claim
   "none" - asserted with nothing behind it in this passage
   Opinions and assumptions do not need evidence: give them "ok".

3. Find contradictions: places where the passage says one thing and later says something that cannot be true at the same time, or where a conclusion does not follow from what was established. Quote both sides. If there are none, return an empty list. Do not manufacture one.

Judge only against this passage. A claim supported by a paper you know but not cited here is "none": you are checking what the reader is given.

Return ONLY JSON, no prose and no fences:
{"sentences":[{"text":"<the sentence exactly as it appears>","kind":"fact","evidence":"ok","note":"<only when evidence is weak or none: one short sentence on what is missing>"}],
 "contradictions":[{"first":"<exact sentence>","second":"<exact sentence>","why":"<one or two sentences>"}]}
Copy every sentence character for character.`,
  ar: `اقرأ المقطع كمحلل لا كمحرر. افعل ثلاثة أشياء.

1. صنّف كل جملة تقرر شيئًا:
   fact - أمر يُعرض على أنه واقع، قابل للتحقق مبدئيًا
   opinion - حكم أو تفضيل أو تقييم
   assumption - مأخوذ كمسلَّمة، يُستعمل ولا يُحاجج عنه
   conclusion - مستخلص من شيء آخر في المقطع
   الجمل الانتقالية والتعريفات والأسئلة تأخذ kind قيمته "none".

2. لكل fact أو conclusion، قل ما الذي يسنده:
   "ok" - مسنود هنا، باستشهاد أو رقم أو نتيجة معروضة في المقطع
   "weak" - يُعرض مرجع أو رقم لكنه لا يحمل ثقل الادعاء
   "none" - مقرَّر بلا شيء خلفه في هذا المقطع
   الآراء والافتراضات لا تحتاج أدلة: أعطها "ok".

3. ابحث عن التناقضات: مواضع يقول فيها المقطع شيئًا ثم يقول لاحقًا ما لا يصح معه في آن واحد، أو استنتاج لا يتبع مما أُثبت. اقتبس الطرفين. إن لم توجد، أعد قائمة فارغة، ولا تصطنع واحدًا.

احكم بالمقطع وحده. الادعاء المسنود ببحث تعرفه لكنه غير مذكور هنا يُعد "none": أنت تفحص ما يُعطى للقارئ.

أعد JSON فقط، بلا نثر وبلا أسوار:
{"sentences":[{"text":"<الجملة كما وردت حرفيًا>","kind":"fact","evidence":"ok","note":"<فقط حين يكون الدليل weak أو none: جملة قصيرة عمّا ينقص>"}],
 "contradictions":[{"first":"<الجملة حرفيًا>","second":"<الجملة حرفيًا>","why":"<جملة أو جملتان>"}]}
انسخ كل جملة حرفًا بحرف.`,
  es: `Lee el texto como analista, no como corrector. Haz tres cosas.

1. Clasifica cada frase que afirme algo:
   fact - algo presentado como un hecho, comprobable en principio
   opinion - un juicio, preferencia o valoración
   assumption - algo que se da por sentado, se usa pero nunca se argumenta
   conclusion - derivado de algo más del texto
   Las frases de transición, las definiciones y las preguntas llevan kind "none".

2. Para cada fact o conclusion, di qué lo respalda:
   "ok" - respaldado aquí, por una cita, una cifra o un resultado mostrado en el texto
   "weak" - se ofrece una fuente o cifra que no sostiene el peso de la afirmación
   "none" - afirmado sin nada detrás en este texto
   Las opiniones y los supuestos no necesitan evidencia: dales "ok".

3. Busca contradicciones: lugares donde el texto dice una cosa y más adelante dice algo que no puede ser cierto a la vez, o donde una conclusión no se sigue de lo establecido. Cita ambos lados. Si no hay ninguna, devuelve una lista vacía. No fabriques una.

Juzga solo con este texto. Una afirmación respaldada por un trabajo que conoces pero que no se cita aquí es "none": compruebas lo que se le da al lector.

Devuelve SOLO JSON, sin prosa ni vallas:
{"sentences":[{"text":"<la frase exactamente como aparece>","kind":"fact","evidence":"ok","note":"<solo si evidence es weak o none: una frase corta sobre qué falta>"}],
 "contradictions":[{"first":"<frase exacta>","second":"<frase exacta>","why":"<una o dos frases>"}]}
Copia cada frase carácter por carácter.`,
};

async function askClaims(text, lang, docType, audience, signal) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: `${CLAIM_PROMPT[lang]}\n\n${DOCTYPE[lang][docType]}\n${AUDIENCE[lang][audience]}`,
      messages: [{ role: "user", content: text }],
    }),
  });
  if (!res.ok) throw new Error(`No response (${res.status}).`);
  const data = await res.json();
  const raw = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .replace(/```json|```/g, "")
    .trim();
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("unreadable");
  const parsed = JSON.parse(raw.slice(a, b + 1));
  return {
    sentences: Array.isArray(parsed.sentences) ? parsed.sentences : [],
    contradictions: Array.isArray(parsed.contradictions)
      ? parsed.contradictions.filter((c) => c && c.first && c.second)
      : [],
  };
}

async function requestClaims(text, lang, docType, audience, signal) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await askClaims(text, lang, docType, audience, signal);
    } catch (err) {
      if (err.name === "AbortError") throw err;
      if (attempt === 1) throw err;
    }
  }
  return null;
}

/* Same rule as everywhere else: a sentence that is not in the source
 * character for character is dropped rather than guessed onto a
 * neighbour. A contradiction whose two halves cannot both be located
 * is dropped too, because an unplaceable contradiction cannot be
 * checked by the person reading it. */
function buildClaims(source, sentences, contradictions) {
  const found = [];
  let missed = 0;
  sentences.forEach((s) => {
    if (!s || typeof s.text !== "string") return;
    const at = source.indexOf(s.text);
    if (at === -1) {
      missed++;
      return;
    }
    const kind = KINDS.includes(s.kind) ? s.kind : "none";
    const evidence = ["ok", "weak", "none"].includes(s.evidence) ? s.evidence : "ok";
    found.push({
      at,
      end: at + s.text.length,
      kind,
      evidence: kind === "fact" || kind === "conclusion" ? evidence : "ok",
      note: s.note || "",
      text: s.text,
    });
  });
  found.sort((a, b) => a.at - b.at);
  const kept = [];
  let cur = 0;
  for (const f of found) {
    if (f.at < cur) continue;
    kept.push(f);
    cur = f.end;
  }
  const segs = [];
  let pos = 0;
  kept.forEach((f, i) => {
    if (f.at > pos) segs.push({ type: "plain", text: source.slice(pos, f.at) });
    // "type" is the segment, "kind" is the classification: they were the
    // same field once and the spread quietly overwrote the segment name.
    segs.push({ ...f, type: "claim", num: i + 1 });
    pos = f.end;
  });
  if (pos < source.length) segs.push({ type: "plain", text: source.slice(pos) });

  const clashes = contradictions
    .map((c) => ({
      ...c,
      firstAt: source.indexOf(c.first),
      secondAt: source.indexOf(c.second),
    }))
    .filter((c) => c.firstAt !== -1 && c.secondAt !== -1);

  const counts = { fact: 0, opinion: 0, assumption: 0, conclusion: 0 };
  const unsupported = [];
  kept.forEach((f) => {
    if (counts[f.kind] !== undefined) counts[f.kind]++;
    if (f.evidence !== "ok") unsupported.push(f);
  });

  return { segs, missed, clashes, counts, unsupported };
}

/* ================= debate =================
 *
 * The for and against cases are two separate requests, for the same
 * reason the three referees are: one request asked for both sides
 * writes a strong case and then a straw man to knock down.
 *
 * Each side names the claim it is arguing about before arguing. If the
 * two sides name different claims, that disagreement is the most useful
 * thing on the screen: the passage has not said plainly what it argues.
 *
 * Each argument carries what it rests on, and each side says what would
 * change its mind. An argument whose hidden assumption is visible is
 * one you can actually test.
 */
const SIDES = ["for", "against"];

const SIDE_LABELS = {
  en: { for: "The case for", against: "The case against" },
  ar: { for: "الحجة المؤيدة", against: "الحجة المعارضة" },
  es: { for: "A favor", against: "En contra" },
};

const DEBATE_BRIEF = {
  en: {
    for: `Make the strongest honest case FOR the central claim of this passage. Argue it as its most capable defender would: take the claim at its best, use the strongest reasons available, and do not pad with reasons you do not believe carry weight.`,
    against: `Make the strongest honest case AGAINST the central claim of this passage. Argue it as its most capable critic would. This must be a real opponent, not a straw man: attack the claim at its strongest reading, not a weaker version you have substituted for it. If the strongest objection is about scope rather than truth, say so.`,
  },
  ar: {
    for: `اصنع أقوى حجة أمينة مؤيدة للادعاء المركزي في هذا المقطع. جادل عنه كما يفعل أقدر المدافعين عنه: خذ الادعاء في أفضل صوره، واستخدم أقوى الأسباب المتاحة، ولا تحشُ بأسباب لا ترى أن لها وزنًا.`,
    against: `اصنع أقوى حجة أمينة معارضة للادعاء المركزي في هذا المقطع. جادل كما يفعل أقدر الناقدين. يجب أن يكون خصمًا حقيقيًا لا خصمًا من قش: هاجم الادعاء في أقوى قراءاته، لا في نسخة أضعف وضعتها مكانه. وإن كان أقوى اعتراض يتعلق بنطاق الادعاء لا بصحته، فقل ذلك.`,
  },
  es: {
    for: `Construye el caso honesto más fuerte A FAVOR de la afirmación central del texto. Defiéndela como lo haría su defensor más capaz: tómala en su mejor versión, usa las razones más fuertes disponibles y no rellenes con razones que no creas que pesan.`,
    against: `Construye el caso honesto más fuerte EN CONTRA de la afirmación central del texto. Argumenta como lo haría su crítico más capaz. Tiene que ser un oponente real, no un hombre de paja: ataca la afirmación en su lectura más fuerte, no en una versión más débil que hayas puesto en su lugar. Si la objeción más fuerte es sobre el alcance y no sobre la verdad, dilo.`,
  },
};

const DEBATE_FORMAT = {
  en: `Ground every argument in what the passage actually says. Do not invent findings, studies or numbers. Where an argument depends on something the passage does not establish, put that in "rests_on" rather than asserting it.

Return ONLY JSON, no prose and no fences:
{"thesis":"<the central claim you are arguing about, one sentence, in your own words>",
 "case":[{"point":"<the argument, one sentence>","because":"<the reasoning, one or two sentences>","rests_on":"<the assumption this needs in order to work>"}],
 "strongest":"<which of your arguments is the strongest, and why in one sentence>",
 "changes_my_mind":"<what evidence or argument would move you off this position>"}
Three or four arguments. Quality over count: do not pad to four.`,
  ar: `اجعل كل حجة مستندة إلى ما يقوله المقطع فعلًا. لا تخترع نتائج ولا دراسات ولا أرقامًا. وإذا اعتمدت حجة على شيء لا يثبته المقطع، فضعه في "rests_on" بدل تقريره.

أعد JSON فقط، بلا نثر وبلا أسوار:
{"thesis":"<الادعاء المركزي محل النقاش، جملة واحدة بكلماتك>",
 "case":[{"point":"<الحجة في جملة>","because":"<التعليل، جملة أو جملتان>","rests_on":"<الافتراض الذي تحتاجه هذه الحجة كي تصح>"}],
 "strongest":"<أي حججك أقوى، ولماذا في جملة>",
 "changes_my_mind":"<ما الدليل أو الحجة التي تزحزحك عن هذا الموقف>"}
ثلاث أو أربع حجج. الجودة قبل العدد: لا تحشُ لتصل إلى أربع.`,
  es: `Ancla cada argumento en lo que el texto dice realmente. No inventes resultados, estudios ni cifras. Si un argumento depende de algo que el texto no establece, ponlo en "rests_on" en vez de afirmarlo.

Devuelve SOLO JSON, sin prosa ni vallas:
{"thesis":"<la afirmación central que discutes, una frase, en tus palabras>",
 "case":[{"point":"<el argumento, una frase>","because":"<el razonamiento, una o dos frases>","rests_on":"<el supuesto que necesita para funcionar>"}],
 "strongest":"<cuál de tus argumentos es el más fuerte, y por qué en una frase>",
 "changes_my_mind":"<qué evidencia o argumento te movería de esta posición>"}
Tres o cuatro argumentos. Calidad antes que cantidad: no rellenes hasta cuatro.`,
};

async function askSide(text, lang, side, docType, audience, signal) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: `${DEBATE_BRIEF[lang][side]}\n\n${AUDIENCE[lang][audience]}\n\n${DEBATE_FORMAT[lang]}`,
      messages: [{ role: "user", content: text }],
    }),
  });
  if (!res.ok) throw new Error(`No response (${res.status}).`);
  const data = await res.json();
  const raw = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .replace(/```json|```/g, "")
    .trim();
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("unreadable");
  const parsed = JSON.parse(raw.slice(a, b + 1));
  return {
    side,
    thesis: parsed.thesis || "",
    case: Array.isArray(parsed.case) ? parsed.case.slice(0, 4) : [],
    strongest: parsed.strongest || "",
    changes_my_mind: parsed.changes_my_mind || "",
  };
}

async function requestSide(text, lang, side, docType, audience, signal) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await askSide(text, lang, side, docType, audience, signal);
    } catch (err) {
      if (err.name === "AbortError") throw err;
      if (attempt === 1) throw err;
    }
  }
  return null;
}

/* Do the two sides even agree on what is being argued? Compared on
 * content words so that wording differences do not count as
 * disagreement. */
function thesesAgree(a, b) {
  const words = (x) =>
    new Set(
      (x || "")
        .toLowerCase()
        .match(/[\p{L}\p{N}]+/gu)
        ?.filter((w) => w.length > 3) || []
    );
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return true;
  let shared = 0;
  A.forEach((w) => {
    if (B.has(w)) shared++;
  });
  return shared / Math.min(A.size, B.size) >= 0.3;
}

/* ================= how it reads =================
 *
 * Two things a copy editor does not tell you: where a reader slows
 * down, and how the piece scores as a whole.
 *
 * Readability is NOT asked of the model. It is computed here from the
 * text, so the same passage always gives the same number and you can
 * read the formula. The other four are judgements, shown on a 1-5
 * scale with the reason attached, because a judgement dressed up as a
 * percentage is still a judgement.
 */

function splitSentences(text) {
  const out = [];
  const re = /[^.!?؟۔]+[.!?؟۔]+["'”’)\]]*|\S[^.!?؟۔]*$/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    if (raw.trim()) out.push({ text: raw.trim(), at: m.index + (raw.length - raw.trimStart().length) });
  }
  return out;
}

function countSyllablesEn(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 1;
  if (w.length > 2 && w.endsWith("e") && !/[aeiouy]e$/.test(w)) n -= 1;
  return Math.max(1, n);
}

function countSyllablesEs(word) {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñ]/g, "");
  if (!w) return 0;
  const groups = w.match(/[aeiouáéíóúü]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

/* Flesch Reading Ease for English, Fernandez Huerta for Spanish; both
 * are the standard published forms. Arabic has no equivalent that is
 * widely agreed, so nothing is invented for it: the sentence-length
 * measure is reported on its own. */
function readability(text, lang) {
  const sentences = splitSentences(text);
  const words = text.match(/[\p{L}\p{N}'’-]+/gu) || [];
  const nS = Math.max(1, sentences.length);
  const nW = Math.max(1, words.length);
  const wps = nW / nS;
  const longest = sentences.reduce(
    (a, b) => (countWords(b.text) > countWords(a.text) ? b : a),
    sentences[0] || { text: "" }
  );

  if (lang === "ar") {
    return {
      kind: "sentence-length",
      wordsPerSentence: wps,
      longest: countWords(longest.text),
      sentences: nS,
      words: nW,
    };
  }

  const syl = words.reduce(
    (a, w) => a + (lang === "es" ? countSyllablesEs(w) : countSyllablesEn(w)),
    0
  );
  const spw = syl / nW;
  const score =
    lang === "es"
      ? 206.84 - 60 * spw - 1.02 * wps
      : 206.835 - 1.015 * wps - 84.6 * spw;

  return {
    kind: lang === "es" ? "fernandez-huerta" : "flesch",
    score: Math.max(0, Math.min(100, score)),
    wordsPerSentence: wps,
    syllablesPerWord: spw,
    longest: countWords(longest.text),
    sentences: nS,
    words: nW,
  };
}

const BAND_COLOR = { 1: "#DDEAE2", 2: "#F5EAC8", 3: "#F2D3CD" };
const BAND_EDGE = { 1: "#15645A", 2: "#9A6B15", 3: "#B03A2E" };

const READ_PROMPT = {
  en: `You are reading a passage the way its intended reader would, once, at normal speed. For every sentence, say whether a reader gets it first time.

band 1 = clear first time
band 2 = the reader has to slow down or re-read part of it
band 3 = the reader stops, or could take it two ways

Judge the reading experience, not correctness and not style preference. A long sentence that reads smoothly is band 1. A short sentence with an ambiguous pronoun is band 3.

Then score the passage as a whole, each from 1 to 5, where 3 is ordinary work of its kind:
clarity - can the reader follow the sentences
logic - does each step follow from the one before, with nothing missing
structure - is the order the right order, and is the point where it should be
evidence - are the claims backed by what is actually shown here

Return ONLY JSON, no prose and no fences:
{"sentences":[{"text":"<the sentence exactly as it appears>","band":1,"why":"<only for band 2 or 3: one short sentence on what trips the reader>"}],
 "scores":{"clarity":{"n":3,"why":"<one sentence>"},"logic":{"n":3,"why":"..."},"structure":{"n":3,"why":"..."},"evidence":{"n":3,"why":"..."}}}
Include every sentence. Copy each one character for character. Do not give a "why" for band 1.`,
  ar: `أنت تقرأ المقطع كما يقرؤه قارئه المقصود، مرة واحدة وبسرعة عادية. لكل جملة، قل هل يفهمها القارئ من أول مرة.

band 1 = واضحة من أول قراءة
band 2 = يضطر القارئ إلى التمهل أو إعادة قراءة جزء منها
band 3 = يتوقف القارئ، أو تحتمل الجملة معنيين

احكم على تجربة القراءة، لا على الصواب ولا على تفضيل أسلوبي. الجملة الطويلة التي تنساب بسلاسة هي band 1، والجملة القصيرة ذات الضمير الملتبس هي band 3.

ثم قيّم المقطع كله، كل بند من 1 إلى 5، حيث 3 هو المستوى المعتاد لعمل من نوعه:
clarity - هل يستطيع القارئ متابعة الجمل
logic - هل تتبع كل خطوة ما قبلها بلا ثغرة
structure - هل الترتيب صحيح وهل المقصد في موضعه
evidence - هل الادعاءات مدعومة بما هو معروض هنا فعلًا

أعد JSON فقط، بلا نثر وبلا أسوار:
{"sentences":[{"text":"<الجملة كما وردت حرفيًا>","band":1,"why":"<لـ band 2 أو 3 فقط: جملة قصيرة عمّا يعثّر القارئ>"}],
 "scores":{"clarity":{"n":3,"why":"<جملة>"},"logic":{"n":3,"why":"..."},"structure":{"n":3,"why":"..."},"evidence":{"n":3,"why":"..."}}}
أدرج كل الجمل، وانسخ كل جملة حرفًا بحرف. لا تكتب "why" لـ band 1.`,
  es: `Estás leyendo el texto como lo leería su lector previsto, una vez y a velocidad normal. Para cada frase, di si el lector la entiende a la primera.

band 1 = clara a la primera
band 2 = el lector tiene que frenar o releer una parte
band 3 = el lector se detiene, o la frase admite dos lecturas

Juzga la experiencia de lectura, no la corrección ni tus preferencias de estilo. Una frase larga que fluye es band 1. Una frase corta con un pronombre ambiguo es band 3.

Después puntúa el texto completo, cada apartado de 1 a 5, donde 3 es el nivel corriente para un trabajo de su tipo:
clarity - el lector puede seguir las frases
logic - cada paso se sigue del anterior, sin huecos
structure - el orden es el correcto y la idea principal está donde debe
evidence - las afirmaciones se apoyan en lo que aquí se muestra

Devuelve SOLO JSON, sin prosa ni vallas:
{"sentences":[{"text":"<la frase exactamente como aparece>","band":1,"why":"<solo para band 2 o 3: una frase corta sobre qué frena al lector>"}],
 "scores":{"clarity":{"n":3,"why":"<una frase>"},"logic":{"n":3,"why":"..."},"structure":{"n":3,"why":"..."},"evidence":{"n":3,"why":"..."}}}
Incluye todas las frases, copiadas carácter por carácter. No des "why" para band 1.`,
};

async function askRead(text, lang, docType, audience, signal) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: `${READ_PROMPT[lang]}\n\n${DOCTYPE[lang][docType]}\n${AUDIENCE[lang][audience]}`,
      messages: [{ role: "user", content: text }],
    }),
  });
  if (!res.ok) throw new Error(`No response (${res.status}).`);
  const data = await res.json();
  const raw = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .replace(/```json|```/g, "")
    .trim();
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("unreadable");
  const parsed = JSON.parse(raw.slice(a, b + 1));
  const clamp = (v) => Math.max(1, Math.min(5, Math.round(Number(v) || 3)));
  const sc = parsed.scores || {};
  return {
    sentences: Array.isArray(parsed.sentences) ? parsed.sentences : [],
    scores: ["clarity", "logic", "structure", "evidence"].reduce((acc, k) => {
      acc[k] = { n: clamp(sc[k] && sc[k].n), why: (sc[k] && sc[k].why) || "" };
      return acc;
    }, {}),
  };
}

async function requestRead(text, lang, docType, audience, signal) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await askRead(text, lang, docType, audience, signal);
    } catch (err) {
      if (err.name === "AbortError") throw err;
      if (attempt === 1) throw err;
    }
  }
  return null;
}

/* Lay the bands over the source. Same rule as the editor: a sentence
 * that is not in the text character for character is dropped, never
 * approximated onto a neighbour. */
function buildBands(source, sentences) {
  const found = [];
  let missed = 0;
  sentences.forEach((s) => {
    if (!s || typeof s.text !== "string") return;
    const at = source.indexOf(s.text);
    if (at === -1) {
      missed++;
      return;
    }
    const band = [1, 2, 3].includes(Number(s.band)) ? Number(s.band) : 1;
    found.push({ at, end: at + s.text.length, band, why: s.why || "", text: s.text });
  });
  found.sort((a, b) => a.at - b.at);
  const kept = [];
  let cur = 0;
  for (const f of found) {
    if (f.at < cur) continue;
    kept.push(f);
    cur = f.end;
  }
  const segs = [];
  let pos = 0;
  kept.forEach((f, i) => {
    if (f.at > pos) segs.push({ kind: "plain", text: source.slice(pos, f.at) });
    segs.push({ kind: "band", num: i + 1, ...f });
    pos = f.end;
  });
  if (pos < source.length) segs.push({ kind: "plain", text: source.slice(pos) });
  return { segs, missed };
}

/* ================= peer review =================
 *
 * A second mode. Three referees read the whole passage, each from a
 * different angle, and each writes an independent report. They are sent
 * as three separate requests on purpose: one request producing three
 * "reviews" converges on a single opinion wearing three hats.
 *
 * What this cannot do, and the interface says so: it cannot check that
 * your results are true, that your citations exist, or that your field
 * has not already published this. It reviews what is on the page.
 */
const REVIEWERS = ["methods", "contribution", "claims"];

const REV_LABELS = {
  en: {
    methods: "Methods and rigour",
    contribution: "Contribution and literature",
    claims: "Claims against evidence",
  },
  ar: {
    methods: "المنهج والدقة",
    contribution: "الإسهام والأدبيات",
    claims: "الادعاءات مقابل الأدلة",
  },
  es: {
    methods: "Método y rigor",
    contribution: "Aportación y literatura",
    claims: "Afirmaciones frente a evidencia",
  },
};

const REV_BRIEF = {
  en: {
    methods: `You are Reviewer 1. You read for method and rigour only. Ask: is the design capable of supporting the conclusion? Are the controls, baselines and comparisons the right ones? Is the sample, the mesh, the dataset or the parameter sweep adequate and justified? Are the statistics or the convergence checks appropriate and reported? Could a competent reader reproduce this from what is written? What confound or alternative explanation is not ruled out? Leave wording, novelty and framing to the other reviewers.`,
    contribution: `You are Reviewer 2. You read for contribution and placement in the literature only. Ask: what exactly is new here, in one sentence? Is that novelty stated plainly or left for the reader to infer? Is prior work represented fairly, and is the closest prior work engaged with rather than merely cited? Does the paper claim a gap that the cited work does not actually leave open? Is the contribution large enough to stand alone, or is it an increment presented as more? Leave method detail and wording to the other reviewers.`,
    claims: `You are Reviewer 3. You read for the fit between claims and evidence, and for presentation only. Ask: for each claim in the text, does the evidence presented actually support it, and at that strength? Point at every place where a hedged result is later restated as a certain one, where a correlation is described as a cause, or where a result on one case is generalised. Check that the structure, the figures and the tables referred to do the work the text says they do. Leave method design and novelty to the other reviewers.`,
  },
  ar: {
    methods: `أنت المراجع الأول. تقرأ من زاوية المنهج والدقة فقط. اسأل: هل التصميم قادر على دعم الاستنتاج؟ هل الضوابط والمقارنات المرجعية مناسبة؟ هل العينة أو الشبكة الحسابية أو مجموعة البيانات أو نطاق المعاملات كافٍ ومبرَّر؟ هل الإحصاء أو فحوص التقارب مناسبة ومذكورة؟ هل يستطيع قارئ مختص إعادة إنتاج العمل مما هو مكتوب؟ ما التفسير البديل الذي لم يُستبعد؟ اترك الصياغة والجِدّة للمراجعين الآخرين.`,
    contribution: `أنت المراجع الثاني. تقرأ من زاوية الإسهام وموقعه من الأدبيات فقط. اسأل: ما الجديد هنا بالضبط، في جملة واحدة؟ هل ذُكرت الجِدّة صراحة أم تُركت للقارئ ليستنتجها؟ هل عُرضت الأعمال السابقة بإنصاف، وهل نوقش أقربها فعلًا لا مجرد الإشارة إليه؟ هل يدّعي البحث فجوة لا تتركها الأعمال المذكورة أصلًا؟ هل الإسهام كافٍ ليقوم بذاته أم أنه زيادة طفيفة تُقدَّم كأكثر من ذلك؟ اترك تفاصيل المنهج والصياغة للمراجعين الآخرين.`,
    claims: `أنت المراجع الثالث. تقرأ من زاوية التطابق بين الادعاءات والأدلة، ومن زاوية العرض فقط. اسأل: هل تدعم الأدلة المعروضة كل ادعاء، وبالقوة نفسها؟ أشر إلى كل موضع تتحول فيه نتيجة متحفظة إلى نتيجة مؤكدة لاحقًا، أو يُوصف فيه ارتباط بأنه سببية، أو تُعمَّم فيه نتيجة حالة واحدة. تحقق من أن البنية والأشكال والجداول المشار إليها تؤدي ما يقول النص إنها تؤديه. اترك تصميم المنهج والجِدّة للمراجعين الآخرين.`,
  },
  es: {
    methods: `Eres el Revisor 1. Lees solo desde el método y el rigor. Pregunta: ¿el diseño puede sostener la conclusión? ¿Son adecuados los controles, las líneas base y las comparaciones? ¿La muestra, la malla, el conjunto de datos o el barrido de parámetros es suficiente y está justificado? ¿La estadística o las comprobaciones de convergencia son apropiadas y se informan? ¿Podría un lector competente reproducirlo con lo escrito? ¿Qué explicación alternativa no queda descartada? Deja la redacción y la novedad a los otros revisores.`,
    contribution: `Eres el Revisor 2. Lees solo desde la aportación y su lugar en la literatura. Pregunta: ¿qué es nuevo aquí exactamente, en una frase? ¿Se enuncia esa novedad con claridad o se deja que el lector la deduzca? ¿Se representa con justicia el trabajo previo, y se discute el más cercano en vez de solo citarlo? ¿Se afirma un vacío que los trabajos citados no dejan realmente abierto? ¿La aportación se sostiene por sí sola o es un incremento presentado como algo mayor? Deja el detalle del método y la redacción a los otros revisores.`,
    claims: `Eres el Revisor 3. Lees solo el ajuste entre afirmaciones y evidencia, y la presentación. Pregunta: para cada afirmación del texto, ¿la evidencia presentada la sostiene, y con esa fuerza? Señala cada punto donde un resultado matizado se reformula después como seguro, donde una correlación se describe como causa, o donde un resultado de un solo caso se generaliza. Comprueba que la estructura, las figuras y las tablas citadas hacen lo que el texto dice que hacen. Deja el diseño del método y la novedad a los otros revisores.`,
  },
};

const REV_FORMAT = {
  en: `Write as a real referee: specific, pointed at the text in front of you, and useful. Quote the exact phrase you are objecting to so the author can find it. Do not invent facts about the field, do not claim a paper exists unless the text itself cites it, and say plainly when something cannot be judged from the passage alone.

Return ONLY JSON, no prose and no markdown fences:
{"reads_as":"<one sentence: what this passage claims, in your own words>",
 "major":[{"point":"<the concern, one sentence>","where":"<the exact phrase from the text, or \"throughout\">","why":"<why it matters, one or two sentences>","fix":"<what would answer it>"}],
 "minor":["<a short point>", "..."],
 "verdict":"<one of: accept, minor revision, major revision, reject>"}
Give at most four major concerns and at most five minor points. If you have no major concerns, return an empty list rather than inventing one.`,
  ar: `اكتب كمراجع حقيقي: محدد، ومستند إلى النص الذي أمامك، ومفيد. اقتبس العبارة التي تعترض عليها بنصها ليجدها الكاتب. لا تخترع معلومات عن المجال، ولا تدّعِ وجود بحث ما لم يستشهد به النص نفسه، وقل صراحة حين يتعذر الحكم على شيء من المقطع وحده.

أعد JSON فقط، بلا نثر وبلا أسوار:
{"reads_as":"<جملة واحدة: ما الذي يدّعيه هذا المقطع بكلماتك>",
 "major":[{"point":"<الملاحظة في جملة>","where":"<العبارة الحرفية من النص أو \"في النص كله\">","why":"<لماذا تهم، جملة أو جملتان>","fix":"<ما الذي يعالجها>"}],
 "minor":["<ملاحظة قصيرة>", "..."],
 "verdict":"<واحد من: accept, minor revision, major revision, reject>"}
أربع ملاحظات كبرى على الأكثر وخمس صغرى على الأكثر. إن لم تكن لديك ملاحظة كبرى فأعد قائمة فارغة بدل اختراع واحدة.`,
  es: `Escribe como un revisor real: concreto, anclado en el texto que tienes delante y útil. Cita la frase exacta a la que objetas para que el autor la encuentre. No inventes datos sobre el campo, no afirmes que existe un trabajo salvo que el propio texto lo cite, y di con claridad cuando algo no se puede juzgar solo con este fragmento.

Devuelve SOLO JSON, sin prosa ni vallas de markdown:
{"reads_as":"<una frase: qué afirma este texto, en tus palabras>",
 "major":[{"point":"<la objeción, una frase>","where":"<la frase exacta del texto, o \"en todo el texto\">","why":"<por qué importa, una o dos frases>","fix":"<qué la resolvería>"}],
 "minor":["<un punto breve>", "..."],
 "verdict":"<uno de: accept, minor revision, major revision, reject>"}
Como mucho cuatro objeciones mayores y cinco menores. Si no tienes ninguna mayor, devuelve una lista vacía en vez de inventarla.`,
};

const VERDICT_LABELS = {
  en: {
    accept: "Accept",
    "minor revision": "Minor revision",
    "major revision": "Major revision",
    reject: "Reject",
  },
  ar: {
    accept: "قبول",
    "minor revision": "تعديلات طفيفة",
    "major revision": "تعديلات جوهرية",
    reject: "رفض",
  },
  es: {
    accept: "Aceptar",
    "minor revision": "Revisión menor",
    "major revision": "Revisión mayor",
    reject: "Rechazar",
  },
};

const VERDICT_COLOR = {
  accept: "#15645A",
  "minor revision": "#5E7A2E",
  "major revision": "#9A6B15",
  reject: "#B03A2E",
};

async function askReviewer(text, lang, who, docType, audience, signal) {
  const system = `${REV_BRIEF[lang][who]}

${DOCTYPE[lang][docType]}
${AUDIENCE[lang][audience]}

${REV_FORMAT[lang]}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: text }],
    }),
  });
  if (!res.ok) throw new Error(`Reviewer did not respond (${res.status}).`);
  const data = await res.json();
  const raw = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .replace(/```json|```/g, "")
    .trim();
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("unreadable");
  const parsed = JSON.parse(raw.slice(a, b + 1));
  return {
    who,
    reads_as: parsed.reads_as || "",
    major: Array.isArray(parsed.major) ? parsed.major.slice(0, 4) : [],
    minor: Array.isArray(parsed.minor) ? parsed.minor.slice(0, 5) : [],
    verdict: VERDICT_COLOR[parsed.verdict] ? parsed.verdict : "major revision",
  };
}

async function requestReview(text, lang, who, docType, audience, signal) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await askReviewer(text, lang, who, docType, audience, signal);
    } catch (err) {
      if (err.name === "AbortError") throw err;
      if (attempt === 1) throw err;
    }
  }
  return null;
}

/* ================================================================== */

/* Two overlapping sheets: the copy mark people already recognise.
 * Inline so the tool carries no icon dependency. */
function CopyIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="5.5" y="5.5" width="8.5" height="9" rx="1.2" />
      <path d="M10.5 3.5V2.7A1.2 1.2 0 0 0 9.3 1.5H3.2A1.2 1.2 0 0 0 2 2.7v6.1a1.2 1.2 0 0 0 1.2 1.2H4" />
    </svg>
  );
}

function TickIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M3 8.5l3.2 3.2L13 5" />
    </svg>
  );
}

/* ================================================================== */

function Plainer() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("edit");
  const [review, setReview] = useState(null);
  const [reading, setReading] = useState(null);
  const [debate, setDebate] = useState(null);
  const [claims, setClaims] = useState(null);
  const [lang, setLang] = useState("auto");
  const [docType, setDocType] = useState("paper");
  const [audience, setAudience] = useState("specialists");
  const [strength, setStrength] = useState("standard");
  const [register, setRegister] = useState("keep");
  const [terms, setTerms] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  const [doc, setDoc] = useState(null);
  const [accepted, setAccepted] = useState({});
  const [mutedCats, setMutedCats] = useState({});
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [copiedMark, setCopiedMark] = useState(null);
  const [lessons, setLessons] = useState({});
  const [learning, setLearning] = useState(null);
  const [progress, setProgress] = useState(null);
  const [mem, setMem] = useState(null);
  const [showMem, setShowMem] = useState(false);
  const [showDash, setShowDash] = useState(false);
  const noteRefs = useRef({});
  const abortRef = useRef(null);

  useEffect(() => {
    loadMemory().then((m) => {
      setMem(m);
      if (m.terms && m.terms.length && !terms) setTerms(m.terms.join(", "));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active != null && noteRefs.current[active])
      noteRefs.current[active].scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  /* Keyboard, once a draft is marked up: j and k (or the arrow keys)
   * walk the notes, space toggles the active one, Escape deselects.
   * Ignored while a text field has focus. */
  useEffect(() => {
    if (!doc) return;
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const list = doc.segs.filter(
        (x) => x.kind === "edit" && !mutedCats[x.category]
      );
      if (!list.length) return;
      const idx = list.findIndex((x) => x.num === active);
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setActive(list[Math.min(idx + 1, list.length - 1)]?.num ?? list[0].num);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setActive(list[Math.max(idx - 1, 0)]?.num ?? list[0].num);
      } else if (e.key === " " && active != null) {
        e.preventDefault();
        const note = list.find((x) => x.num === active);
        if (note) {
          const keep = !accepted[active];
          setAccepted((a) => ({ ...a, [active]: keep }));
          remember(note, keep);
        }
      } else if (e.key === "Escape") {
        setActive(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, active, accepted, mutedCats]);

  const say = (m) => {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  };

  const draftLang = lang === "auto" ? detectLang(text) : lang;
  const L = doc ? doc.lang : draftLang;
  const t = T[L];
  const cats = CATS[L];

  const run = async () => {
    const src = text.trim();
    if (!src) return;
    const lg = lang === "auto" ? detectLang(src) : lang;
    if (terms.trim()) rememberTerms(terms);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError(null);
    setDoc(null);
    try {
      const chunks = splitChunks(src);
      setProgress({ done: 0, total: chunks.length });
      const groups = [];
      let failed = 0;
      for (let i = 0; i < chunks.length; i++) {
        try {
          const list = await requestEdits(
            chunks[i].text,
            lg,
            docType,
            audience,
            strength,
            register,
            terms.trim(),
            mem,
            ctrl.signal
          );
          groups.push({ chunk: chunks[i], list });
        } catch (err) {
          if (err.name === "AbortError") throw err;
          // One block failing is not a reason to lose the rest of the
          // document: leave it unmarked and say so afterwards.
          failed++;
          groups.push({ chunk: chunks[i], list: [] });
        }
        setProgress({ done: i + 1, total: chunks.length });
      }
      const { segs, unmatched } = buildSegments(src, groups);
      const flagged = segs.filter((x) => x.kind === "edit").length;
      setMem((prev) => {
        const next = pushHistory(prev || blankMem(), {
          t: Date.now(),
          lang: lg,
          docType,
          words: countWords(src),
          flagged,
          kept: flagged,
          read: readability(src, lg).score ?? null,
          wps: readability(src, lg).wordsPerSentence,
        });
        saveMemory(next);
        return next;
      });
      setDoc({
        segs,
        unmatched,
        failed,
        lang: lg,
        docType,
        audience,
        sourceWords: countWords(src),
      });
      const init = {};
      segs.forEach((s) => {
        if (s.kind === "edit") init[s.num] = true;
      });
      setAccepted(init);
      setMutedCats({});
      setActive(null);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress(null);
    }
  };

  const runClaims = async () => {
    const src = text.trim();
    if (!src) return;
    const lg = lang === "auto" ? detectLang(src) : lang;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError(null);
    setClaims(null);
    setProgress({ done: 0, total: 1 });
    try {
      const r = await requestClaims(src, lg, docType, audience, ctrl.signal);
      const built = buildClaims(src, r.sentences, r.contradictions);
      setClaims({ ...built, lang: lg });
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress(null);
    }
  };

  const runDebate = async () => {
    const src = text.trim();
    if (!src) return;
    const lg = lang === "auto" ? detectLang(src) : lang;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError(null);
    setDebate(null);
    setProgress({ done: 0, total: SIDES.length });
    try {
      const sides = [];
      for (let i = 0; i < SIDES.length; i++) {
        const r = await requestSide(src, lg, SIDES[i], docType, audience, ctrl.signal);
        if (r) sides.push(r);
        setProgress({ done: i + 1, total: SIDES.length });
      }
      if (sides.length < 2) throw new Error("Only one side came back. Try again.");
      setDebate({
        sides,
        lang: lg,
        agree: thesesAgree(sides[0].thesis, sides[1].thesis),
      });
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress(null);
    }
  };

  const runRead = async () => {
    const src = text.trim();
    if (!src) return;
    const lg = lang === "auto" ? detectLang(src) : lang;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError(null);
    setReading(null);
    setProgress({ done: 0, total: 1 });
    try {
      const r = await requestRead(src, lg, docType, audience, ctrl.signal);
      const { segs, missed } = buildBands(src, r.sentences);
      setReading({
        segs,
        missed,
        scores: r.scores,
        read: readability(src, lg),
        lang: lg,
      });
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress(null);
    }
  };

  const runReview = async () => {
    const src = text.trim();
    if (!src) return;
    const lg = lang === "auto" ? detectLang(src) : lang;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError(null);
    setReview(null);
    setProgress({ done: 0, total: REVIEWERS.length });
    try {
      const reports = [];
      let failed = 0;
      for (let i = 0; i < REVIEWERS.length; i++) {
        try {
          const r = await requestReview(
            src,
            lg,
            REVIEWERS[i],
            docType,
            audience,
            ctrl.signal
          );
          if (r) reports.push(r);
        } catch (err) {
          if (err.name === "AbortError") throw err;
          failed++;
        }
        setProgress({ done: i + 1, total: REVIEWERS.length });
      }
      if (!reports.length) throw new Error("No reviewer could be reached. Try again.");
      setReview({ reports, failed, lang: lg, words: countWords(src) });
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress(null);
    }
  };

  const reviewText = () => {
    if (!review) return "";
    return review.reports
      .map((r) => {
        const head = `${REV_LABELS[review.lang][r.who]} — ${
          VERDICT_LABELS[review.lang][r.verdict]
        }`;
        const major = r.major
          .map(
            (m, i) =>
              `  ${i + 1}. ${m.point}\n     ${t.whereWord}: ${m.where}\n     ${m.why}\n     ${t.fixWord}: ${m.fix}`
          )
          .join("\n");
        const minor = r.minor.map((x) => `  - ${x}`).join("\n");
        return `${head}\n${r.reads_as}\n\n${t.majorWord}:\n${major || "  —"}\n\n${t.minorWord}:\n${minor || "  —"}`;
      })
      .join("\n\n" + "-".repeat(50) + "\n\n");
  };

  const stop = () => {
    if (abortRef.current) abortRef.current.abort();
  };

  /* Record one decision. Rejecting is the informative one: it says the
   * editor was wrong about this author. Accepting is recorded too, so a
   * category is only muted when rejections genuinely outweigh them. */
  const remember = (note, keep) => {
    const lg = doc ? doc.lang : draftLang;
    setMem((prev) => {
      const base = prev || blankMem();
      const slice = base[lg] || { accepted: {}, rejected: {}, restored: [] };
      const bucket = keep ? "accepted" : "rejected";
      const other = keep ? "rejected" : "accepted";
      const nextSlice = {
        accepted: { ...(slice.accepted || {}) },
        rejected: { ...(slice.rejected || {}) },
        restored: [...(slice.restored || [])],
      };
      nextSlice[bucket][note.category] = (nextSlice[bucket][note.category] || 0) + 1;
      if ((nextSlice[other][note.category] || 0) > 0)
        nextSlice[other][note.category] -= 1;

      if (!keep) {
        const phrase = note.original.trim();
        // short, reusable fragments only; a whole paragraph teaches nothing
        if (phrase.length <= 120 && !nextSlice.restored.includes(phrase)) {
          nextSlice.restored.push(phrase);
          if (nextSlice.restored.length > 40) nextSlice.restored.shift();
        }
      }
      // the last history row is this passage: keep its kept-count true
      const hist = [...(base.history || [])];
      if (hist.length) {
        const last = { ...hist[hist.length - 1] };
        last.kept = Math.max(0, Math.min(last.flagged, (last.kept || 0) + (keep ? 1 : -1)));
        hist[hist.length - 1] = last;
      }
      const next = { ...base, [lg]: nextSlice, history: hist, updated: Date.now() };
      saveMemory(next);
      return next;
    });
  };

  const rememberTerms = (raw) => {
    const list = raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (!list.length) return;
    setMem((prev) => {
      const base = prev || blankMem();
      const set = new Set([...(base.terms || []), ...list]);
      const next = { ...base, terms: [...set].slice(-60), updated: Date.now() };
      saveMemory(next);
      return next;
    });
  };

  const forgetAll = async () => {
    const fresh = blankMem();
    setMem(fresh);
    await saveMemory(fresh);
    say("Forgotten");
  };

  const notes = useMemo(
    () => (doc ? doc.segs.filter((s) => s.kind === "edit") : []),
    [doc]
  );

  const byCat = useMemo(() => {
    const m = {};
    notes.forEach((n) => {
      m[n.category] = (m[n.category] || 0) + 1;
    });
    return m;
  }, [notes]);

  const isOn = (s) => accepted[s.num] && !mutedCats[s.category];

  const cleanText = () =>
    (doc ? doc.segs : [])
      .map((s) => (s.kind === "plain" ? s.text : isOn(s) ? s.revised : s.original))
      .join("");

  const copy = (value, msg, mark) => {
    const ta = document.createElement("textarea");
    ta.value = value;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    if (mark) {
      setCopiedMark(mark);
      setTimeout(() => setCopiedMark(null), 1500);
    }
    say(msg);
  };

  /* Cached per note, so re-opening one costs nothing. */
  const explain = async (note) => {
    if (lessons[note.num] || learning === note.num) return;
    setLearning(note.num);
    try {
      const r = await requestExplain(note, doc.lang);
      setLessons((m) => ({ ...m, [note.num]: r }));
    } catch {
      setLessons((m) => ({ ...m, [note.num]: { error: true } }));
    } finally {
      setLearning(null);
    }
  };

  const download = () => {
    const blob = new Blob([cleanText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "edited.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const changeLog = () =>
    notes
      .filter(isOn)
      .map(
        (n, i) =>
          `${i + 1}. [${n.category}] ${n.reason}\n   ${t.before}: ${n.original}\n   ${t.after}: ${n.revised}`
      )
      .join("\n\n");

  const liveNotes = notes.filter((n) => !mutedCats[n.category]);
  const keptCount = liveNotes.filter((n) => accepted[n.num]).length;
  const afterWords = doc ? countWords(cleanText()) : 0;
  const delta = doc ? doc.sourceWords - afterWords : 0;

  const proseStyle = {
    margin: 0,
    direction: t.dir,
    textAlign: t.dir === "rtl" ? "right" : "left",
    fontFamily: t.font,
    fontSize: t.size,
    lineHeight: t.lh,
  };

  return (
    <div style={S.desk}>
      <style>{CSS}</style>

      <header style={S.bar}>
        <div style={S.brand}>
          <span style={S.mark}>¶</span>
          <span style={S.name}>plainer</span>
          <span style={S.tagline}>{t.tagline}</span>
        </div>
        {review && (
          <div style={S.barActions}>
            <button style={S.ghostBtn} onClick={() => setReview(null)}>
              {t.backDraft}
            </button>
            <button
              style={S.iconPrimary}
              onClick={() => copy(reviewText(), t.copiedReports, "rep")}
            >
              {copiedMark === "rep" ? <TickIcon /> : <CopyIcon />}
              {t.copyReports}
            </button>
          </div>
        )}
        {doc && (
          <div style={S.barActions}>
            <span style={S.count}>
              {keptCount} / {liveNotes.length} {t.kept}
              {delta !== 0 && (
                <em style={S.deltaChip}>
                  {delta > 0 ? "−" : "+"}
                  {Math.abs(delta)} {t.words}
                </em>
              )}
            </span>
            <button style={S.ghostBtn} onClick={() => setDoc(null)}>
              {t.back}
            </button>
            <button
              style={S.iconBtn}
              onClick={() => copy(changeLog(), t.copiedLog, "log")}
              disabled={keptCount === 0}
            >
              {copiedMark === "log" ? <TickIcon /> : <CopyIcon />}
              {t.copyLog}
            </button>
            <button style={S.ghostBtn} onClick={download}>
              {t.download}
            </button>
            <button
              style={S.iconPrimary}
              onClick={() => copy(cleanText(), t.copiedClean, "clean")}
            >
              {copiedMark === "clean" ? <TickIcon /> : <CopyIcon />}
              {t.copyClean}
            </button>
          </div>
        )}
      </header>

      <main style={S.main}>
        {showDash && mem ? (
          <Dashboard mem={mem} t={t} onBack={() => setShowDash(false)} />
        ) : claims ? (
          <ClaimsView claims={claims} t={t} onBack={() => setClaims(null)} />
        ) : debate ? (
          <DebateView debate={debate} t={t} onBack={() => setDebate(null)} />
        ) : reading ? (
          <ReadView
            reading={reading}
            t={t}
            onBack={() => setReading(null)}
          />
        ) : review ? (
          <ReviewView
            review={review}
            t={t}
            onBack={() => setReview(null)}
            onCopy={() => copy(reviewText(), t.copiedReports, "rep")}
            copiedMark={copiedMark}
          />
        ) : !doc ? (
          <section style={S.draftWrap}>
            <div style={S.page}>
              <textarea
                style={{ ...S.textarea, ...proseStyle }}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.placeholder}
                spellCheck={false}
              />
            </div>

            <div style={S.controls}>
              {/* The run button sits beside the tabs, not under the
                  explanation: a paragraph of description was pushing the
                  primary action off the bottom of the screen. */}
              <div style={S.actionRow}>
                <div style={S.segmented}>
                  <button
                    className={`seg ${mode === "edit" ? "seg-on" : ""}`}
                    onClick={() => setMode("edit")}
                  >
                    {t.modeEdit}
                  </button>
                  <button
                    className={`seg ${mode === "read" ? "seg-on" : ""}`}
                    onClick={() => setMode("read")}
                  >
                    {t.modeRead}
                  </button>
                  <button
                    className={`seg ${mode === "claims" ? "seg-on" : ""}`}
                    onClick={() => setMode("claims")}
                  >
                    {t.modeClaims}
                  </button>
                  <button
                    className={`seg ${mode === "debate" ? "seg-on" : ""}`}
                    onClick={() => setMode("debate")}
                  >
                    {t.modeDebate}
                  </button>
                  <button
                    className={`seg ${mode === "review" ? "seg-on" : ""}`}
                    onClick={() => setMode("review")}
                  >
                    {t.modeReview}
                  </button>
                </div>

                <button
                  style={{ ...S.primaryBtn, opacity: text.trim() && !busy ? 1 : 0.45 }}
                  onClick={
                    mode === "review"
                      ? runReview
                      : mode === "read"
                      ? runRead
                      : mode === "debate"
                      ? runDebate
                      : mode === "claims"
                      ? runClaims
                      : run
                  }
                  disabled={!text.trim() || busy}
                >
                  {busy
                    ? progress && progress.total > 1
                      ? `${
                          mode === "review"
                            ? t.reviewing
                            : mode === "debate"
                            ? t.debating
                            : t.reading
                        } ${progress.done}/${progress.total}`
                      : mode === "review"
                      ? t.reviewing
                      : mode === "debate"
                      ? t.debating
                      : t.reading
                    : mode === "review"
                    ? t.sendReview
                    : mode === "read"
                    ? t.seeRead
                    : mode === "debate"
                    ? t.runDebate
                    : mode === "claims"
                    ? t.runClaims
                    : t.markUp}
                </button>

                {busy && (
                  <button style={S.ghostBtn} onClick={stop}>
                    {t.stop}
                  </button>
                )}
              </div>

              <div style={S.secondRow}>
                {["en", "ar", "es"].map((k) => (
                  <button
                    key={k}
                    style={S.ghostBtn}
                    onClick={() => setText(SAMPLES[k])}
                    title={t.sampleTitle}
                  >
                    {t.sampleWord} · {T[k].label}
                  </button>
                ))}
                <button style={S.linkBtn} onClick={() => setShowOptions((v) => !v)}>
                  {showOptions ? "Hide options" : "Options"}
                </button>
                {!text.trim() && <span style={S.emptyHint}>{t.pasteFirst}</span>}
                {text.trim() && (
                  <span style={S.meta}>
                    {countWords(text)} · {T[draftLang].label}
                    {lang === "auto" ? " (detected)" : ""} ·{" "}
                    {DOC_LABELS[draftLang][docType]} ·{" "}
                    {AUD_LABELS[draftLang][audience]}
                    {register !== "keep" &&
                      ` · ${register === "more" ? "more formal" : "less formal"}`}
                  </span>
                )}
              </div>

              <p style={S.modeNote}>
                {mode === "review"
                  ? t.reviewNote
                  : mode === "read"
                  ? t.readNote
                  : mode === "debate"
                  ? t.debateNote
                  : mode === "claims"
                  ? t.claimsNote
                  : t.editNote}
              </p>

              {showOptions && (
                <div style={S.options}>
                  <div>
                    <label style={S.optLabel}>Language</label>
                    <div style={S.segmented}>
                      {[["auto", "Detect"], ["en", "English"], ["ar", "العربية"], ["es", "Español"]].map(
                        ([v, l]) => (
                          <button
                            key={v}
                            className={`seg ${lang === v ? "seg-on" : ""}`}
                            onClick={() => setLang(v)}
                          >
                            {l}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={S.optLabel}>What kind of text is this</label>
                    <div style={S.segmented}>
                      {["paper", "report", "email", "post", "chat"].map((v) => (
                        <button
                          key={v}
                          className={`seg ${docType === v ? "seg-on" : ""}`}
                          onClick={() => setDocType(v)}
                        >
                          {DOC_LABELS[draftLang][v]}
                        </button>
                      ))}
                    </div>
                    <p style={S.optHint}>{DOC_HINTS[docType]}</p>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={S.optLabel}>Who will read it</label>
                    <div style={S.segmented}>
                      {["specialists", "adjacent", "general", "client"].map((v) => (
                        <button
                          key={v}
                          className={`seg ${audience === v ? "seg-on" : ""}`}
                          onClick={() => setAudience(v)}
                        >
                          {AUD_LABELS[draftLang][v]}
                        </button>
                      ))}
                    </div>
                    <p style={S.optHint}>{AUD_HINTS[audience]}</p>
                  </div>

                  <div>
                    <label style={S.optLabel}>How much to change</label>
                    <div style={S.segmented}>
                      {[["light", "Light"], ["standard", "Standard"], ["thorough", "Thorough"]].map(
                        ([v, l]) => (
                          <button
                            key={v}
                            className={`seg ${strength === v ? "seg-on" : ""}`}
                            onClick={() => setStrength(v)}
                          >
                            {l}
                          </button>
                        )
                      )}
                    </div>
                    <p style={S.optHint}>
                      {strength === "light"
                        ? "Only what clearly damages clarity."
                        : strength === "thorough"
                        ? "Also milder wordiness and repeated sentence shapes."
                        : "Normal editorial judgement."}
                    </p>
                  </div>

                  <div>
                    <label style={S.optLabel}>Tone</label>
                    <div style={S.segmented}>
                      {[
                        ["less", "Less formal"],
                        ["keep", "Leave as is"],
                        ["more", "More formal"],
                      ].map(([v, l]) => (
                        <button
                          key={v}
                          className={`seg ${register === v ? "seg-on" : ""}`}
                          onClick={() => setRegister(v)}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <p style={S.optHint}>
                      {register === "keep"
                        ? "Clarity only. The tone stays where you put it."
                        : register === "more"
                        ? "Journal or formal report. Formal does not mean wordy."
                        : "Research blog, or a message to a colleague. Never slangy."}
                    </p>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={S.optLabel}>Words to leave alone</label>
                    <input
                      style={S.input}
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      placeholder="p-value, COVID-19, PhD, Nature, Cairo University"
                    />
                    <p style={S.optHint}>
                      Anything here comes back untouched. Separate with commas.
                      Names, acronyms, product and place names, and any term your
                      field spells a particular way.
                    </p>
                  </div>
                </div>
              )}

              {mem && (memHasContent(mem) || (mem.history || []).length > 0 || showMem) && (
                <div style={S.memBar}>
                  <button style={S.linkBtn} onClick={() => setShowMem((v) => !v)}>
                    {showMem ? "Hide what it remembers" : "What it remembers about you"}
                  </button>
                  <button
                    style={{ ...S.linkBtn, marginInlineStart: 16 }}
                    onClick={() => setShowDash(true)}
                  >
                    {t.dashOpen}
                  </button>
                  {showMem && (
                    <div style={S.memBody}>
                      <p style={S.memNote}>
                        Not training. A record of decisions you already made, sent
                        with the next passage so it stops repeating them. Stored in
                        this browser only.
                      </p>

                      {["en", "ar", "es"].map((lg) => {
                        const tired = tiredCategories(mem, lg);
                        const kept = (mem[lg] && mem[lg].restored) || [];
                        if (!tired.length && !kept.length) return null;
                        return (
                          <div key={lg} style={S.memBlock}>
                            <div style={S.memHead}>{T[lg].label}</div>
                            {tired.length > 0 && (
                              <div style={S.chips}>
                                {tired.map((c) => (
                                  <span key={c} className="chip chip-static">
                                    {c} <b>{mem[lg].rejected[c]}</b>
                                  </span>
                                ))}
                              </div>
                            )}
                            {kept.length > 0 && (
                              <ul style={S.memList}>
                                {kept
                                  .slice(-5)
                                  .reverse()
                                  .map((r, i) => (
                                    <li key={i} style={S.memItem}>
                                      {r}
                                    </li>
                                  ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}

                      {mem.terms && mem.terms.length > 0 && (
                        <div style={S.memBlock}>
                          <div style={S.memHead}>Words to leave alone</div>
                          <div style={S.chips}>
                            {mem.terms.map((t2) => (
                              <span key={t2} className="chip chip-static">
                                {t2}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {!memHasContent(mem) && (
                        <p style={S.memNote}>
                          Nothing yet. Undo a change you disagree with and it will be
                          recorded here.
                        </p>
                      )}

                      <button className="toggle" onClick={forgetAll}>
                        Forget everything
                      </button>
                    </div>
                  )}
                </div>
              )}

              {error && <div style={S.error}>{error}</div>}
            </div>
          </section>
        ) : (
          <section style={S.proofWrap}>
            <div style={S.page}>
              <p style={proseStyle}>
                {doc.segs.map((s, i) =>
                  s.kind === "plain" ? (
                    <span key={i}>{s.text}</span>
                  ) : (
                    <span
                      key={i}
                      className={`edit ${active === s.num ? "edit-on" : ""} ${
                        mutedCats[s.category] ? "edit-muted" : ""
                      }`}
                      role={mutedCats[s.category] ? undefined : "button"}
                      tabIndex={mutedCats[s.category] ? undefined : 0}
                      aria-label={`${t.noteWord} ${s.num}, ${s.category}`}
                      aria-pressed={active === s.num}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          setActive(active === s.num ? null : s.num);
                        }
                      }}
                      onClick={() => setActive(active === s.num ? null : s.num)}
                    >
                      {!mutedCats[s.category] && <sup className="flag">{s.num}</sup>}
                      {isOn(s)
                        ? s.parts.map((p, k) =>
                            p.type === "same" ? (
                              <span key={k}>{p.text}</span>
                            ) : p.type === "del" ? (
                              <del key={k} className="cut">
                                {p.text}
                              </del>
                            ) : (
                              <ins key={k} className="add">
                                {p.text}
                              </ins>
                            )
                          )
                        : s.original}
                    </span>
                  )
                )}
              </p>
            </div>

            <aside style={S.margin}>
              <div style={S.panel}>
                <div style={S.panelHead}>{t.summary}</div>
                <div style={S.stats}>
                  <div>
                    <div style={S.statNum}>{doc.sourceWords}</div>
                    <div style={S.statLab}>{t.before}</div>
                  </div>
                  <div>
                    <div style={S.statNum}>{afterWords}</div>
                    <div style={S.statLab}>{t.after}</div>
                  </div>
                  <div>
                    <div style={S.statNum}>{notes.length}</div>
                    <div style={S.statLab}>{t.notes}</div>
                  </div>
                </div>

                {notes.length > 0 && (
                  <>
                    <div style={S.filterLab}>{t.muteHint}</div>
                    <div style={S.chips}>
                      {Object.entries(byCat).map(([c, n]) => (
                        <button
                          key={c}
                          className={`chip ${mutedCats[c] ? "chip-off" : ""} ${
                            c === REGISTER_CAT[L] ? "chip-reg" : ""
                          }`}
                          onClick={() => setMutedCats((m) => ({ ...m, [c]: !m[c] }))}
                          title={cats[c] || ""}
                        >
                          {c} <b>{n}</b>
                        </button>
                      ))}
                    </div>
                    <div style={S.bulkRow}>
                      <button
                        className="toggle"
                        onClick={() => {
                          const a = { ...accepted };
                          liveNotes.forEach((n) => (a[n.num] = true));
                          setAccepted(a);
                        }}
                      >
                        {t.applyAll}
                      </button>
                      <button
                        className="toggle"
                        onClick={() => {
                          const a = { ...accepted };
                          liveNotes.forEach((n) => (a[n.num] = false));
                          setAccepted(a);
                        }}
                      >
                        {t.undoAll}
                      </button>
                    </div>
                  </>
                )}

                {doc.failed > 0 && <p style={S.warn}>{t.failedBlocks(doc.failed)}</p>}
                {doc.unmatched > 0 && <p style={S.warn}>{t.dropped(doc.unmatched)}</p>}
                <p style={S.keys}>j k {t.keysMove} · space {t.keysToggle}</p>
              </div>

              {notes.length === 0 && doc.failed === 0 && (
                <div style={S.clean}>{t.nothing}</div>
              )}

              {liveNotes.map((s) => (
                <div
                  key={s.num}
                  ref={(el) => (noteRefs.current[s.num] = el)}
                  className={`note ${active === s.num ? "note-on" : ""} ${
                    accepted[s.num] ? "" : "note-off"
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${t.noteWord} ${s.num}, ${s.category}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setActive(active === s.num ? null : s.num);
                    }
                  }}
                  onClick={() => setActive(active === s.num ? null : s.num)}
                >
                  <div style={S.noteHead}>
                    <span
                      style={{
                        ...S.noteNum,
                        background: s.category === REGISTER_CAT[L] ? "#BFD9D2" : "#E8D98A",
                      }}
                    >
                      {s.num}
                    </span>
                    <span style={S.noteCat}>{s.category}</span>
                  </div>
                  {cats[s.category] && <p style={S.noteRule}>{cats[s.category]}</p>}
                  <p style={S.noteReason}>{s.reason}</p>

                  {active === s.num && (
                    <div
                      style={{
                        ...S.compare,
                        direction: t.dir,
                        textAlign: t.dir === "rtl" ? "right" : "left",
                        fontFamily: t.font,
                      }}
                    >
                      <div>
                        <div style={S.cmpLab}>{t.before}</div>
                        <div style={S.cmpCut}>{s.original}</div>
                      </div>
                      <div>
                        <div style={S.cmpLab}>{t.after}</div>
                        <div style={S.cmpAdd}>{s.revised}</div>
                      </div>
                    </div>
                  )}

                  <div style={S.noteActions}>
                    <button
                      className="toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        const keep = !accepted[s.num];
                        setAccepted((a) => ({ ...a, [s.num]: keep }));
                        remember(s, keep);
                      }}
                    >
                      {accepted[s.num] ? t.undoOne : t.applyOne}
                    </button>
                    <button
                      className="toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActive(s.num);
                        explain(s);
                      }}
                      disabled={learning === s.num}
                    >
                      {learning === s.num
                        ? t.explaining
                        : lessons[s.num]
                        ? t.explainAgain
                        : t.explainBtn}
                    </button>
                    <button
                      className="toggle icon-only"
                      title={t.copySentence}
                      aria-label={t.copySentence}
                      onClick={(e) => {
                        e.stopPropagation();
                        copy(
                          accepted[s.num] ? s.revised : s.original,
                          t.copiedSentence,
                          `n${s.num}`
                        );
                      }}
                    >
                      {copiedMark === `n${s.num}` ? <TickIcon /> : <CopyIcon />}
                    </button>
                  </div>

                  {lessons[s.num] && active === s.num && (
                    <div style={S.lesson}>
                      {lessons[s.num].error ? (
                        <p style={S.warn}>{t.explainFailed}</p>
                      ) : (
                        <>
                          {[
                            ["what", t.lessonWhat],
                            ["why", t.lessonWhy],
                            ["alternative", t.lessonAlt],
                            ["when_not", t.lessonWhenNot],
                            ["example", t.lessonExample],
                          ].map(([k, label]) =>
                            lessons[s.num][k] ? (
                              <div key={k} style={S.lessonRow}>
                                <div
                                  style={{
                                    ...S.lessonLab,
                                    color: k === "when_not" ? cut : quiet,
                                  }}
                                >
                                  {label}
                                </div>
                                <p
                                  style={{
                                    ...S.lessonText,
                                    direction: t.dir,
                                    textAlign: t.dir === "rtl" ? "right" : "left",
                                    fontFamily:
                                      k === "alternative" || k === "example"
                                        ? t.font
                                        : UI,
                                  }}
                                >
                                  {lessons[s.num][k]}
                                </p>
                              </div>
                            ) : null
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </aside>
          </section>
        )}
      </main>

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}






/* A plain line, drawn from the numbers, with no axis furniture. It is
 * there to show a shape, and the figures underneath carry the detail. */
function Spark({ values, width = 240, height = 54, color = "#15645A", lowerIsBetter }) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const pts = values.map((v, i) => [
    i * step,
    height - 4 - ((v - min) / span) * (height - 8),
  ]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const improving = lowerIsBetter
    ? values[values.length - 1] <= values[0]
    : values[values.length - 1] >= values[0];
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="none" stroke={improving ? color : "#B03A2E"} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={improving ? color : "#B03A2E"} />
    </svg>
  );
}

/* Counts and computed figures only. What is missing from this screen is
 * a single "writing score": there is no instrument here that could
 * produce one honestly across months and across different pieces. */
function Dashboard({ mem, t, onBack }) {
  const rows = (mem.history || []).slice();
  const totalWords = rows.reduce((a, r) => a + (r.words || 0), 0);
  const totalFlagged = rows.reduce((a, r) => a + (r.flagged || 0), 0);
  const totalKept = rows.reduce((a, r) => a + (r.kept || 0), 0);
  const trend = trendOf(rows);

  const problems = {};
  ["en", "ar", "es"].forEach((lg) => {
    const acc = (mem[lg] && mem[lg].accepted) || {};
    Object.entries(acc).forEach(([c, n]) => {
      problems[c] = (problems[c] || 0) + n;
    });
  });
  const topProblems = Object.entries(problems).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxProblem = topProblems.length ? topProblems[0][1] : 1;

  const readRows = rows.filter((r) => typeof r.read === "number");

  if (!rows.length) {
    return (
      <section style={S.draftWrap}>
        <div style={S.page}>
          <p style={S.calcNote}>{t.dashEmpty}</p>
        </div>
        <div style={{ marginTop: 18 }}>
          <button style={S.ghostBtn} onClick={onBack}>
            {t.backDraft}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section style={S.dashWrap}>
      <div style={S.dashGrid}>
        <div style={S.panel}>
          <div style={S.panelHead}>{t.dashTotals}</div>
          <div style={S.stats}>
            <div>
              <div style={S.statNum}>{rows.length}</div>
              <div style={S.statLab}>{t.passages}</div>
            </div>
            <div>
              <div style={S.statNum}>{totalWords.toLocaleString()}</div>
              <div style={S.statLab}>{t.wordsWord}</div>
            </div>
            <div>
              <div style={S.statNum}>{totalKept}</div>
              <div style={S.statLab}>{t.changesMade}</div>
            </div>
          </div>
          <p style={S.calcNote}>
            {totalFlagged} {t.flaggedTotal}
          </p>
        </div>

        <div style={S.panel}>
          <div style={S.panelHead}>{t.dashCurve}</div>
          <Spark values={rows.map(per100)} lowerIsBetter />
          {trend ? (
            <>
              <p style={S.trendLine}>
                {trend.from.toFixed(1)} → {trend.to.toFixed(1)} {t.per100Word}
              </p>
              <p style={S.calcNote}>{t.curveNote}</p>
            </>
          ) : (
            <p style={S.calcNote}>{t.tooFew}</p>
          )}
        </div>

        <div style={S.panel}>
          <div style={S.panelHead}>{t.dashProblems}</div>
          {topProblems.length === 0 ? (
            <p style={S.calcNote}>{t.noProblemsYet}</p>
          ) : (
            topProblems.map(([c, n]) => (
              <div key={c} style={S.kindRow}>
                <span style={{ ...S.kindName, width: 118 }}>{c}</span>
                <span style={S.kindBarWrap}>
                  <span
                    style={{ ...S.kindBar, width: `${(n / maxProblem) * 100}%`, background: cut }}
                  />
                </span>
                <b style={S.kindNum}>{n}</b>
              </div>
            ))
          )}
          <p style={S.calcNote}>{t.problemsNote}</p>
        </div>

        {readRows.length > 1 && (
          <div style={S.panel}>
            <div style={S.panelHead}>{t.readability}</div>
            <Spark values={readRows.map((r) => r.read)} />
            <p style={S.trendLine}>
              {readRows[0].read.toFixed(0)} → {readRows[readRows.length - 1].read.toFixed(0)}
            </p>
            <p style={S.calcNote}>{t.readTrendNote}</p>
          </div>
        )}
      </div>

      <p style={S.dashCaveat}>{t.dashCaveat}</p>

      <div style={S.reviewFoot}>
        <button style={S.ghostBtn} onClick={onBack}>
          {t.backDraft}
        </button>
      </div>
    </section>
  );
}

/* Statement kinds as background tints, evidence as a mark on top of
 * them, contradictions in their own panel because they are about two
 * places at once and cannot be shown as a property of one sentence. */
function ClaimsView({ claims, t, onBack }) {
  const [open, setOpen] = React.useState(null);
  const lg = claims.lang;
  const dir = T[lg].dir;
  const textStyle = { direction: dir, textAlign: dir === "rtl" ? "right" : "left", fontFamily: T[lg].font };
  const prose = {
    margin: 0,
    ...textStyle,
    fontSize: T[lg].size,
    lineHeight: dir === "rtl" ? 2.2 : 2,
  };
  const total = Object.values(claims.counts).reduce((a, b) => a + b, 0);

  return (
    <section style={S.proofWrap}>
      <div style={S.page}>
        <div style={S.legend}>
          {KINDS.map((k) => (
            <span key={k} style={S.legendItem}>
              <span
                style={{ ...S.legendSwatch, background: KIND_COLOR[k], borderColor: KIND_EDGE[k] }}
              />
              {KIND_LABELS[lg][k]}
            </span>
          ))}
          <span style={S.legendItem}>
            <span style={{ ...S.evDot, background: cut }} />
            {EV_LABELS[lg].none}
          </span>
          <span style={S.legendItem}>
            <span style={{ ...S.evDot, background: "#9A6B15" }} />
            {EV_LABELS[lg].weak}
          </span>
        </div>

        <p style={prose}>
          {claims.segs.map((seg, i) =>
            seg.type === "plain" ? (
              <span key={i}>{seg.text}</span>
            ) : (
              <span
                key={i}
                className="band"
                style={{
                  background: seg.kind === "none" ? "transparent" : KIND_COLOR[seg.kind],
                  boxShadow:
                    open === seg.num && seg.kind !== "none"
                      ? `inset 0 -2px 0 ${KIND_EDGE[seg.kind]}`
                      : "none",
                  cursor: seg.note || seg.kind !== "none" ? "pointer" : "default",
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setOpen(open === seg.num ? null : seg.num);
                }}
                onClick={() => setOpen(open === seg.num ? null : seg.num)}
              >
                {seg.evidence !== "ok" && (
                  <span
                    style={{
                      ...S.evDot,
                      background: seg.evidence === "none" ? cut : "#9A6B15",
                      marginInlineEnd: 4,
                      verticalAlign: "middle",
                    }}
                  />
                )}
                {seg.text}
              </span>
            )
          )}
        </p>

        {open != null &&
          (() => {
            const seg = claims.segs.find((x) => x.num === open);
            if (!seg) return null;
            return (
              <div style={S.bandWhy}>
                <strong style={{ color: KIND_EDGE[seg.kind] || ink }}>
                  {KIND_LABELS[lg][seg.kind] || "—"}
                </strong>
                {seg.evidence !== "ok" && (
                  <span style={{ color: seg.evidence === "none" ? cut : "#9A6B15" }}>
                    {" · "}
                    {EV_LABELS[lg][seg.evidence]}
                  </span>
                )}
                {seg.note && <p style={{ margin: "6px 0 0", ...textStyle }}>{seg.note}</p>}
              </div>
            );
          })()}
      </div>

      <aside style={S.margin}>
        <div style={S.panel}>
          <div style={S.panelHead}>{t.kindsWord}</div>
          {KINDS.map((k) => (
            <div key={k} style={S.kindRow}>
              <span style={S.kindName}>
                <span
                  style={{ ...S.legendSwatch, background: KIND_COLOR[k], borderColor: KIND_EDGE[k] }}
                />
                {KIND_LABELS[lg][k]}
              </span>
              <span style={S.kindBarWrap}>
                <span
                  style={{
                    ...S.kindBar,
                    width: total ? `${(claims.counts[k] / total) * 100}%` : "0%",
                    background: KIND_EDGE[k],
                  }}
                />
              </span>
              <b style={S.kindNum}>{claims.counts[k]}</b>
            </div>
          ))}
        </div>

        <div style={S.panel}>
          <div style={S.panelHead}>{t.unsupportedWord}</div>
          {claims.unsupported.length === 0 ? (
            <p style={S.calcNote}>{t.allSupported}</p>
          ) : (
            <ul style={S.minorList}>
              {claims.unsupported.map((u, i) => (
                <li key={i} style={{ ...S.minorItem, ...textStyle }}>
                  <span
                    style={{
                      ...S.evDot,
                      background: u.evidence === "none" ? cut : "#9A6B15",
                      marginInlineEnd: 5,
                    }}
                  />
                  {u.text}
                  {u.note && <em style={S.unNote}>{u.note}</em>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={S.panel}>
          <div style={S.panelHead}>{t.contradictions}</div>
          {claims.clashes.length === 0 ? (
            <p style={S.calcNote}>{t.noContradictions}</p>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {claims.clashes.map((c, i) => (
                <div key={i} style={S.clashItem}>
                  <p style={{ ...S.clashSide, ...textStyle }}>{c.first}</p>
                  <p style={{ ...S.clashSide, ...textStyle }}>{c.second}</p>
                  <p style={{ ...S.clashWhy, ...textStyle }}>{c.why}</p>
                </div>
              ))}
            </div>
          )}
          {claims.missed > 0 && (
            <p style={S.warn}>
              {claims.missed} {t.claimsMissed}
            </p>
          )}
        </div>

        <button style={S.ghostBtn} onClick={onBack}>
          {t.backDraft}
        </button>
      </aside>
    </section>
  );
}

/* Two columns, side by side, deliberately the same width and weight.
 * Nothing here declares a winner: the point is to see both cases at
 * full strength and decide yourself. */
function DebateView({ debate, t, onBack }) {
  const lg = debate.lang;
  const dir = T[lg].dir;
  const font = T[lg].font;
  const textStyle = { direction: dir, textAlign: dir === "rtl" ? "right" : "left", fontFamily: font };

  return (
    <section style={S.reviewWrap}>
      {!debate.agree && <p style={S.clash}>{t.thesisClash}</p>}

      <div style={S.debateGrid}>
        {debate.sides.map((sd) => (
          <article
            key={sd.side}
            style={{
              ...S.reportCard,
              borderTop: `3px solid ${sd.side === "for" ? add : cut}`,
            }}
          >
            <header style={S.debateHead}>
              <h2
                style={{
                  ...S.debateTitle,
                  color: sd.side === "for" ? add : cut,
                }}
              >
                {SIDE_LABELS[lg][sd.side]}
              </h2>
            </header>

            {sd.thesis && (
              <div style={S.readsAs}>
                <div style={S.cmpLab}>{t.thesisWord}</div>
                <p style={{ ...S.readsAsText, ...textStyle }}>{sd.thesis}</p>
              </div>
            )}

            <ol style={S.majorList}>
              {sd.case.map((c, i) => (
                <li key={i} style={{ ...S.majorItem, ...textStyle }}>
                  <p style={S.majorPoint}>{c.point}</p>
                  {c.because && <p style={S.majorWhy}>{c.because}</p>}
                  {c.rests_on && (
                    <p style={S.restsOn}>
                      <span style={S.fixLab}>{t.restsOn}: </span>
                      {c.rests_on}
                    </p>
                  )}
                </li>
              ))}
            </ol>

            {sd.strongest && (
              <div style={S.debateBlock}>
                <div style={S.reportLab}>{t.strongestWord}</div>
                <p style={{ ...S.minorItem, ...textStyle }}>{sd.strongest}</p>
              </div>
            )}

            {sd.changes_my_mind && (
              <div style={S.debateBlock}>
                <div style={S.reportLab}>{t.changesMind}</div>
                <p style={{ ...S.minorItem, ...textStyle }}>{sd.changes_my_mind}</p>
              </div>
            )}
          </article>
        ))}
      </div>

      <div style={S.reviewFoot}>
        <button style={S.ghostBtn} onClick={onBack}>
          {t.backDraft}
        </button>
      </div>
    </section>
  );
}

/* The heatmap and the scores. The four judgements are shown as five
 * ticks each with the reason next to them, not as a percentage: a
 * number out of a hundred implies a precision that is not there.
 * Readability sits apart because it is the one figure here that is
 * computed rather than judged. */
function ReadView({ reading, t, onBack }) {
  const [openBand, setOpenBand] = React.useState(null);
  const lg = reading.lang;
  const dir = T[lg].dir;
  const prose = {
    margin: 0,
    direction: dir,
    textAlign: dir === "rtl" ? "right" : "left",
    fontFamily: T[lg].font,
    fontSize: T[lg].size,
    lineHeight: dir === "rtl" ? 2.15 : 1.95,
  };
  const r = reading.read;
  const keys = ["clarity", "logic", "structure", "evidence"];

  return (
    <section style={S.proofWrap}>
      <div style={S.page}>
        <div style={S.legend}>
          {[1, 2, 3].map((b) => (
            <span key={b} style={S.legendItem}>
              <span
                style={{
                  ...S.legendSwatch,
                  background: BAND_COLOR[b],
                  borderColor: BAND_EDGE[b],
                }}
              />
              {t[`band${b}`]}
            </span>
          ))}
        </div>
        <p style={prose}>
          {reading.segs.map((seg, i) =>
            seg.kind === "plain" ? (
              <span key={i}>{seg.text}</span>
            ) : (
              <span
                key={i}
                className={`band ${openBand === seg.num ? "band-open" : ""}`}
                style={{
                  background: BAND_COLOR[seg.band],
                  boxShadow:
                    openBand === seg.num
                      ? `inset 0 -2px 0 ${BAND_EDGE[seg.band]}`
                      : "none",
                  cursor: seg.why ? "pointer" : "default",
                }}
                role={seg.why ? "button" : undefined}
                tabIndex={seg.why ? 0 : undefined}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && seg.why)
                    setOpenBand(openBand === seg.num ? null : seg.num);
                }}
                onClick={() => seg.why && setOpenBand(openBand === seg.num ? null : seg.num)}
              >
                {seg.text}
              </span>
            )
          )}
        </p>
        {openBand != null && (
          <div style={S.bandWhy}>
            {reading.segs.find((x) => x.num === openBand)?.why}
          </div>
        )}
      </div>

      <aside style={S.margin}>
        <div style={S.panel}>
          <div style={S.panelHead}>{t.readability}</div>
          {r.kind === "flesch" || r.kind === "fernandez-huerta" ? (
            <>
              <div style={S.bigNum}>{r.score.toFixed(0)}</div>
              <p style={S.calcNote}>
                {r.kind === "flesch" ? t.fleschNote : t.huertaNote}
              </p>
            </>
          ) : (
            <p style={S.calcNote}>{t.arabicNote}</p>
          )}
          <div style={S.readStats}>
            <span>
              {r.wordsPerSentence.toFixed(1)} {t.wps}
            </span>
            <span>
              {t.longestS}: {r.longest}
            </span>
          </div>
        </div>

        <div style={S.panel}>
          <div style={S.panelHead}>{t.summary}</div>
          {keys.map((k) => (
            <div key={k} style={S.scoreRow}>
              <div style={S.scoreTop}>
                <span style={S.scoreName}>{t[k]}</span>
                <span style={S.ticks}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      style={{
                        ...S.tick,
                        background:
                          i <= reading.scores[k].n ? BAND_EDGE[1] : "rgba(22,25,26,.12)",
                      }}
                    />
                  ))}
                  <b style={S.scoreN}>{reading.scores[k].n}</b>
                </span>
              </div>
              {reading.scores[k].why && (
                <p style={{ ...S.scoreWhy, direction: dir }}>{reading.scores[k].why}</p>
              )}
            </div>
          ))}
          <p style={S.calcNote}>{t.scoresNote}</p>
          {reading.missed > 0 && (
            <p style={S.warn}>
              {reading.missed} {t.missedS}
            </p>
          )}
        </div>

        <button style={S.ghostBtn} onClick={onBack}>
          {t.backDraft}
        </button>
      </aside>
    </section>
  );
}

/* Three report cards. Deliberately not a single merged verdict: the
 * disagreement between referees is the useful part, and flattening it
 * into one score would throw that away. */
function ReviewView({ review, t, onBack, onCopy, copiedMark }) {
  const lg = review.lang;
  const dir = T[lg].dir;
  const font = T[lg].font;
  return (
    <section style={S.reviewWrap}>
      {review.failed > 0 && <p style={S.warn}>{t.reviewerFailed}</p>}
      <div style={S.reviewGrid}>
        {review.reports.map((r, idx) => (
          <article key={r.who} style={S.reportCard}>
            <header style={S.reportHead}>
              <div>
                <div style={S.reportNum}>
                  {t.noteWord === "note" ? "Reviewer" : t.noteWord === "nota" ? "Revisor" : "المراجع"}{" "}
                  {idx + 1}
                </div>
                <div style={S.reportAngle}>{REV_LABELS[lg][r.who]}</div>
              </div>
              <span
                style={{
                  ...S.verdict,
                  color: VERDICT_COLOR[r.verdict],
                  borderColor: VERDICT_COLOR[r.verdict],
                }}
              >
                {VERDICT_LABELS[lg][r.verdict]}
              </span>
            </header>

            {r.reads_as && (
              <div style={S.readsAs}>
                <div style={S.cmpLab}>{t.readsAs}</div>
                <p style={{ ...S.readsAsText, direction: dir, fontFamily: font }}>
                  {r.reads_as}
                </p>
              </div>
            )}

            <div style={S.reportBlock}>
              <div style={S.reportLab}>{t.majorWord}</div>
              {r.major.length === 0 ? (
                <p style={S.noneText}>—</p>
              ) : (
                <ol style={S.majorList}>
                  {r.major.map((m, i) => (
                    <li key={i} style={{ ...S.majorItem, direction: dir }}>
                      <p style={{ ...S.majorPoint, fontFamily: font }}>{m.point}</p>
                      {m.where && (
                        <p style={{ ...S.majorWhere, fontFamily: font }}>“{m.where}”</p>
                      )}
                      {m.why && (
                        <p style={{ ...S.majorWhy, fontFamily: font }}>{m.why}</p>
                      )}
                      {m.fix && (
                        <p style={{ ...S.majorFix, fontFamily: font }}>
                          <span style={S.fixLab}>{t.fixWord}: </span>
                          {m.fix}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {r.minor.length > 0 && (
              <div style={S.reportBlock}>
                <div style={S.reportLab}>{t.minorWord}</div>
                <ul style={S.minorList}>
                  {r.minor.map((m, i) => (
                    <li key={i} style={{ ...S.minorItem, direction: dir, fontFamily: font }}>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>

      <div style={S.reviewFoot}>
        <button style={S.ghostBtn} onClick={onBack}>
          {t.backDraft}
        </button>
        <button style={S.iconPrimary} onClick={onCopy}>
          {copiedMark === "rep" ? <TickIcon /> : <CopyIcon />}
          {t.copyReports}
        </button>
      </div>
    </section>
  );
}

/* ================= tokens ================= */


const ink = "#16191A";
const paper = "#FFFFFF";
const deskBg = "#E3E6E1";
const cut = "#B03A2E";
const add = "#15645A";
const quiet = "#6E736D";

const S = {
  desk: { minHeight: "100vh", background: deskBg, color: ink, fontFamily: UI, paddingBottom: 56 },
  bar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 26px",
    background: "#EDEFEA",
    position: "sticky",
    top: 0,
    zIndex: 5,
  },
  brand: { display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" },
  mark: { fontFamily: FONT_EN, fontSize: 22, color: cut },
  name: { fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" },
  tagline: { fontSize: 13.5, color: quiet },
  barActions: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  count: { fontSize: 13, color: quiet, display: "flex", alignItems: "center", gap: 7 },
  deltaChip: {
    fontStyle: "normal",
    background: "rgba(21,100,90,.1)",
    color: add,
    padding: "2px 7px",
    fontSize: 12,
  },
  main: { padding: "30px 22px 0", display: "flex", justifyContent: "center" },
  draftWrap: { width: "100%", maxWidth: 780 },
  proofWrap: {
    width: "100%",
    maxWidth: 1180,
    display: "flex",
    gap: 26,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  page: {
    background: paper,
    flex: "1 1 470px",
    minWidth: 300,
    padding: "42px 50px",
    boxShadow: "0 1px 2px rgba(0,0,0,.07), 0 12px 28px rgba(0,0,0,.06)",
  },
  textarea: {
    width: "100%",
    minHeight: 290,
    border: "none",
    outline: "none",
    resize: "vertical",
    background: "transparent",
    color: ink,
  },
  controls: { marginTop: 18 },
  row: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" },
  actionRow: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" },
  secondRow: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 12 },
  modeNote: { margin: "14px 0 0", fontSize: 12.5, color: quiet, lineHeight: 1.6, maxWidth: "78ch" },
  meta: { fontSize: 12.5, color: quiet },
  emptyHint: { fontSize: 12.5, color: cut },
  options: {
    marginTop: 16,
    background: "#EDEFEA",
    padding: "18px 20px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 20,
  },
  optLabel: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 },
  optHint: { margin: "8px 0 0", fontSize: 12.5, color: quiet, lineHeight: 1.5 },
  segmented: { display: "flex", flexWrap: "wrap" },
  input: {
    width: "100%",
    padding: "9px 11px",
    border: "1px solid rgba(22,25,26,.22)",
    background: paper,
    fontFamily: UI,
    fontSize: 13.5,
    color: ink,
    outline: "none",
  },
  margin: { flex: "0 1 320px", minWidth: 265, display: "grid", gap: 12 },
  panel: { background: paper, padding: "16px 18px", boxShadow: "0 1px 2px rgba(0,0,0,.05)" },
  panelHead: { fontSize: 13, fontWeight: 600, marginBottom: 12 },
  stats: { display: "flex", gap: 24, marginBottom: 14 },
  statNum: { fontSize: 22, fontWeight: 500, lineHeight: 1.1 },
  statLab: { fontSize: 11.5, color: quiet },
  filterLab: { fontSize: 12, color: quiet, marginBottom: 8 },
  chips: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  bulkRow: { display: "flex", gap: 8 },
  warn: { margin: "12px 0 0", fontSize: 12.5, color: cut, lineHeight: 1.5 },
  clean: { background: paper, padding: "18px 20px", fontSize: 14.5, color: quiet, lineHeight: 1.6 },
  noteHead: { display: "flex", alignItems: "center", gap: 9, marginBottom: 6 },
  noteNum: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    color: ink,
    fontSize: 12,
    fontWeight: 600,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  noteCat: { fontSize: 13, fontWeight: 600 },
  noteRule: { margin: "0 0 6px", fontSize: 12.5, color: quiet, lineHeight: 1.5 },
  noteReason: { margin: "0 0 11px", fontSize: 14, lineHeight: 1.55, color: "#3C413C" },
  compare: {
    borderTop: "1px solid rgba(22,25,26,.12)",
    padding: "11px 0",
    marginBottom: 11,
    display: "grid",
    gap: 9,
  },
  cmpLab: { fontFamily: UI, fontSize: 11, color: quiet, marginBottom: 2 },
  cmpCut: { fontSize: 14.5, color: cut, lineHeight: 1.6 },
  cmpAdd: { fontSize: 14.5, color: add, lineHeight: 1.6 },
  primaryBtn: {
    background: ink,
    color: "#F6F7F4",
    border: "none",
    padding: "10px 18px",
    fontSize: 14,
    fontFamily: UI,
    cursor: "pointer",
  },
  ghostBtn: {
    background: "transparent",
    color: ink,
    border: "1px solid rgba(22,25,26,.28)",
    padding: "9px 15px",
    fontSize: 13.5,
    fontFamily: UI,
    cursor: "pointer",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: quiet,
    fontFamily: UI,
    fontSize: 13.5,
    cursor: "pointer",
    textDecoration: "underline",
    padding: 0,
  },
  keys: { margin: '12px 0 0', fontSize: 11.5, color: quiet },
  memBar: { marginTop: 18 },
  memBody: {
    marginTop: 12,
    background: "#EDEFEA",
    padding: "16px 18px",
    display: "grid",
    gap: 14,
  },
  memNote: { margin: 0, fontSize: 12.5, color: quiet, lineHeight: 1.55, maxWidth: "62ch" },
  memBlock: {},
  memHead: { fontSize: 12.5, fontWeight: 600, marginBottom: 7 },
  memList: { margin: 0, paddingInlineStart: 18, display: "grid", gap: 4 },
  memItem: { fontSize: 13, color: "#3C413C", lineHeight: 1.5, fontFamily: FONT_EN },
  iconBtn: {
    background: "transparent",
    color: ink,
    border: "1px solid rgba(22,25,26,.28)",
    padding: "9px 15px",
    fontSize: 13.5,
    fontFamily: UI,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
  },
  iconPrimary: {
    background: ink,
    color: "#F6F7F4",
    border: "none",
    padding: "10px 18px",
    fontSize: 14,
    fontFamily: UI,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
  },
  noteActions: { display: "flex", gap: 7, alignItems: "center" },
  legend: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 20,
    paddingBottom: 14,
    borderBottom: "1px solid rgba(22,25,26,.1)",
  },
  legendItem: { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: quiet, fontFamily: UI },
  legendSwatch: { width: 14, height: 14, border: "1px solid", display: "inline-block" },
  bandWhy: {
    marginTop: 20,
    paddingTop: 14,
    borderTop: "1px solid rgba(22,25,26,.12)",
    fontSize: 14,
    lineHeight: 1.6,
    color: "#3C413C",
    fontFamily: UI,
  },
  bigNum: { fontSize: 38, fontWeight: 500, lineHeight: 1, marginBottom: 8 },
  calcNote: { margin: "8px 0 0", fontSize: 12, color: quiet, lineHeight: 1.5 },
  readStats: { display: "grid", gap: 3, marginTop: 12, fontSize: 12.5, color: quiet },
  scoreRow: { marginBottom: 14 },
  scoreTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  scoreName: { fontSize: 13.5, fontWeight: 600 },
  ticks: { display: "inline-flex", alignItems: "center", gap: 3 },
  tick: { width: 12, height: 5, display: "inline-block" },
  scoreN: { fontSize: 12, color: quiet, fontWeight: 600, marginInlineStart: 5 },
  scoreWhy: { margin: "5px 0 0", fontSize: 13, lineHeight: 1.5, color: "#3C413C" },
  lesson: {
    marginTop: 13,
    paddingTop: 13,
    borderTop: "1px solid rgba(22,25,26,.12)",
    display: "grid",
    gap: 11,
  },
  lessonRow: {},
  lessonLab: { fontSize: 11, fontWeight: 600, marginBottom: 3 },
  lessonText: { margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "#3C413C" },
  dashWrap: { width: "100%", maxWidth: 1180 },
  dashGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
    alignItems: "start",
  },
  trendLine: { margin: "6px 0 0", fontSize: 19, fontWeight: 500 },
  dashCaveat: {
    marginTop: 20,
    fontSize: 12.5,
    color: quiet,
    lineHeight: 1.6,
    maxWidth: "72ch",
  },
  evDot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  kindRow: { display: "flex", alignItems: "center", gap: 9, marginBottom: 9 },
  kindName: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, width: 104, flexShrink: 0 },
  kindBarWrap: { flex: 1, height: 6, background: "rgba(22,25,26,.08)" },
  kindBar: { display: "block", height: 6 },
  kindNum: { fontSize: 12, color: quiet, width: 18, textAlign: "end" },
  unNote: { display: "block", fontStyle: "normal", fontSize: 12.5, color: quiet, marginTop: 3 },
  clashItem: { borderInlineStart: `3px solid ${cut}`, paddingInlineStart: 11 },
  clashSide: { margin: "0 0 5px", fontSize: 13.5, lineHeight: 1.55, color: "#3C413C" },
  clashWhy: { margin: "7px 0 0", fontSize: 13, lineHeight: 1.55, color: cut },
  debateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 20,
    alignItems: "start",
  },
  debateHead: { marginBottom: 16 },
  debateTitle: { margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" },
  debateBlock: { marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(22,25,26,.12)" },
  restsOn: {
    margin: "7px 0 0",
    fontSize: 13.5,
    lineHeight: 1.55,
    color: "#6B5B2E",
    background: "rgba(232,217,138,.28)",
    padding: "6px 9px",
  },
  clash: {
    background: "rgba(176,58,46,.08)",
    borderInlineStart: `3px solid ${cut}`,
    padding: "12px 16px",
    fontSize: 14,
    lineHeight: 1.55,
    marginTop: 0,
    marginBottom: 20,
    color: "#3C413C",
  },
  reviewWrap: { width: "100%", maxWidth: 1180 },
  reviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 18,
    alignItems: "start",
  },
  reportCard: {
    background: paper,
    padding: "22px 24px",
    boxShadow: "0 1px 2px rgba(0,0,0,.07), 0 10px 24px rgba(0,0,0,.05)",
  },
  reportHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    borderBottom: "1px solid rgba(22,25,26,.12)",
    paddingBottom: 12,
    marginBottom: 14,
  },
  reportNum: { fontSize: 12, color: quiet },
  reportAngle: { fontSize: 15, fontWeight: 600, marginTop: 2 },
  verdict: {
    fontSize: 11.5,
    fontWeight: 600,
    border: "1px solid",
    padding: "3px 8px",
    whiteSpace: "nowrap",
  },
  readsAs: { marginBottom: 16 },
  readsAsText: { margin: "3px 0 0", fontSize: 14.5, lineHeight: 1.6, color: "#3C413C" },
  reportBlock: { marginBottom: 16 },
  reportLab: { fontSize: 12, fontWeight: 600, color: quiet, marginBottom: 8 },
  majorList: { margin: 0, paddingInlineStart: 20, display: "grid", gap: 16 },
  majorItem: { fontSize: 14 },
  majorPoint: { margin: 0, fontWeight: 600, lineHeight: 1.5, fontSize: 14.5 },
  majorWhere: {
    margin: "5px 0 0",
    fontSize: 13.5,
    color: cut,
    lineHeight: 1.55,
    borderInlineStart: `2px solid ${cut}`,
    paddingInlineStart: 9,
  },
  majorWhy: { margin: "6px 0 0", fontSize: 14, lineHeight: 1.6, color: "#3C413C" },
  majorFix: { margin: "6px 0 0", fontSize: 14, lineHeight: 1.6, color: add },
  fixLab: { fontFamily: UI, fontSize: 12, color: quiet },
  minorList: { margin: 0, paddingInlineStart: 20, display: "grid", gap: 7 },
  minorItem: { fontSize: 14, lineHeight: 1.55, color: "#3C413C" },
  noneText: { margin: 0, color: quiet, fontSize: 14 },
  reviewFoot: { display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" },
  error: { marginTop: 14, fontSize: 13.5, color: cut },
  toast: {
    position: "fixed",
    bottom: 26,
    left: "50%",
    transform: "translateX(-50%)",
    background: ink,
    color: "#F6F7F4",
    padding: "10px 18px",
    fontSize: 13.5,
    zIndex: 20,
  },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Spectral:wght@400;500&family=Amiri:wght@400;700&display=swap');
*{box-sizing:border-box}
body{margin:0}
.edit{cursor:pointer;border-bottom:1px solid rgba(176,58,46,.3);transition:background .15s}
.edit:hover{background:rgba(232,217,138,.32)}
.edit-on{background:rgba(232,217,138,.58)}
.edit-muted{border-bottom:none;cursor:default}
.edit-muted:hover{background:transparent}
.flag{font-family:${UI};font-size:10px;font-weight:600;color:${cut};padding:0 2px;vertical-align:super}
.cut{color:${cut};text-decoration:line-through;text-decoration-thickness:1px}
.add{color:${add};text-decoration:none;border-bottom:1.5px solid ${add}}
.note{background:#fff;padding:15px 17px;cursor:pointer;border-inline-start:3px solid transparent;transition:border-color .15s,opacity .15s;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.note:hover{border-inline-start-color:rgba(232,217,138,.9)}
.note-on{border-inline-start-color:${cut}}
.note-off{opacity:.5}
.toggle{background:transparent;border:1px solid rgba(22,25,26,.25);padding:6px 11px;font-size:12.5px;font-family:${UI};cursor:pointer;color:${ink}}
.toggle:hover{background:rgba(22,25,26,.05)}
.icon-only{display:inline-flex;align-items:center;justify-content:center;padding:6px 9px}
.chip{background:rgba(22,25,26,.05);border:1px solid transparent;padding:4px 9px;font-size:12px;font-family:${UI};cursor:pointer;color:${ink}}
.chip b{font-weight:600;color:${quiet};padding-inline-start:3px}
.chip:hover{border-color:rgba(22,25,26,.25)}
.chip-off{opacity:.4;text-decoration:line-through}
.band{transition:box-shadow .15s}
.band:hover{filter:brightness(.97)}
.chip-static{cursor:default}
.chip-static:hover{border-color:transparent}
.chip-reg{background:rgba(21,100,90,.1)}
.seg{background:#fff;border:1px solid rgba(22,25,26,.22);padding:7px 13px;font-size:13px;font-family:${UI};cursor:pointer;color:${ink};margin-inline-end:-1px}
.seg-on{background:${ink};color:#F6F7F4;border-color:${ink};position:relative;z-index:1}
button:disabled{opacity:.4;cursor:not-allowed}
button:focus-visible,.note:focus-visible,.edit:focus-visible{outline:2px solid ${add};outline-offset:2px}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
@media (max-width:760px){.note{padding:13px 14px}}
`;
