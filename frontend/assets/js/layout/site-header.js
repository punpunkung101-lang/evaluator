(function () {
    "use strict";

    const scriptUrl = document.currentScript?.src;
    const navConfig = window.EvaluatorNavigation;
    const runtimeUrl = window.EvaluatorRuntimeUrl;
    const resolveFrontendPath = path => runtimeUrl.fromScript(`../../../${path}`, scriptUrl);
    const iconPaths = {
        home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
        overview: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
        results: "M4 6h16v10H4V6zm18-2H2v14h7v2H7v2h10v-2h-2v-2h7V4z"
    };

    function currentLanguage() {
        if (window.ThemeLang?.getLang) return window.ThemeLang.getLang();
        if (window.EvaluationLocale?.getLanguage) return window.EvaluationLocale.getLanguage();
        try { return localStorage.getItem("it_eval_lang") || document.documentElement.lang || "th"; }
        catch (_) { return document.documentElement.lang || "th"; }
    }

    function translatedText(key) {
        const language = currentLanguage() === "en" ? "en" : "th";
        return window.ThemeLang?.i18n?.[language]?.[key] || key;
    }

    function makeIcon(name) {
        const path = iconPaths[name];
        if (!path) return null;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
        shape.setAttribute("d", path);
        svg.append(shape);
        return svg;
    }

    function markActive(root, items, location) {
        if (!root) return;
        const active = navConfig.activeItem(items, location);
        root.querySelectorAll("[data-nav-id]").forEach(element => {
            const isActive = element.dataset.navId === active?.id;
            element.classList.toggle("active", isActive);
            if (isActive && element.tagName === "A") element.setAttribute("aria-current", "page");
            else element.removeAttribute("aria-current");
        });
    }

    function makeNavItem(item, contactDialogId) {
        const element = item.action ? document.createElement("button") : document.createElement("a");
        if (item.action) {
            element.type = "button";
            element.className = "site-nav-dialog-btn";
            element.dataset.evDialog = item.action === "ev-contact" ? contactDialogId : item.action;
        } else {
            element.className = "site-nav-link";
            element.href = resolveFrontendPath(item.href);
        }
        element.dataset.navId = item.id;
        if (navConfig.isProcessManagementPage(location.pathname) && element.tagName === "A") {
            element.id = "q-admin-dashboard-back";
        }
        element.dataset.i18n = item.labelKey;
        element.textContent = translatedText(item.labelKey);
        return element;
    }

    function renderHeaderNavigation(navigation, role, contactDialogId) {
        const main = navigation.querySelector(".site-nav-main");
        const admin = navigation.querySelector(".site-wide-nav-admin");
        main.replaceChildren();
        admin.replaceChildren();
        const items = navConfig.header[role] || navConfig.header.guest;
        for (const item of items) {
            const target = role === "admin" && item.id !== "home" ? admin : main;
            target.append(makeNavItem(item, contactDialogId));
        }
        admin.hidden = role !== "admin";
        markActive(navigation, items, { pathname: location.pathname, hash: location.hash });
    }

    function mountSidebar() {
        const mount = document.getElementById("app-sidebar");
        if (!mount) return;

        const aside = document.createElement("aside");
        aside.className = "sidebar";
        const brand = document.createElement("div");
        brand.className = "sidebar-brand";
        brand.innerHTML = `<div class="brand-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg></div><div class="brand-info"><h2>IT Evaluator</h2><p data-i18n="dash_brand_sub">${translatedText("dash_brand_sub")}</p></div>`;
        aside.append(brand);

        const nav = document.createElement("nav");
        nav.className = "sidebar-nav";
        nav.setAttribute("aria-label", "Admin navigation");
        const items = navConfig.sidebar.admin;
        for (const item of items) {
            const link = document.createElement("a");
            link.href = resolveFrontendPath(item.href);
            link.className = "nav-link";
            link.dataset.navId = item.id;
            if (item.id === "overview" && navConfig.isProcessManagementPage(location.pathname)) {
                link.id = "q-admin-dashboard-back";
            }
            const icon = makeIcon(item.icon);
            if (icon) link.append(icon);
            const label = document.createElement("span");
            label.textContent = translatedText(item.labelKey);
            label.dataset.i18n = item.labelKey;
            link.append(label);
            nav.append(link);
        }
        aside.append(nav);

        if (navConfig.showsSidebarFooter(location.pathname)) {
            const footer = document.createElement("div");
            footer.className = "sidebar-footer";
            const item = navConfig.sidebar.footer;
            const link = document.createElement("a");
            link.href = resolveFrontendPath(item.href);
            link.className = "nav-link";
            const icon = makeIcon(item.icon);
            if (icon) link.append(icon);
            const label = document.createElement("span");
            label.dataset.i18n = item.labelKey;
            label.textContent = translatedText(item.labelKey);
            link.append(label);
            footer.append(link);
            aside.append(footer);
        }

        markActive(aside, items, { pathname: location.pathname, hash: location.hash });
        mount.replaceWith(aside);
    }

    function initialize() {
        if (!navConfig || !runtimeUrl || !scriptUrl || !document.body) return;
        if (document.querySelector(".site-shared-masthead[data-site-header]")) {
            mountSidebar();
            return;
        }

        document.querySelectorAll(".site-shared-masthead:not([data-site-header]), .ev-header, .site-wide-nav:not([data-site-header])")
            .forEach(element => element.remove());
        document.querySelectorAll(".it-sidebar, .ev-sidebar").forEach(element => element.remove());
        document.body.classList.remove("it-has-sidebar", "ev-layout");

        const logoUrl = resolveFrontendPath("assets/img/Nu_bage.png");
        const header = document.createElement("header");
        header.className = "site-shared-masthead";
        header.dataset.siteHeader = "1";
        header.innerHTML = `<div class="site-utility-bar"><div class="site-header-shell site-utility-content"><span data-i18n="portal_utility">ศูนย์ประเมินระบบสารสนเทศ</span><button type="button" class="site-utility-contact" data-header-contact data-i18n="nav_contact">ติดต่อเรา</button></div></div><div class="site-header-shell site-brand-row"><a class="site-brand" href="${resolveFrontendPath("user/index.html")}" aria-label="กลับสู่หน้าหลัก"><img src="${logoUrl}" alt="ตรามหาวิทยาลัยนเรศวร" width="72" height="72"><span><strong data-i18n="portal_faculty">คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร</strong><small data-i18n="portal_faculty_en">Faculty of Allied Health Sciences, Naresuan University</small></span></a><div class="site-header-actions"><button type="button" class="site-control-button" id="theme-toggle" data-i18n-aria="portal_theme" aria-label="โหมดมืด" aria-pressed="false" title="โหมดมืด"><span class="control-icon" data-theme-icon aria-hidden="true">☾</span><span data-i18n="portal_theme">โหมดมืด</span></button><button type="button" class="site-control-button site-lang-btn" id="language-toggle" aria-label="Switch language">TH / EN</button><button class="login-button ev-signin" type="button"><span aria-hidden="true">◉</span><span data-auth-label data-i18n="portal_login">เข้าสู่ระบบ</span></button><button class="site-menu-toggle" id="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" data-i18n-aria="portal_menu" aria-label="เมนู"><span></span><span></span><span></span></button></div></div><nav class="site-wide-nav" id="primary-nav" aria-label="เมนูหลัก"><div class="site-nav-inner"><div class="site-nav-main"></div><span class="site-wide-nav-admin" hidden></span></div></nav>`;
        const navigation = header.querySelector(".site-wide-nav");
        const dialogs = document.createElement("div");
        dialogs.id = "site-header-dialogs";
        const existingContact = document.getElementById("contact-dialog");
        const contactDialogId = existingContact ? "contact-dialog" : "ev-contact";
        dialogs.innerHTML = `${existingContact ? "" : `<dialog id="ev-contact" class="site-dialog" aria-labelledby="ev-contact-title"><div class="site-dialog-card"><h2 id="ev-contact-title" data-i18n="nav_contact">ติดต่อเรา</h2><p data-i18n="portal_contact_text">หากต้องการความช่วยเหลือ โปรดติดต่อผู้รับผิดชอบโครงการหรือผู้ดูแลระบบของคณะ</p><button type="button" class="site-btn" data-ev-close>ปิด</button></div></dialog>`}<dialog id="ev-guide" class="site-dialog" aria-labelledby="ev-guide-title"><div class="site-dialog-card"><h2 id="ev-guide-title" data-i18n="nav_guide">คู่มือการใช้งาน</h2><ol><li data-i18n="portal_guide_profile">ข้อมูลผู้ประเมิน</li><li data-i18n="portal_guide_before">กระบวนการก่อนใช้ IT</li><li data-i18n="portal_guide_after">กระบวนการหลังใช้ IT</li><li data-i18n="portal_guide_metrics">ตัวชี้วัด</li><li data-i18n="portal_guide_submit">ตรวจสอบและส่ง</li></ol><p data-i18n="portal_guide_note">บันทึกแบบร่างเพื่อกลับมากรอกต่อได้ ตรวจสอบข้อมูลก่อนยืนยันส่ง</p><button type="button" class="site-btn" data-ev-close data-i18n="portal_close">ปิด</button></div></dialog>`;
        document.body.append(dialogs);
        const mount = document.getElementById("app-site-header");
        if (mount) mount.replaceWith(header);
        else document.body.prepend(header);
        renderHeaderNavigation(navigation, "guest", contactDialogId);
        mountSidebar();

        navigation.querySelectorAll("[data-ev-dialog]").forEach(button => {
            button.addEventListener("click", () => document.getElementById(button.dataset.evDialog)?.showModal());
        });
        header.querySelectorAll("[data-header-contact]").forEach(button => {
            button.addEventListener("click", () => document.getElementById(contactDialogId)?.showModal());
        });
        dialogs.querySelectorAll("[data-ev-close]").forEach(button => {
            button.addEventListener("click", () => button.closest("dialog")?.close());
        });
        dialogs.querySelectorAll("dialog").forEach(dialog => {
            dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
        });

        const themeButton = header.querySelector("#theme-toggle");
        const savedTheme = () => {
            try { return localStorage.getItem("it_eval_theme") || "light"; }
            catch (_) { return "light"; }
        };
        const applyTheme = theme => {
            document.documentElement.dataset.theme = theme;
            document.body.classList.toggle("dark", theme === "dark");
            themeButton?.setAttribute("aria-pressed", String(theme === "dark"));
            const icon = themeButton?.querySelector("[data-theme-icon]");
            if (icon) icon.textContent = theme === "dark" ? "☀" : "☾";
        };
        applyTheme(savedTheme());
        themeButton?.addEventListener("click", () => {
            const next = savedTheme() === "dark" ? "light" : "dark";
            try { localStorage.setItem("it_eval_theme", next); } catch (_) {}
            applyTheme(next);
            window.ThemeLang?.applyTheme?.(next);
            window.EvaluationLocale?.setTheme?.(next);
        });

        const languageButton = header.querySelector("#language-toggle");
        let activeUser = null;
        const applyLanguage = lang => {
            const language = lang === "en" ? "en" : "th";
            document.documentElement.lang = language;
            if (languageButton) {
                languageButton.textContent = language === "en" ? "EN / TH" : "TH / EN";
                languageButton.setAttribute("aria-label", language === "en" ? "Switch to Thai" : "ภาษาอังกฤษ");
            }
            window.ThemeLang?.applyTranslations?.(document);
            renderHeaderNavigation(navigation, activeUser?.role === "admin" ? "admin" : activeUser ? "user" : "guest", contactDialogId);
            document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: language } }));
        };
        applyLanguage(currentLanguage());
        languageButton?.addEventListener("click", () => {
            const next = currentLanguage() === "th" ? "en" : "th";
            try { localStorage.setItem("it_eval_lang", next); } catch (_) {}
            window.ThemeLang?.saveLang?.(next);
            window.ThemeLang?.applyLang?.(next);
            window.EvaluationLocale?.setLanguage?.(next);
            applyLanguage(next);
        });

        const menuButton = header.querySelector("#menu-toggle");
        menuButton?.addEventListener("click", () => {
            const opening = !navigation.classList.contains("open");
            navigation.classList.toggle("open", opening);
            menuButton.setAttribute("aria-expanded", String(opening));
        });

        function refreshActiveState() {
            renderHeaderNavigation(navigation, activeUser?.role === "admin" ? "admin" : activeUser ? "user" : "guest", contactDialogId);
            markActive(document.querySelector(".sidebar"), navConfig.sidebar.admin, { pathname: location.pathname, hash: location.hash });
        }
        window.addEventListener("hashchange", refreshActiveState);
        const authState = window.EvaluatorAuth?.renderAuthButton?.();
        Promise.resolve(authState).then(user => {
            activeUser = user || null;
            renderHeaderNavigation(navigation, activeUser?.role === "admin" ? "admin" : activeUser ? "user" : "guest", contactDialogId);
        }).catch(error => console.error("[SiteHeader] Could not verify role for navigation", error));
    }

    initialize();
})();
