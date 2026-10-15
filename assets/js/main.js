/* Uday Studio — interactions
   Principles: respond on press, animate from the live value, keep everything
   interruptible, and fall back to cross-fades under prefers-reduced-motion. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const EASE_OUT = 'cubic-bezier(.22,1,.36,1)';
  const EASE_IN = 'cubic-bezier(.64,0,.78,0)';
  const WA = '919611475623';

  $('#yr').textContent = new Date().getFullYear();

  /* ---------------- Nav: material on scroll + active section ---------------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const links = $$('.nav__links a');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + e.target.id)));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['work', 'packages', 'services', 'keepsakes', 'visit'].forEach((id) => spy.observe(document.getElementById(id)));

  /* ---------------- Mobile sheet (enters & exits on the right) ---------------- */
  const sheet = $('#sheet');
  const burger = $('#burger');
  let lastFocus = null;
  const openSheet = () => {
    lastFocus = document.activeElement;
    sheet.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('is-open')));
    burger.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
    $('.sheet__close', sheet).focus();
  };
  const closeSheet = () => {
    sheet.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
    setTimeout(() => { if (!sheet.classList.contains('is-open')) sheet.hidden = true; }, 340);
    lastFocus && lastFocus.focus({ preventScroll: true });
  };
  burger.addEventListener('click', openSheet);
  sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

  /* ---------------- Portfolio ---------------- */
  const PHOTOS = [
    ['w-couple-lift', 'w', 1067, 1600, 'Pre-wedding: a lift on a sunlit forest path'],
    ['k-krishna', 'k', 1067, 1600, 'Little Krishna with peacock feather'],
    ['w-garland', 'w', 1600, 1067, 'Playful garland moment, pre-wedding'],
    ['p-blossom', 'p', 1067, 1600, 'Portrait beneath pink blossoms'],
    ['k-wreath', 'k', 1600, 1067, 'Newborn in a floral swing wreath'],
    ['w-snow-twirl', 'w', 1600, 1067, 'Couple twirl in falling snow, studio set'],
    ['k-cupid', 'k', 1067, 1600, 'Baby cupid portrait with bokeh'],
    ['p-mother-baby', 'p', 1600, 1067, 'Mother cradling her newborn'],
    ['w-ceremony', 'w', 1600, 1067, 'Traditional wedding with family'],
    ['k-boat', 'k', 1600, 1067, 'Little sailor in a wooden boat set'],
    ['p-floral', 'p', 1067, 1600, 'Floral dress portrait on a tree-lined street'],
    ['w-night-dance', 'w', 1600, 1067, 'Engagement dance by the temple at night'],
    ['k-nest', 'k', 1600, 1066, 'Newborn curled in a woven nest'],
    ['k-gown', 'k', 1291, 1600, 'Birthday girl in a pink gown'],
    ['w-bangles', 'w', 1600, 1067, 'Bridal bangles and mehendi detail'],
    ['p-man', 'p', 1067, 1600, 'Men’s portrait session'],
    ['k-camera', 'k', 1600, 1067, 'Baby with vintage camera props'],
    ['w-family-baby', 'w', 1600, 1067, 'Parents lifting their little one'],
    ['k-sofa', 'k', 1600, 1067, 'Little prince on a white sofa'],
    ['p-mother-kids', 'p', 1280, 853, 'Mother and children on the lawn'],
    ['k-bench', 'k', 1600, 900, 'Smiles on the pastel bench'],
    ['w-ritual', 'w', 1600, 1067, 'Ritual detail with flowers and brass'],
    ['k-teddy', 'k', 1440, 809, 'Baby hugging a giant pink teddy'],
    ['p-petals', 'p', 1067, 1600, 'Petal toss under a flowering tree'],
    ['k-mom', 'k', 1600, 1067, 'Mother and daughter, outdoor shoot'],
    ['k-nest-blue', 'k', 1600, 1067, 'Newborn set with blue florals'],
  ];
  const gallery = $('#gallery');
  gallery.innerHTML = PHOTOS.map(([f, c, w, h, alt], i) => `
    <button class="tile reveal" data-cat="${c}" data-i="${i}" aria-label="Open photo: ${alt}">
      <img src="assets/img/${f}.webp" width="${w}" height="${h}" alt="${alt}" loading="lazy" decoding="async" />
      <figcaption>${alt}</figcaption>
    </button>`).join('');
  const tiles = $$('.tile', gallery);

  let visible = tiles.slice();
  $$('.filters button').forEach((btn) => btn.addEventListener('click', () => {
    $$('.filters button').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
    const f = btn.dataset.filter;
    // cross-fade content replacement within the same container
    gallery.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: EASE_IN }).onfinish = () => {
      tiles.forEach((t) => t.classList.toggle('is-hidden', f !== 'all' && t.dataset.cat !== f));
      visible = tiles.filter((t) => !t.classList.contains('is-hidden'));
      tiles.forEach((t) => { t.style.opacity = ''; t.style.transform = ''; });
      gallery.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: EASE_OUT });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
  }));

  /* ---------------- Lightbox: FLIP from thumbnail, swipe with momentum ---------------- */
  const lb = $('#lb');
  const lbImg = $('#lbImg');
  const lbCap = $('#lbCap');
  const lbCount = $('#lbCount');
  let cur = -1;          // index into `visible`
  let opener = null;

  const rectOf = (el) => el.getBoundingClientRect();
  const flipFrom = (from, to) => {
    const sx = from.width / to.width, sy = from.height / to.height;
    const dx = from.left - to.left, dy = from.top - to.top;
    return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  };
  const liveTransform = (el) => { const t = getComputedStyle(el).transform; return t === 'none' ? 'none' : t; };
  const stopAnims = (el) => { const t = liveTransform(el); el.getAnimations().forEach((a) => a.cancel()); el.style.transform = t === 'none' ? '' : t; };

  const setPhoto = (i) => {
    cur = (i + visible.length) % visible.length;
    const t = visible[cur];
    const img = $('img', t);
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbImg.width = img.width; lbImg.height = img.height;
    lbCap.textContent = img.alt;
    lbCount.textContent = `${cur + 1} / ${visible.length}`;
  };

  const openLB = async (tile) => {
    opener = tile;
    setPhoto(visible.indexOf(tile));
    lb.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    try { await lbImg.decode(); } catch (_) {}
    lb.classList.add('is-open');
    const thumb = $('img', tile);
    if (reduce.matches) {
      lbImg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    } else {
      lbImg.animate([{ transform: flipFrom(rectOf(thumb), rectOf(lbImg)), borderRadius: '20px' }, { transform: 'none' }],
        { duration: 440, easing: EASE_OUT });
    }
    $('.lb__close').focus({ preventScroll: true });
  };

  const closeLB = () => {
    if (lb.hidden) return;
    stopAnims(lbImg);
    lb.classList.remove('is-open');
    const tile = visible[cur];
    const thumb = tile && $('img', tile);
    const r = thumb && rectOf(thumb);
    const onScreen = r && r.bottom > 0 && r.top < innerHeight;
    const finish = () => {
      lb.hidden = true; lbImg.style.transform = ''; lbImg.style.opacity = '';
      document.documentElement.style.overflow = '';
      (tile || opener)?.focus({ preventScroll: true });
    };
    if (reduce.matches || !onScreen) {
      lbImg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: EASE_IN, fill: 'forwards' }).onfinish = finish;
    } else {
      // exit along the same path it entered — back into its thumbnail
      lbImg.style.transform = '';
      const target = flipFrom(r, rectOf(lbImg));
      lbImg.animate([{ transform: liveTransform(lbImg) === 'none' ? 'none' : liveTransform(lbImg) }, { transform: target }],
        { duration: 300, easing: EASE_OUT, fill: 'forwards' }).onfinish = finish;
    }
  };

  const go = (dir, fromX = 0, velocity = 0) => {
    stopAnims(lbImg);
    const w = innerWidth;
    if (reduce.matches) {
      setPhoto(cur + dir);
      lbImg.style.transform = '';
      lbImg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
      return;
    }
    const outDur = Math.max(140, Math.min(260, Math.abs((w - Math.abs(fromX)) / (Math.abs(velocity) || 1.8))));
    lbImg.animate([{ transform: `translateX(${fromX}px)`, opacity: 1 }, { transform: `translateX(${-dir * w * 0.6}px)`, opacity: 0 }],
      { duration: outDur, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' }).onfinish = async () => {
      setPhoto(cur + dir);
      try { await lbImg.decode(); } catch (_) {}
      lbImg.getAnimations().forEach((a) => a.cancel());
      lbImg.style.transform = '';
      lbImg.animate([{ transform: `translateX(${dir * w * 0.25}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 380, easing: EASE_OUT });
    };
  };

  gallery.addEventListener('click', (e) => { const t = e.target.closest('.tile'); if (t) openLB(t); });
  lb.addEventListener('click', (e) => { if (e.target.closest('[data-lb-close]')) closeLB(); });
  $('#lbPrev').addEventListener('click', () => go(-1));
  $('#lbNext').addEventListener('click', () => go(1));
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLB();
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Tab') { // keep focus inside the viewer
      const f = $$('.lb__btn', lb); const i = f.indexOf(document.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  // 1:1 drag with velocity history, momentum projection and rubber-banding
  const project = (v, d = 0.998) => (v / 1000) * d / (1 - d);           // v in px/s
  const rubber = (x, dim, c = 0.55) => (x * dim * c) / (dim + c * Math.abs(x));
  let drag = null;
  lbImg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    stopAnims(lbImg);
    const m = new DOMMatrixReadOnly(liveTransform(lbImg) === 'none' ? undefined : liveTransform(lbImg));
    drag = { id: e.pointerId, x0: e.clientX - m.m41, y0: e.clientY - m.m42, axis: null, hist: [] };
    lbImg.setPointerCapture(e.pointerId);
  });
  lbImg.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    let dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.axis) { if (Math.hypot(dx, dy) < 10) return; drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; }
    drag.hist.push({ x: dx, y: dy, t: e.timeStamp }); if (drag.hist.length > 6) drag.hist.shift();
    if (drag.axis === 'x') {
      lbImg.style.transform = `translateX(${dx}px)`;
    } else {
      const y = dy < 0 ? rubber(dy, innerHeight) : dy;
      const s = 1 - Math.min(Math.abs(y) / innerHeight, 1) * 0.25;
      lbImg.style.transform = `translateY(${y}px) scale(${s})`;
      $('.lb__scrim').style.opacity = String(1 - Math.min(Math.abs(y) / 400, 0.6));
    }
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const h = drag.hist, axis = drag.axis; drag = null;
    $('.lb__scrim').style.opacity = '';
    if (!axis || h.length < 2) { lbImg.style.transform = ''; return; }
    const a = h[0], b = h[h.length - 1], dt = Math.max(1, b.t - a.t);
    const vx = ((b.x - a.x) / dt) * 1000, vy = ((b.y - a.y) / dt) * 1000;
    if (axis === 'x') {
      const end = b.x + project(vx);
      if (Math.abs(end) > innerWidth * 0.28) return go(end < 0 ? 1 : -1, b.x, vx / 1000);
      lbImg.animate([{ transform: `translateX(${b.x}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,1.2,.4,1)' });
      lbImg.style.transform = '';
    } else {
      if (b.y + project(vy) > innerHeight * 0.3) return closeLB();
      const from = lbImg.style.transform;
      lbImg.style.transform = '';
      lbImg.animate([{ transform: from }, { transform: 'none' }], { duration: 380, easing: EASE_OUT });
    }
  };
  lbImg.addEventListener('pointerup', endDrag);
  lbImg.addEventListener('pointercancel', endDrag);

  /* ---------------- Feature 1: photo shuffler ---------------- */
  const shufImgs = $$('#shuffler img');
  let order = [0, 1, 2];
  const paint = () => shufImgs.forEach((img, i) => (img.dataset.pos = order.indexOf(i)));
  paint();

  /* ---------------- Feature 2: aperture iris (signature) ---------------- */
  const iris = $('#iris');
  iris.setAttribute('viewBox', '-125 -100 250 200');
  iris.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  iris.innerHTML = '<path class="iris__blades" fill="#1B1712" fill-rule="evenodd" opacity=".94"/><g class="iris__edges" stroke="rgba(232,163,23,.55)" stroke-width="1.2" fill="none"></g><circle r="98" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1"/>';
  const blades = $('.iris__blades', iris), edges = $('.iris__edges', iris);
  const drawIris = (r) => {
    const rot = -r * 0.55 * Math.PI / 180;
    const V = Array.from({ length: 6 }, (_, i) => {
      const a = i * Math.PI / 3 + rot; return [r * Math.cos(a), r * Math.sin(a)];
    });
    const hex = 'M' + V.map((p) => p.map((n) => n.toFixed(2)).join(' ')).join('L') + 'Z';
    blades.setAttribute('d', 'M-140 -120H140V120H-140Z' + hex);
    edges.innerHTML = V.map((p, i) => {
      const q = V[(i + 1) % 6], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy) || 1;
      const e = [p[0] + dx / len * 260, p[1] + dy / len * 260];
      return `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${e[0].toFixed(1)}" y2="${e[1].toFixed(1)}"/>`;
    }).join('');
  };
  drawIris(reduce.matches ? 150 : 22);

  /* ---------------- Feature 3: date picker loop ---------------- */
  const calGrid = $('#calGrid'), calCursor = $('#calCursor'), calChip = $('#calChip');
  calGrid.innerHTML = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<span class="wk">${d}</span>`).join('') +
    '<span></span><span></span>' + Array.from({ length: 30 }, (_, i) => `<span class="${[4, 11, 17, 24].includes(i + 1) ? 'busy' : ''}">${i + 1}</span>`).join('');
  const days = $$('span:not(.wk)', calGrid).filter((s) => s.textContent && !s.classList.contains('busy'));
  const calCard = calGrid.parentElement;
  const calStep = () => {
    days.forEach((d) => d.classList.remove('pick')); calChip.classList.remove('on');
    const target = days[8 + Math.floor(Math.random() * 14)];
    const cr = calCard.getBoundingClientRect(), tr = target.getBoundingClientRect();
    calCursor.style.transform = `translate(${tr.left - cr.left + tr.width * 0.55}px, ${tr.top - cr.top + tr.height * 0.55}px)`;
    setTimeout(() => { target.classList.add('pick'); calChip.classList.add('on'); }, 950);
  };
  if (reduce.matches) { days[14].classList.add('pick'); calChip.classList.add('on'); calCursor.style.display = 'none'; }

  /* Run feature loops only while visible */
  const loops = { shuf: null, iris: null, cal: null };
  let irisT0 = 0;
  const irisTick = (t) => {
    if (!irisT0) irisT0 = t;
    const p = ((t - irisT0) / 5200) % 1;                      // open, hold, close
    const k = p < .35 ? p / .35 : p < .7 ? 1 : 1 - (p - .7) / .3;
    const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    drawIris(22 + e * 150);
    loops.iris = requestAnimationFrame(irisTick);
  };
  const featIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    const el = en.target;
    if (reduce.matches) return;
    if (el.id === 'shuffler') {
      clearInterval(loops.shuf);
      if (en.isIntersecting) loops.shuf = setInterval(() => { order.push(order.shift()); paint(); }, 2600);
    } else if (el.classList.contains('iris-card')) {
      cancelAnimationFrame(loops.iris); irisT0 = 0;
      if (en.isIntersecting) loops.iris = requestAnimationFrame(irisTick);
    } else if (el.classList.contains('cal')) {
      clearInterval(loops.cal);
      if (en.isIntersecting) { calStep(); loops.cal = setInterval(calStep, 3200); }
    }
  }), { threshold: 0.2 });
  [$('#shuffler'), $('.iris-card'), calCard].forEach((el) => featIO.observe(el));

  /* ---------------- Count-up ---------------- */
  const countIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    countIO.unobserve(en.target);
    const el = en.target, end = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), suf = el.dataset.suffix || '';
    if (reduce.matches) return;
    const t0 = performance.now(), dur = 1200;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = (end * e).toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------------- Contact form → WhatsApp ---------------- */
  const form = $('#form');
  const submit = $('.submit', form);
  const rules = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Please tell us your name.'),
    phone: (v) => (/^(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/.test(v.trim()) ? '' : 'Enter a 10-digit mobile number, e.g. 98765 43210.'),
  };
  const check = (input) => {
    const msg = rules[input.name] ? rules[input.name](input.value) : '';
    input.closest('.field').classList.toggle('has-error', !!msg);
    input.setAttribute('aria-invalid', String(!!msg));
    $('#e-' + input.name).textContent = msg;
    return !msg;
  };
  ['name', 'phone'].forEach((n) => {
    const el = form.elements[n];
    el.addEventListener('blur', () => el.value && check(el));
    el.addEventListener('input', () => el.closest('.field').classList.contains('has-error') && check(el));
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = ['name', 'phone'].map((n) => form.elements[n]).filter((el) => !check(el));
    if (bad.length) { bad[0].focus(); return; }
    const f = form.elements;
    const date = f.date.value ? new Date(f.date.value + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not decided yet';
    const text = `Hi Uday Studio! I'd like to book a shoot.\n\nName: ${f.name.value.trim()}\nPhone: ${f.phone.value.trim()}\nOccasion: ${f.type.value}\nDate: ${date}` + (f.msg.value.trim() ? `\nDetails: ${f.msg.value.trim()}` : '');
    submit.dataset.state = 'busy';
    setTimeout(() => {
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      submit.dataset.state = 'done';
      $('#formNote').textContent = 'WhatsApp opened in a new tab. Just press send. If it didn’t open, call us on 96114 75623.';
      setTimeout(() => (submit.dataset.state = 'idle'), 6000);
    }, 700);
  });

  /* ---------------- GSAP: hero shutter, reveals, sticky stack ---------------- */
  const start = () => {
    if (!window.gsap) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Hero — shutter opens on the main photo (rotating hexagonal iris)
      const sh = $('#heroShutter');
      const st = { r: 0 };
      const clip = () => {
        const w = sh.offsetWidth, h = sh.offsetHeight, cx = w / 2, cy = h / 2, rot = (-st.r * 0.12) * Math.PI / 180;
        const pts = Array.from({ length: 6 }, (_, i) => {
          const a = i * Math.PI / 3 + rot; return `${(cx + st.r * Math.cos(a)).toFixed(1)}px ${(cy + st.r * Math.sin(a)).toFixed(1)}px`;
        });
        sh.style.clipPath = `polygon(${pts.join(',')})`;
      };
      const full = () => Math.hypot(sh.offsetWidth, sh.offsetHeight) / 2 / Math.cos(Math.PI / 6) + 4;
      clip();
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      document.documentElement.classList.remove('js-anim');
      tl.fromTo('.h-in', { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.08 }, 0.1)
        .to(st, { r: full(), duration: 1.5, ease: 'power3.inOut', onUpdate: clip, onComplete: () => (sh.style.clipPath = '') }, 0.15)
        .from('#heroShutter img', { scale: 1.18, duration: 1.8, ease: 'power3.out' }, 0.15)
        .fromTo('.h-pop', { y: 30, scale: 0.92, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.9, stagger: 0.1 }, 0.85);

      // Hero parallax depth (subtle)
      gsap.to('.ph--b', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.ph--c', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

      // Section reveals, staggered 50ms
      gsap.set('.reveal', { opacity: 0, y: 26 });
      ScrollTrigger.batch('.reveal', {
        start: 'top 90%', once: true,
        onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05, overwrite: true }),
      });

      // Sticky stack — earlier cards recede as the next one slides over
      const cards = $$('.stack__card');
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return;
        gsap.to(card, {
          scale: 0.93, opacity: 0.55, ease: 'none',
          scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 30%', scrub: true },
        });
      });
      return () => { $('#heroShutter').style.clipPath = ''; };
    });
  };
  if (document.readyState === 'complete' || window.gsap) start(); else addEventListener('load', start, { once: true });
})();
