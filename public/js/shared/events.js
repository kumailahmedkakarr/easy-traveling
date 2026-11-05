/**
 * Event delegation: HTML uses data attributes instead of inline onclick="...".
 *   <button data-action="navigateTo" data-args='["home"]'>   -> actions.navigateTo(el, 'home')
 *   <form data-submit="handleLogin">                          -> actions.handleLogin(event, form)
 *   <input data-change="markPm">                              -> actions.markPm(el)
 */
export function bindActions(actions) {
  const call = (name, ...args) => {
    const fn = actions[name];
    if (typeof fn === 'function') return fn(...args);
    console.warn(`No action registered for "${name}"`);
    return undefined;
  };

  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (!el || el.disabled) return;
    let args = [];
    if (el.dataset.args) { try { args = JSON.parse(el.dataset.args); } catch { args = []; } }
    call(el.dataset.action, el, ...args);
  });

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-submit]');
    if (!form) return;
    event.preventDefault();
    call(form.dataset.submit, event, form);
  });

  document.addEventListener('change', (event) => {
    const el = event.target.closest('[data-change]');
    if (el) call(el.dataset.change, el);
  });
}
