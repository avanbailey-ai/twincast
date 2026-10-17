/* ==========================================================================
   Twincast landing page — waitlist + UI behaviour
   Plain JS, no dependencies, no build step.

   LIVE BACKEND CONNECTED via FormSubmit (see WAITLIST_ENDPOINT below).
   Signups are validated, POSTed to FormSubmit which emails them to the
   site owner, and also saved to this browser's localStorage as a backup
   (key: "twincast_waitlist_v1").
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIG
     ------------------------------------------------------------------------ */
  var STORAGE_KEY = 'twincast_waitlist_v1';

  /**
   * Set this to your real endpoint to start sending signups to a provider.
   * While it is null, signups are stored locally only.
   *   Formspree:  'https://formspree.io/f/XXXXXXXX'
   *   Own server: '/api/waitlist'
   * (ConvertKit/Kit, Mailchimp, Loops, etc. require a secret API key. Do NOT
   *  put it in this file. Send to your own server/serverless function and
   *  call the provider from there.)
   */
  var WAITLIST_ENDPOINT = 'https://formsubmit.co/ajax/e5f8cc3acad93250d9c1eec92fcf1741'; // Live: FormSubmit (activated; alias hides owner email, delivers to owner Gmail)

  /* ========================================================================
     >>> INTEGRATION POINT: the ONE function to change. <<<

     sendToWaitlistProvider(payload) -> Promise
       payload = {
         type:      'model' | 'brand',
         name, email, role, city,
         interests: string[]   // models only
         company, shoots: string[], notes   // brands only
         age18:     true       // models only
         createdAt: ISO string,
         source:    'twincast-landing'
       }

     Resolve the promise on success and reject it (throw) on failure. The UI
     already handles the loading, success and error states.

     TODO: Replace the body below with a real network call, e.g. Formspree:

       var res = await fetch(WAITLIST_ENDPOINT, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
         body: JSON.stringify(payload)
       });
       if (!res.ok) throw new Error('Signup failed: ' + res.status);
       return res.json();
     ======================================================================== */
  async function sendToWaitlistProvider(payload) {
    if (!WAITLIST_ENDPOINT) {
      // No backend connected: local-only mode. Nothing is sent anywhere.
      console.info('[Twincast] No WAITLIST_ENDPOINT set. Signup stored locally only.', payload);
      return { ok: true, localOnly: true };
    }
    var body = Object.assign({}, payload, {
      _subject: 'Twincast waitlist: ' + payload.type + ' — ' + payload.name,
      _template: 'table',
      _captcha: 'false'
    });
    var res = await fetch(WAITLIST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Signup failed with status ' + res.status);
    return { ok: true, localOnly: false };
  }

  /* ------------------------------------------------------------------------
     Local storage (always runs; acts as a local log/backup)
     ------------------------------------------------------------------------ */
  function readSignups() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveSignupLocally(payload) {
    try {
      var list = readSignups();
      // Replace any earlier entry with the same email + type (no duplicates).
      list = list.filter(function (s) { return !(s.email === payload.email && s.type === payload.type); });
      list.push(payload);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      console.warn('[Twincast] localStorage unavailable', e);
      return false;
    }
  }

  // Dev helpers, available in the browser console:
  //   twincastWaitlist.list()       -> array of stored signups
  //   twincastWaitlist.exportCSV()  -> downloads a CSV of stored signups
  //   twincastWaitlist.clear()      -> wipes local signups
  window.twincastWaitlist = {
    list: readSignups,
    clear: function () { localStorage.removeItem(STORAGE_KEY); },
    exportCSV: function () {
      var rows = readSignups();
      var cols = ['createdAt', 'type', 'name', 'email', 'role', 'city', 'company', 'interests', 'shoots', 'notes'];
      var esc = function (v) { v = Array.isArray(v) ? v.join('; ') : (v == null ? '' : String(v)); return '"' + v.replace(/"/g, '""') + '"'; };
      var csv = [cols.join(',')].concat(rows.map(function (r) { return cols.map(function (c) { return esc(r[c]); }).join(','); })).join('\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'twincast-waitlist.csv';
      a.click();
    }
  };

  /* ------------------------------------------------------------------------
     Tabs (model / brand)
     ------------------------------------------------------------------------ */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  var success = document.getElementById('wl-success');

  function selectTab(type, focus) {
    success.hidden = true;
    tabs.forEach(function (t) {
      var on = t.id === 'tab-' + type;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) t.focus();
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t.id.replace('tab-', '')); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        selectTab(next.id.replace('tab-', ''), true);
        e.preventDefault();
      }
    });
  });

  // Any CTA with data-join="model|brand" opens the right form.
  document.querySelectorAll('[data-join]').forEach(function (el) {
    el.addEventListener('click', function () { selectTab(el.getAttribute('data-join')); });
  });
  // Deep links: #join-model / #join-brand
  if (/^#join-(model|brand)$/.test(location.hash)) {
    selectTab(location.hash.replace('#join-', ''));
    document.getElementById('join').scrollIntoView();
  }

  /* ------------------------------------------------------------------------
     Validation
     ------------------------------------------------------------------------ */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setError(el, errId, msg) {
    var err = document.getElementById(errId);
    if (err) err.textContent = msg || '';
    if (el.tagName === 'FIELDSET') el.classList.toggle('invalid', !!msg);
    else el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  function validate(form) {
    var type = form.getAttribute('data-type');
    var p = type === 'model' ? 'm-' : 'b-';
    var f = form.elements;
    var firstBad = null;
    function check(ok, el, errId, msg) {
      setError(el, errId, ok ? '' : msg);
      if (!ok && !firstBad) firstBad = el.tagName === 'FIELDSET' ? el.querySelector('input') : el;
    }
    check(f.name.value.trim().length >= 2, f.name, p + 'name-err', 'Please enter your name.');
    var em = f.email.value.trim();
    check(EMAIL_RE.test(em), f.email, p + 'email-err', em ? 'That email doesn’t look right. Check for typos.' : 'Please enter your email.');
    check(!!f.role.value, f.role, p + 'role-err', 'Please choose the option that fits best.');
    check(f.city.value.trim().length >= 2, f.city, p + 'city-err', 'Please enter your city.');

    if (type === 'model') {
      var cats = form.querySelector('#m-cats');
      check(form.querySelectorAll('input[name="interests"]:checked').length > 0, cats, 'm-cats-err', 'Pick at least one category.');
      check(f.age18.checked, f.age18, 'm-age-err', 'You must be 18 or older to join the model waitlist.');
    } else {
      check(f.company.value.trim().length >= 1, f.company, 'b-company-err', 'Please enter your company or brand.');
      var shoots = form.querySelector('#b-shoots');
      check(form.querySelectorAll('input[name="shoots"]:checked').length > 0, shoots, 'b-shoots-err', 'Pick at least one thing you shoot.');
    }
    return firstBad;
  }

  function collect(form) {
    var type = form.getAttribute('data-type');
    var f = form.elements;
    var vals = function (name) { return Array.prototype.map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; }); };
    var payload = {
      type: type,
      name: f.name.value.trim(),
      email: f.email.value.trim().toLowerCase(),
      role: f.role.value,
      city: f.city.value.trim(),
      createdAt: new Date().toISOString(),
      source: 'twincast-landing'
    };
    if (type === 'model') { payload.interests = vals('interests'); payload.age18 = true; }
    else { payload.company = f.company.value.trim(); payload.shoots = vals('shoots'); payload.notes = f.notes.value.trim(); }
    return payload;
  }

  /* ------------------------------------------------------------------------
     Submit
     ------------------------------------------------------------------------ */
  document.querySelectorAll('.wl-form').forEach(function (form) {
    // Clear a field's error as soon as the user fixes it.
    form.addEventListener('input', function (e) {
      var el = e.target;
      if (el.getAttribute('aria-invalid') === 'true' || el.closest('fieldset.invalid')) validate(form);
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      status.textContent = '';
      var bad = validate(form);
      if (bad) { bad.focus(); return; }

      var btn = form.querySelector('button[type="submit"]');
      var label = btn.innerHTML;
      btn.disabled = true; btn.textContent = 'Adding you…';

      var payload = collect(form);
      try {
        saveSignupLocally(payload);              // 1) always keep a local copy
        await sendToWaitlistProvider(payload);   // 2) send to provider (no-op until configured)
        showSuccess(payload);
        form.reset();
      } catch (err) {
        console.error(err);
        status.textContent = 'Something went wrong saving your signup. Please try again.';
      } finally {
        btn.disabled = false; btn.innerHTML = label;
      }
    });
  });

  function showSuccess(p) {
    document.getElementById('panel-model').hidden = true;
    document.getElementById('panel-brand').hidden = true;
    var first = p.name.split(' ')[0];
    document.getElementById('wl-success-msg').textContent = p.type === 'model'
      ? 'Thanks, ' + first + '. You’re on the model waitlist for ' + p.city + '. We’ll email ' + p.email + ' when early access and scan days open near you.'
      : 'Thanks, ' + first + '. ' + p.company + ' is on the brand waitlist. We’ll email ' + p.email + ' when early access opens.';
    success.hidden = false;
    success.focus();
  }
  document.getElementById('wl-again').addEventListener('click', function () {
    var current = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
    selectTab(current ? current.id.replace('tab-', '') : 'model', true);
  });

  /* ------------------------------------------------------------------------
     Reveal on scroll (content stays visible if IntersectionObserver is missing)
     ------------------------------------------------------------------------ */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (r) { io.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add('in'); });
  }

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();
