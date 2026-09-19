/* ═══════════════════════════════════════════════════════════════
   DrayConnect — Constellation
   1. Particle constellation (the signature visual)
   2. Nav solidify
   3. Scroll reveal
   4. Quote form  → WhatsApp + optional email + local backup
   5. WhatsApp pill wiring
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CFG = window.DRAYCONNECT_CONFIG || {};
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─────────────────────────────────────────────────────────────
     1. CONSTELLATION
     A house built from a field of tiny outlined triangles — the
     brand idea literally: a home made of distributed points of
     light. Particles are batched by colour so the whole field
     costs ~18 stroke calls per frame instead of ~1500.
     ───────────────────────────────────────────────────────────── */
  function constellation(canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Particle palette — saturated, never grayscale
    var PALETTE = ['#8052ff', '#ffb829', '#15846e', '#4a7dff', '#c86bff', '#e8e8ff'];
    var BUCKETS = [0.28, 0.55, 0.9];   // alpha tiers

    var W = 0, H = 0, DPR = 1;
    var parts = [];
    var nodes = [];
    var batches = [];

    // House outline in normalised space (0..1, y down)
    var ROOF = [[0.50, 0.08], [0.06, 0.45], [0.94, 0.45]];
    var BODY = [0.16, 0.45, 0.84, 0.93];   // x0, y0, x1, y1

    function inTriangle(px, py, t) {
      var ax = t[0][0], ay = t[0][1], bx = t[1][0], by = t[1][1], cx = t[2][0], cy = t[2][1];
      var d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      var a = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d;
      var b = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d;
      return a >= 0 && b >= 0 && a + b <= 1;
    }
    function inHouse(px, py) {
      if (inTriangle(px, py, ROOF)) return true;
      return px >= BODY[0] && px <= BODY[2] && py >= BODY[1] && py <= BODY[3];
    }

    function build() {
      parts = [];
      nodes = [];

      var dense = window.innerWidth < 700 ? 620 : 1150;
      var ambient = window.innerWidth < 700 ? 120 : 240;

      // Fill the house shape by rejection sampling
      var placed = 0, guard = 0;
      while (placed < dense && guard < dense * 60) {
        guard++;
        var x = Math.random(), y = Math.random();
        if (!inHouse(x, y)) continue;
        parts.push(mk(x, y, 1));
        placed++;
      }

      // Ambient drift outside the shape — atmospheric depth
      for (var i = 0; i < ambient; i++) {
        var ax = Math.random(), ay = Math.random();
        if (inHouse(ax, ay)) continue;
        var p = mk(ax, ay, 0.55);
        p.bucket = 0;
        parts.push(p);
      }

      // A handful of brighter "device" nodes — lamps, cameras, sockets
      var spots = [
        [0.50, 0.24], [0.28, 0.58], [0.72, 0.58],
        [0.50, 0.70], [0.34, 0.84], [0.66, 0.84], [0.50, 0.40]
      ];
      for (var s = 0; s < spots.length; s++) {
        nodes.push({
          x: spots[s][0], y: spots[s][1],
          col: s % 3 === 0 ? '#ffb829' : '#8052ff',
          phase: Math.random() * Math.PI * 2,
          r: 3.4
        });
      }

      // Pre-group into colour + alpha batches
      batches = [];
      var map = {};
      for (var k = 0; k < parts.length; k++) {
        var pt = parts[k];
        var key = pt.col + '|' + pt.bucket;
        if (!map[key]) {
          map[key] = { col: pt.col, alpha: BUCKETS[pt.bucket], items: [] };
          batches.push(map[key]);
        }
        map[key].items.push(pt);
      }
    }

    function mk(x, y, scale) {
      return {
        x: x, y: y,
        size: (0.9 + Math.random() * 1.9) * scale,
        rot: Math.random() * Math.PI * 2,
        col: PALETTE[(Math.random() * PALETTE.length) | 0],
        bucket: (Math.random() * 3) | 0,
        phase: Math.random() * Math.PI * 2,
        amp: 0.7 + Math.random() * 2.1
      };
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function tri(px, py, size, rot) {
      var r = size * 1.5;
      ctx.moveTo(px + Math.cos(rot) * r, py + Math.sin(rot) * r);
      ctx.lineTo(px + Math.cos(rot + 2.0944) * r, py + Math.sin(rot + 2.0944) * r);
      ctx.lineTo(px + Math.cos(rot + 4.1888) * r, py + Math.sin(rot + 4.1888) * r);
      ctx.closePath();
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;

      for (var b = 0; b < batches.length; b++) {
        var batch = batches[b];
        ctx.beginPath();
        var items = batch.items;
        for (var i = 0; i < items.length; i++) {
          var p = items[i];
          var dx = Math.sin(t * 0.00022 + p.phase) * p.amp;
          var dy = Math.cos(t * 0.00019 + p.phase * 1.3) * p.amp;
          tri(p.x * W + dx, p.y * H + dy, p.size, p.rot + t * 0.00004);
        }
        ctx.globalAlpha = batch.alpha;
        ctx.strokeStyle = batch.col;
        ctx.stroke();
      }

      // Device nodes — filled, with a soft halo
      for (var n = 0; n < nodes.length; n++) {
        var nd = nodes[n];
        var pulse = 0.55 + 0.45 * Math.sin(t * 0.0011 + nd.phase);
        var nx = nd.x * W, ny = nd.y * H;
        var g = ctx.createRadialGradient(nx, ny, 0, nx, ny, 26);
        g.addColorStop(0, nd.col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.16 * pulse;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(nx, ny, 26, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.5 + 0.5 * pulse;
        ctx.fillStyle = nd.col;
        ctx.beginPath();
        tri(nx, ny, nd.r, t * 0.0004 + nd.phase);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    var raf = null, visible = true, start = 0;
    function loop(ts) {
      if (!start) start = ts;
      draw(ts - start);
      raf = requestAnimationFrame(loop);
    }
    function play() {
      if (reduceMotion || raf !== null || !visible) return;
      raf = requestAnimationFrame(loop);
    }
    function pause() {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }

    function init() {
      resize();
      build();
      draw(0);              // always paint once, even if rAF never runs
      if (reduceMotion) return;
      play();
    }

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        resize();
        build();
        // Setting canvas.width wipes the bitmap. Repaint synchronously so the
        // field is never blank while rAF is paused (hidden tab, offscreen hero).
        draw(0);
      }, 180);
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause(); else play();
    });

    // Stop burning frames when the hero scrolls away
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) play(); else pause();
      }, { threshold: 0 }).observe(canvas);
    }

    init();
  }

  var cvs = document.getElementById('constellation');
  if (cvs) constellation(cvs);

  /* ─────────────────────────────────────────────────────────────
     2. NAV
     ───────────────────────────────────────────────────────────── */
  (function () {
    var nav = document.getElementById('nav');
    if (!nav) return;
    var ticking = false;
    function upd() { nav.classList.toggle('solid', window.scrollY > 14); ticking = false; }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(upd); }
    }, { passive: true });
    upd();
  })();

  /* ─────────────────────────────────────────────────────────────
     3. REVEAL
     ───────────────────────────────────────────────────────────── */
  (function () {
    var els = [].slice.call(document.querySelectorAll('.rv'));
    if (!els.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
    // Safety net: if IO never fires, never leave content invisible
    setTimeout(function () { els.forEach(function (el) { el.classList.add('in'); }); }, 2500);
  })();

  /* ─────────────────────────────────────────────────────────────
     4. QUOTE FORM
     ───────────────────────────────────────────────────────────── */
  (function () {
    var form = document.getElementById('quote-form');
    if (!form) return;
    var status = document.getElementById('form-status');
    var btn = form.querySelector('.send');

    function setError(input, on) {
      var err = document.getElementById(input.id + '-error');
      input.setAttribute('aria-invalid', on ? 'true' : 'false');
      if (err) err.hidden = !on;
    }
    function validPhone(v) { return v.replace(/\D/g, '').length >= 9; }

    function collect() {
      var interests = [].slice
        .call(form.querySelectorAll('input[name="interest"]:checked'))
        .map(function (c) { return c.value; });
      return {
        name:     document.getElementById('q-name').value.trim(),
        phone:    document.getElementById('q-phone').value.trim(),
        city:     document.getElementById('q-city').value.trim(),
        type:     document.getElementById('q-type').value,
        interest: interests.join(', '),
        notes:    document.getElementById('q-notes').value.trim()
      };
    }

    // Template literal keeps real line breaks — no escape sequences to mangle
    function asText(d) {
      return `פנייה חדשה מהאתר — DrayConnect

שם: ${d.name}
טלפון: ${d.phone}
עיר: ${d.city || '—'}
סוג נכס: ${d.type}
מתעניין ב: ${d.interest || '—'}
הערות: ${d.notes || '—'}`;
    }

    function backup(d) {
      try {
        var k = 'drayconnect_leads_v1';
        var all = JSON.parse(localStorage.getItem(k) || '[]');
        all.push({ at: new Date().toISOString(), lead: d });
        localStorage.setItem(k, JSON.stringify(all.slice(-100)));
      } catch (e) { /* private mode / quota — non-fatal */ }
    }

    function track(d) {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', {
          event_category: 'quote_form',
          interest: d.interest || 'none',
          city: d.city || 'unknown'
        });
      }
    }

    function sendEmail(d) {
      if (!CFG.EMAIL_KEY) return Promise.resolve(false);
      return fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: CFG.EMAIL_KEY,
          subject: 'ליד חדש מהאתר: ' + d.name + ' (' + d.phone + ')',
          from_name: 'DrayConnect — טופס הצעת מחיר',
          name: d.name, phone: d.phone, city: d.city,
          propertyType: d.type, interest: d.interest, notes: d.notes,
          message: asText(d)
        })
      }).then(function (r) { return r.ok; }).catch(function () { return false; });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('q-name');
      var phone = document.getElementById('q-phone');
      var nameBad = !name.value.trim();
      var phoneBad = !validPhone(phone.value);
      setError(name, nameBad);
      setError(phone, phoneBad);
      var firstBad = nameBad ? name : (phoneBad ? phone : null);

      if (firstBad) {
        status.textContent = 'לא ניתן לשלוח: יש שדות חובה שחסרים או שגויים.';
        firstBad.focus();
        return;
      }

      var lead = collect();
      backup(lead);
      track(lead);

      // Must open inside the click gesture or popup blockers eat it
      var waWin = null;
      if (CFG.WHATSAPP) {
        waWin = window.open(
          'https://wa.me/' + CFG.WHATSAPP + '?text=' + encodeURIComponent(asText(lead)),
          '_blank', 'noopener'
        );
      }

      btn.disabled = true;
      status.textContent = 'שולח...';

      sendEmail(lead).then(function (mailed) {
        btn.disabled = false;
        if (mailed) {
          status.textContent = 'תודה! הפנייה התקבלה אצלנו. נחזור אליך תוך 24 שעות.';
          form.reset();
        } else if (waWin) {
          status.textContent = 'נפתח וואטסאפ עם הפרטים שמילאת — לחץ "שלח" שם כדי להשלים את הפנייה.';
        } else {
          status.textContent = 'החלון נחסם על ידי הדפדפן. אפשר להתקשר ל-052-898-5233, ' +
                               'והפרטים שמילאת שמורים.';
        }
      });
    });

    ['q-name', 'q-phone'].forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener('input', function () {
        if (el.getAttribute('aria-invalid') === 'true') {
          var ok = id === 'q-phone' ? validPhone(el.value) : !!el.value.trim();
          if (ok) setError(el, false);
        }
      });
    });
  })();

  /* ─────────────────────────────────────────────────────────────
     5. WHATSAPP PILL
     ───────────────────────────────────────────────────────────── */
  (function () {
    var fab = document.getElementById('wa-fab');
    if (!fab) return;
    if (!CFG.WHATSAPP) { fab.hidden = true; return; }
    var msg = 'היי, הגעתי מהאתר של DrayConnect ואשמח לקבל הצעת מחיר לבית חכם.';
    fab.href = 'https://wa.me/' + CFG.WHATSAPP + '?text=' + encodeURIComponent(msg);
    fab.addEventListener('click', function () {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'contact', { event_category: 'whatsapp_fab' });
      }
    });
  })();
})();
