# Evaluation UI

Open `main/evaluation.html` through Live Server. The existing five-step form, configured processes, calculations, draft records and submitted records remain in use. No backend or authentication has been added.

The university shell is specific to this evaluation page; the landing page keeps its existing top navigation and no left sidebar. It uses the existing official project asset `frontend/Publice/Nu_bage.png`. The new styles and scripts are `assets/css/evaluation-shell.css`, `assets/js/evaluation-shell.js` and `assets/js/evaluation-locale.js`. `quantitative.js` adds field grouping and marks catalog/user text as excluded from UI translation. `quantitative.css` no longer reloads base variables after dark-theme variables. Homepage preferences in `app.js` now use the same keys as the satisfaction site.

Language and theme preferences use `it_eval_lang` and `it_eval_theme`, compatible with the existing satisfaction pages. Default language is Thai. The dictionary translates UI copy and accessibility labels in place, including dynamically rendered steps and messages; it does not reload or recreate form controls. System names, administrator-defined processes/indicators/units and user-entered values retain their configured language. The landing page continues using its own existing translation dictionary. Administrator and dashboard pages retain their existing UI and are not replaced by this evaluation-page shell.

Sign-in is explicitly unavailable because there is no real login service. About, contact guidance and the five-step user guide open actual dialogs rather than linking to missing pages. Contact information is not invented. The mobile sidebar uses a native modal dialog for keyboard focus containment and Escape handling. Confirmation continues using the existing native dialog.

## Verification

- Node checks: `node --test tests/quantitative.test.cjs tests/admin-results.test.cjs tests/evaluation-locale.test.cjs`.
- Browser checked at 1440, 768, 390 and 320 CSS pixels: no horizontal overflow; mobile form becomes one column and the drawer opens/closes using keyboard controls.
- TH to EN translation of labels, validation, step status, review and confirmation checked. A name deliberately matching a UI phrase remained unchanged in its input and review.
- Light/Dark and language survived reload; saved form values and system selection survived too.
- Sample-process flow completed all five steps, preserving durations when going back. Draft saving, zero/unknown states, review calculations, Escape/return focus and final submission checked. UI test data used the separate `localhost:5500` origin, not the user's existing `127.0.0.1:5500` origin.
- Browser console contained no errors during the tested evaluation flow. Screenshot artifacts are provided in the chat.

Still a browser-only prototype: no shared server database or verified administrator roles. Language/theme preference sharing requires the same browser origin. Configured/catalog content is intentionally not machine-translated. No reference image was attached to this request, so layout follows the written requirements and existing university assets.
