# AGENTS.md — NUAHS IT Evaluation

> Single source of truth for AI coding agents. Replaces `Skill.md` and `infomation.md`.

## 1. Role

You are a full-stack developer maintaining **NUAHS IT Evaluation**, a website for the Faculty of Allied Health Sciences, Naresuan University.

- Inspect the existing implementation before changing anything.
- Keep what works (login, shared layout/components, pages unrelated to the evaluation form). **The effectiveness question/evaluation flow is being replaced: rewrite or delete the old code, data and pages freely.** Git is the safety net; the owner rolls back by himself if needed, so do not keep old code "just in case".
- Never assume a feature is missing (or present) until you have read the code.

## 2. Product Model

**One website. Two evaluation systems. One shared identity. One shared database.**

| Evaluation system | Purpose | `assessment_type` |
|---|---|---|
| Effectiveness of IT | Compare work processes/metrics before vs. after using an IT system | `effectiveness` |
| Satisfaction Survey | Measure users' satisfaction with an IT system | `satisfaction` |

The two systems are separated **by data and workflow, not by folder**:

- Separate questions, steps, submissions and results, always distinguishable by `assessment_type` + `system_id`.
- Shared pages, components, styles, auth, header, sidebar and theme. Never copy a component into a second place.

## 3. Target Frontend Structure

The frontend is organized **by role (user / admin) and shared assets**, not by evaluation system.

```text
evaluator/
├── AGENTS.md
├── index.html                      # root redirect to frontend/user/index.html
├── frontend/
│   ├── user/
│   │   ├── index.html              # main portal
│   │   ├── satisfaction/           # satisfaction survey pages
│   │   └── effectiveness/          # effectiveness wizard (3 steps)
│   ├── admin/
│   │   ├── dashboard.html          # "ภาพรวมระบบ"
│   │   ├── results.html            # "ผลประเมินรายระบบ"
│   │   └── manage/                 # assessment / process management
│   └── assets/
│       ├── css/                    # tokens, base, components, pages
│       ├── js/
│       │   ├── core/               # api, auth, guards, theme, i18n, runtime-url
│       │   ├── layout/             # site-header, sidebar (ONE implementation)
│       │   ├── user/
│       │   ├── admin/
│       │   └── **/*.test.cjs       # tests live next to the code they test
│       └── img/                    # logos/images
├── backend/src/                    # C++ REST API — do not modify unless told
├── database/                       # schema.sql, seed.sql, evaluator.db, migrations
└── tests/                          # backend/API/DB tests and fixtures only
```

Rules for the structure:

1. The legacy system-specific frontend folders have been migrated and must not be recreated.
2. No page may reference another page's private files. Shared code lives only in `frontend/assets/`.
3. Header and sidebar are rendered by **one** script from **one** NAV config. Never paste `<aside>` / `<header>` markup into individual HTML files.
4. Colors, spacing and typography come from `tokens.css`. No raw hex colors in page CSS.
5. Test files (`*.test.cjs`) must be excluded from deployment/serving.
6. Always verify the real tree before editing; this section describes the target, not necessarily the current state.
7. **Runtime URLs:** every URL built in JavaScript (images, links, redirects, fetch targets) must use the helper in `frontend/assets/js/core/runtime-url.js`, which resolves from the script's own location. Never write a second path calculator and never use paths starting with `/`. Pages must work whether the server root is the repo root or `frontend/`.
