// ===========================================================
// SeniorsOS — shared behaviour
// ===========================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- mobile nav toggle ---------- */
  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      siteNav.classList.toggle('open');
    });
  }

  /* ---------- the dial (module selector) ---------- */
  const modules = [
    { name: "Bill Buster", tag: "free", label: "Free", title: "Bill Buster",
      desc: "Feed in a confusing bill and get back what it actually means, what you owe, and whether anything looks off.",
      example: "\u201cWhy did my electricity bill jump $40 this month?\u201d" },
    { name: "Tradie Finder", tag: "free", label: "Free", title: "Tradie Finder",
      desc: "Describe the job that needs doing and get a plain checklist for finding, vetting, and pricing a tradesperson.",
      example: "\u201cMy hot water system is leaking \u2014 who do I call and what should it cost?\u201d" },
    { name: "Letter Writer", tag: "free", label: "Free", title: "Letter Writer",
      desc: "Turn a rough complaint or request into a clear, properly addressed letter \u2014 ready to send or print.",
      example: "\u201cWrite a letter asking my strata to fix the broken gate.\u201d" },
    { name: "Getting Around", tag: "free", label: "Free", title: "Getting Around",
      desc: "Plan a trip, a transport booking, or an appointment with step-by-step directions in plain language.",
      example: "\u201cHow do I book a wheelchair-accessible taxi to the hospital?\u201d" },
    { name: "Car Basics", tag: "free", label: "Free", title: "Car Basics",
      desc: "Ask about a dashboard light, a strange noise, or a service quote and get a straight answer.",
      example: "\u201cWhat does the orange engine light actually mean?\u201d" },
    { name: "Scam Shield", tag: "free", label: "Free", title: "Scam Shield",
      desc: "Paste in a suspicious text, email, or call script and get a plain answer: is this safe, and what to do next.",
      example: "\u201cI got a text saying my parcel couldn't be delivered \u2014 is this real?\u201d" },
    { name: "Trusted Real Estate Agents", tag: "free", label: "Free", title: "Trusted Real Estate Agents",
      desc: "A short, hand-vetted list of agents we trust for integrity, care and professionalism when it's time to sell.",
      example: "\u201cWho can I trust to sell mum's house in Sydney without pressuring her?\u201d" },
  ];

  const dial = document.getElementById('dial');
  if (dial) {
    const pointer = document.getElementById('pointer');
    const readoutTag = document.getElementById('readout-tag');
    const readoutTitle = document.getElementById('readout-title');
    const readoutDesc = document.getElementById('readout-desc');
    const readoutLink = document.getElementById('readout-link');

    const radius = 92;
    const center = 130;
    const defaultIndex = dial.dataset.default ? parseInt(dial.dataset.default, 10) : 5;

    modules.forEach((m, i) => {
      const angle = (360 / modules.length) * i;
      const rad = (angle - 90) * Math.PI / 180;
      const x = center + radius * Math.cos(rad) - 23;
      const y = center + radius * Math.sin(rad) - 23;

      const btn = document.createElement('button');
      btn.className = 'dial-btn' + (i === defaultIndex ? ' active' : '');
      btn.style.left = x + 'px';
      btn.style.top = y + 'px';
      btn.textContent = m.name.split(' ').map(w => w[0]).join('');
      btn.setAttribute('aria-label', m.name);
      btn.dataset.index = i;

      btn.addEventListener('click', () => {
        document.querySelectorAll('.dial-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        pointer.style.transform = `translate(-50%, 0) rotate(${angle}deg)`;
        readoutTag.textContent = m.label;
        readoutTag.className = 'tag ' + m.tag;
        readoutTitle.textContent = m.title;
        readoutDesc.textContent = m.desc;
        if (readoutLink) {
          readoutLink.href = 'toolkit.html#' + m.name.toLowerCase().replace(/\s+/g, '-');
        }
      });

      dial.appendChild(btn);
    });

    const initAngle = (360 / modules.length) * defaultIndex;
    pointer.style.transform = `translate(-50%, 0) rotate(${initAngle}deg)`;
  }

  /* ---------- shop tabs ---------- */
  const shopTabs = document.querySelectorAll('.shop-tab');
  if (shopTabs.length) {
    shopTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.shop-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.panel).classList.add('active');
      });
    });
  }

  /* ---------- suggest / contact form (Netlify Forms) ---------- */
  const suggestForm = document.getElementById('suggestForm');
  if (suggestForm) {
    suggestForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const success = document.getElementById('formSuccess');
      const data = new FormData(suggestForm);

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString(),
      })
        .catch(() => { /* fine outside a deployed Netlify environment */ })
        .finally(() => {
          if (success) success.classList.add('show');
          suggestForm.reset();
        });
    });
  }

});
