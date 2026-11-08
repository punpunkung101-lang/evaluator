(function () {
    "use strict";
    const scriptUrl = document.currentScript?.src;
    const fromScript = path => window.EvaluatorRuntimeUrl.fromScript(path, scriptUrl);

    function initialize() {
        if (document.querySelector(".site-shared-masthead[data-site-header]")) return;

        const frontendBase = new URL(fromScript("../../../", scriptUrl));
        const url = rel => new URL(rel, frontendBase).href;
        const logoUrl = fromScript("../../../assets/img/Nu_bage.png");

        // Clean up legacy inline/duplicate headers & sidebars if present
        document.querySelectorAll(".site-shared-masthead:not([data-site-header]), .ev-header, .site-wide-nav:not([data-site-header])")
            .forEach(el => el.remove());
        document.querySelectorAll(".it-sidebar, .ev-sidebar").forEach(el => el.remove());
        document.body.classList.remove("it-has-sidebar", "ev-layout");

        // 1. Create Masthead (Brand row)
        const masthead = document.createElement("header");
        masthead.className = "site-shared-masthead";
        masthead.setAttribute("data-site-header", "1");

        const brandRow = document.createElement("div");
        brandRow.className = "site-brand-row";

        const indexHref = url("user/index.html");
        const effHref = url("user/effectiveness/evaluation.html");
        const satHref = url("user/satisfaction/index.html");
        const dashSatHref = url("admin/dashboard.html");
        const dashEffHref = url("admin/dashboard.html#quantitative-results");
        const mgmtHref = url("admin/manage/assessment-management.html");

        brandRow.innerHTML = `
            <a class="site-brand" href="${indexHref}" aria-label="กลับสู่หน้าหลัก">
                <img src="${logoUrl}" alt="ตรามหาวิทยาลัยนเรศวร" width="56" height="56">
                <span>
                    <strong>คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร</strong>
                    <small>Faculty of Allied Health Sciences, Naresuan University</small>
                </span>
            </a>
            <div class="site-header-actions">
                <button type="button" class="site-btn site-theme-btn" id="ev-theme" aria-label="โหมดมืด" aria-pressed="false" title="โหมดมืด">
                    <span data-theme-icon aria-hidden="true">☾</span>
                </button>
                <button type="button" class="site-btn site-lang-btn" id="q-admin-language" data-language-toggle aria-label="Switch language">
                    EN
                </button>
                <button class="ev-signin" type="button">เข้าสู่ระบบ</button>
            </div>
        `;
        masthead.append(brandRow);

        // 2. Create Navigation Bar (Navy with Gold border)
        const nav = document.createElement("nav");
        nav.className = "site-wide-nav";
        nav.setAttribute("data-site-header", "1");
        nav.setAttribute("aria-label", "เมนูหลัก");

        nav.innerHTML = `
            <div class="site-nav-inner">
                <div class="site-nav-main">
                    <a href="${indexHref}">หน้าหลัก</a>
                    <a href="${effHref}">ประเมินประสิทธิผลระบบ IT</a>
                    <a href="${satHref}">ประเมินความพึงพอใจ</a>
                    <button type="button" class="site-nav-dialog-btn" data-ev-dialog="ev-guide">คู่มือการใช้งาน</button>
                    <button type="button" class="site-nav-dialog-btn" data-ev-dialog="ev-contact">ติดต่อเรา</button>
                </div>
                <span class="site-wide-nav-admin" aria-label="เมนูผู้ดูแล" hidden>
                    <a href="${dashSatHref}">Dashboard ความพึงพอใจ</a>
                    <a href="${dashEffHref}">Dashboard ประสิทธิผล</a>
                    <a href="${mgmtHref}">จัดการคำถาม</a>
                </span>
            </div>
        `;

        // 3. Create Dialogs for Guide & Contact
        let dialogs = document.getElementById("site-header-dialogs");
        if (!dialogs) {
            dialogs = document.createElement("div");
            dialogs.id = "site-header-dialogs";
            dialogs.innerHTML = `
                <dialog id="ev-contact" class="site-dialog" aria-labelledby="ev-contact-title">
                    <div class="site-dialog-card">
                        <h2 id="ev-contact-title">ติดต่อเรา</h2>
                        <p>หากต้องการความช่วยเหลือ โปรดติดต่อผู้รับผิดชอบโครงการหรือผู้ดูแลระบบของคณะ</p>
                        <button type="button" class="site-btn" data-ev-close>ปิด</button>
                    </div>
                </dialog>
                <dialog id="ev-guide" class="site-dialog" aria-labelledby="ev-guide-title">
                    <div class="site-dialog-card">
                        <h2 id="ev-guide-title">คู่มือการใช้งาน</h2>
                        <ol>
                            <li>ข้อมูลผู้ประเมิน</li>
                            <li>กระบวนการก่อนใช้ IT</li>
                            <li>กระบวนการหลังใช้ IT</li>
                            <li>ตัวชี้วัด</li>
                            <li>ตรวจสอบและส่ง</li>
                        </ol>
                        <p>บันทึกแบบร่างเพื่อกลับมากรอกต่อได้ ตรวจสอบข้อมูลก่อนยืนยันส่ง</p>
                        <button type="button" class="site-btn" data-ev-close>ปิด</button>
                    </div>
                </dialog>
            `;
            document.body.append(dialogs);
        }

        // Prepend masthead and nav to body
        document.body.prepend(nav);
        document.body.prepend(masthead);

        // 4. Highlight Active Navigation Link
        const currentPath = location.pathname.toLowerCase();
        const currentHash = location.hash;
        nav.querySelectorAll("a").forEach(link => {
            const linkUrl = new URL(link.href, location.href);
            const linkPath = linkUrl.pathname.toLowerCase();
            let isActive = false;

            if (linkUrl.hash && currentHash) {
                isActive = (linkPath === currentPath && linkUrl.hash === currentHash);
            } else if (!linkUrl.hash) {
                if (linkPath === currentPath) {
                    isActive = true;
                } else if (linkPath.endsWith("index.html") && currentPath.endsWith("/")) {
                    isActive = true;
                }
            }

            if (isActive) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
            }
        });

        // 5. Setup Theme Toggle
        const themeBtn = masthead.querySelector("#ev-theme");
        function getSavedTheme() {
            try { return localStorage.getItem("it_eval_theme") || "light"; } catch (_) { return "light"; }
        }
        function applySiteTheme(theme) {
            document.documentElement.setAttribute("data-theme", theme);
            document.documentElement.dataset.theme = theme;
            document.body.classList.toggle("dark", theme === "dark");
            if (themeBtn) {
                themeBtn.setAttribute("aria-pressed", String(theme === "dark"));
                themeBtn.setAttribute("aria-label", theme === "dark" ? "โหมดสว่าง" : "โหมดมืด");
                themeBtn.title = theme === "dark" ? "โหมดสว่าง" : "โหมดมืด";
                const icon = themeBtn.querySelector("[data-theme-icon]");
                if (icon) icon.textContent = theme === "dark" ? "☀" : "☾";
            }
        }
        applySiteTheme(getSavedTheme());

        themeBtn?.addEventListener("click", () => {
            const next = getSavedTheme() === "dark" ? "light" : "dark";
            try { localStorage.setItem("it_eval_theme", next); } catch (_) {}
            applySiteTheme(next);
            if (window.ThemeLang?.applyTheme) {
                try { window.ThemeLang.applyTheme(next); } catch (_) {}
            }
            if (window.EvaluationLocale?.setTheme) {
                try { window.EvaluationLocale.setTheme(next); } catch (_) {}
            }
        });

        // 6. Setup Language Toggle
        const langBtn = masthead.querySelector("#q-admin-language");
        function getSavedLang() {
            try { return localStorage.getItem("it_eval_lang") || document.documentElement.lang || "th"; } catch (_) { return "th"; }
        }
        function applySiteLang(lang) {
            document.documentElement.lang = lang === "en" ? "en" : "th";
            if (langBtn) {
                langBtn.textContent = lang === "en" ? "ไทย" : "EN";
                langBtn.setAttribute("aria-label", lang === "en" ? "Switch to Thai" : "ภาษาอังกฤษ");
            }
            document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
        }
        applySiteLang(getSavedLang());

        langBtn?.addEventListener("click", () => {
            const next = getSavedLang() === "th" ? "en" : "th";
            try { localStorage.setItem("it_eval_lang", next); } catch (_) {}
            applySiteLang(next);
            if (window.ThemeLang?.applyLang) {
                try {
                    window.ThemeLang.saveLang?.(next);
                    window.ThemeLang.applyLang(next);
                } catch (_) {}
            }
            if (window.EvaluationLocale?.setLanguage) {
                try { window.EvaluationLocale.setLanguage(next); } catch (_) {}
            }
        });

        // 7. Setup Dialog Open/Close Handlers
        nav.querySelectorAll("[data-ev-dialog]").forEach(button => {
            button.addEventListener("click", () => {
                const dlg = document.getElementById(button.dataset.evDialog);
                if (dlg?.showModal) dlg.showModal();
            });
        });
        dialogs.querySelectorAll("[data-ev-close]").forEach(btn => {
            btn.addEventListener("click", () => btn.closest("dialog")?.close());
        });
        dialogs.querySelectorAll("dialog").forEach(dlg => {
            dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
        });

        // 8. Auth State & Admin Navigation Check
        const adminLinks = nav.querySelector(".site-wide-nav-admin");
        const authState = window.EvaluatorAuth?.renderAuthButton?.();
        Promise.resolve(authState).then(user => {
            if (user?.role === "admin" && adminLinks) adminLinks.hidden = false;
        }).catch(error => console.error("[SiteHeader] Could not verify role for admin navigation", error));
    }

    if (window.AdminGuard?.ready) {
        window.AdminGuard.ready.then(initialize, () => {});
    } else if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
