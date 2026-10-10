(() => {
  let current = null;
  let uid = 0;
  const closeCurrent = () => { if (current) current.close(); };

  const enhance = sel => {
    const id = 'dd-' + (++uid);
    const wrap = document.createElement('div');
    wrap.className = 'dd';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.append(sel);
    sel.classList.add('vh');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dd-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', id);
    const name = sel.getAttribute('aria-label');
    if (name) btn.setAttribute('aria-label', name);
    const text = document.createElement('span');
    btn.append(text);

    const list = document.createElement('ul');
    list.className = 'dd-list';
    list.id = id;
    list.setAttribute('role', 'listbox');
    if (name) list.setAttribute('aria-label', name);
    list.hidden = true;

    const items = [...sel.options].map((o, i) => {
      const li = document.createElement('li');
      li.className = 'dd-opt';
      li.id = id + '-' + i;
      li.setAttribute('role', 'option');
      const span = document.createElement('span');
      span.textContent = o.textContent;
      li.append(span);
      list.append(li);
      return li;
    });

    wrap.append(btn, list);

    let active = sel.selectedIndex;
    let buffer = '';
    let timer = 0;

    const sync = () => {
      text.textContent = sel.options[sel.selectedIndex].textContent;
      items.forEach((li, i) => li.setAttribute('aria-selected', i === sel.selectedIndex ? 'true' : 'false'));
    };

    const setActive = (i, scroll = true) => {
      active = Math.max(0, Math.min(items.length - 1, i));
      items.forEach((li, j) => li.classList.toggle('active', j === active));
      btn.setAttribute('aria-activedescendant', items[active].id);
      if (scroll) items[active].scrollIntoView({ block: 'nearest' });
    };

    const isOpen = () => !list.hidden;

    const open = () => {
      if (isOpen()) return;
      closeCurrent();
      list.hidden = false;
      const r = btn.getBoundingClientRect();
      const h = Math.min(list.scrollHeight, 264) + 12;
      wrap.classList.toggle('up', window.innerHeight - r.bottom < h && r.top > window.innerHeight - r.bottom);
      wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      setActive(sel.selectedIndex);
      current = api;
    };

    const close = () => {
      if (!isOpen()) return;
      list.hidden = true;
      wrap.classList.remove('open', 'up');
      btn.setAttribute('aria-expanded', 'false');
      btn.removeAttribute('aria-activedescendant');
      if (current === api) current = null;
    };

    const choose = i => {
      const changed = sel.selectedIndex !== i;
      sel.selectedIndex = i;
      sync();
      close();
      if (changed) sel.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const api = { close };

    btn.addEventListener('click', () => (isOpen() ? close() : open()));

    btn.addEventListener('keydown', e => {
      const k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen()) { open(); return; }
        setActive(active + (k === 'ArrowDown' ? 1 : -1));
      } else if (k === 'Home' || k === 'End') {
        e.preventDefault();
        if (!isOpen()) open();
        setActive(k === 'Home' ? 0 : items.length - 1);
      } else if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        if (isOpen()) choose(active); else open();
      } else if (k === 'Escape') {
        if (isOpen()) { e.preventDefault(); close(); }
      } else if (k === 'Tab') {
        close();
      } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        clearTimeout(timer);
        buffer += k.toLowerCase();
        timer = setTimeout(() => { buffer = ''; }, 600);
        const labels = items.map(li => li.textContent.trim().toLowerCase());
        const from = buffer.length > 1 ? active : active + 1;
        const order = labels.map((_, i) => (from + i) % labels.length);
        const hit = order.find(i => labels[i].startsWith(buffer));
        if (hit !== undefined) {
          e.preventDefault();
          if (isOpen()) setActive(hit); else choose(hit);
        }
      }
    });

    list.addEventListener('mousedown', e => e.preventDefault());
    list.addEventListener('mousemove', e => {
      const li = e.target.closest('.dd-opt');
      if (li) { const i = items.indexOf(li); if (i !== active) setActive(i, false); }
    });
    list.addEventListener('click', e => {
      const li = e.target.closest('.dd-opt');
      if (li) { choose(items.indexOf(li)); btn.focus(); }
    });

    sel.addEventListener('change', sync);
    sync();
  };

  document.addEventListener('pointerdown', e => {
    if (current && !e.target.closest('.dd.open')) closeCurrent();
  });
  window.addEventListener('blur', closeCurrent);
  window.addEventListener('resize', closeCurrent);

  document.querySelectorAll('select').forEach(enhance);
})();
