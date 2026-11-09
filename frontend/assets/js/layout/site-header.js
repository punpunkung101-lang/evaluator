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

    function makeNavItem(item) {
        const element = item.action ? document.createElement("button") : document.createElement("a");
        if (item.action) {
            element.type = "button";
            element.className = "site-nav-dialog-btn";
            element.dataset.evDialog = item.action;
        } else {
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

    function renderHeaderNavigation(navigation, role) {
        const main = navigation.querySelector(".site-nav-main");
        const admin = navigation.querySelector(".site-wide-nav-admin");
        main.replaceChildren();
        admin.replaceChildren();
        const items = navConfig.header[role] || navConfig.header.guest;
        for (const item of items) {
            const target = role === "admin" && item.id !== "home" ? admin : main;
            target.append(makeNavItem(item));
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
        const logoLink = Array.from(document.querySelectorAll("a img[src*='Nu_bage.png']"))
            .map(image => image.closest("a"))
            .find(link => link);
        let masthead = logoLink?.closest("header") || null;
        if (!masthead) {
            masthead = document.createElement("header");
            masthead.className = "site-shared-masthead";
            masthead.setAttribute("data-site-header", "1");
            masthead.innerHTML = `<div class="site-brand-row"><a class="site-brand" href="${resolveFrontendPath("user/index.html")}" aria-label="กลับสู่หน้าหลัก"><img src="${logoUrl}" alt="ตรามหาวิทยาลัยนเรศวร" width="56" height="56"><span><strong>คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร</strong><small>Faculty of Allied Health Sciences, Naresuan University</small></span></a><div class="site-header-actions"><button type="button" class="site-btn site-theme-btn" id="ev-theme" aria-label="โหมดมืด" aria-pressed="false" title="โหมดมืด"><span data-theme-icon aria-hidden="true">☾</span></button><button type="button" class="site-btn site-lang-btn" id="q-admin-language" data-language-toggle aria-label="Switch language">EN</button><button class="ev-signin" type="button">เข้าสู่ระบบ</button></div></div>`;
        }

        const navigation = document.createElement("nav");
        navigation.className = "site-wide-nav";
        navigation.dataset.siteHeader = "1";
        navigation.setAttribute("aria-label", "เมนูหลัก");
        navigation.innerHTML = `<div class="site-nav-inner"><div class="site-nav-main"></div><span class="site-wide-nav-admin" hidden></span></div>`;
        const dialogs = document.createElement("div");
        dialogs.id = "site-header-dialogs";
        dialogs.innerHTML = `<dialog id="ev-contact" class="site-dialog" aria-labelledby="ev-contact-title"><div class="site-dialog-card"><h2 id="ev-contact-title">ติดต่อเรา</h2><p>หากต้องการความช่วยเหลือ โปรดติดต่อผู้รับผิดชอบโครงการหรือผู้ดูแลระบบของคณะ</p><button type="button" class="site-btn" data-ev-close>ปิด</button></div></dialog><dialog id="ev-guide" class="site-dialog" aria-labelledby="ev-guide-title"><div class="site-dialog-card"><h2 id="ev-guide-title">คู่มือการใช้งาน</h2><ol><li>ข้อมูลผู้ประเมิน</li><li>กระบวนการก่อนใช้ IT</li><li>กระบวนการหลังใช้ IT</li><li>ตัวชี้วัด</li><li>ตรวจสอบและส่ง</li></ol><p>บันทึกแบบร่างเพื่อกลับมากรอกต่อได้ ตรวจสอบข้อมูลก่อนยืนยันส่ง</p><button type="button" class="site-btn" data-ev-close>ปิด</button></div></dialog>`;
        document.body.append(dialogs);
        if (logoLink?.closest("header")) masthead.after(navigation);
        else {
            document.body.prepend(navigation);
            document.body.prepend(masthead);
        }
        renderHeaderNavigation(navigation, "guest");
        mountSidebar();

        navigation.querySelectorAll("[data-ev-dialog]").forEach(button => {
            button.addEventListener("click", () => document.getElementById(button.dataset.evDialog)?.showModal());
        });
        dialogs.querySelectorAll("[data-ev-close]").forEach(button => {
            button.addEventListener("click", () => button.closest("dialog")?.close());
        });
        dialogs.querySelectorAll("dialog").forEach(dialog => {
            dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
        });

        const themeButton = masthead.querySelector("#ev-theme");
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

        const languageButton = masthead.querySelector("#q-admin-language");
        let activeUser = null;
        const applyLanguage = lang => {
            const language = lang === "en" ? "en" : "th";
            document.documentElement.lang = language;
            if (languageButton) {
                languageButton.textContent = language === "en" ? "ไทย" : "EN";
                languageButton.setAttribute("aria-label", language === "en" ? "Switch to Thai" : "ภาษาอังกฤษ");
            }
            window.ThemeLang?.applyTranslations?.(document);
            renderHeaderNavigation(navigation, activeUser?.role === "admin" ? "admin" : activeUser ? "user" : "guest");
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

        function refreshActiveState() {
            renderHeaderNavigation(navigation, activeUser?.role === "admin" ? "admin" : activeUser ? "user" : "guest");
            markActive(document.querySelector(".sidebar"), navConfig.sidebar.admin, { pathname: location.pathname, hash: location.hash });
        }
        window.addEventListener("hashchange", refreshActiveState);
        const authState = window.EvaluatorAuth?.renderAuthButton?.();
        Promise.resolve(authState).then(user => {
            activeUser = user || null;
            renderHeaderNavigation(navigation, activeUser?.role === "admin" ? "admin" : activeUser ? "user" : "guest");
        }).catch(error => console.error("[SiteHeader] Could not verify role for navigation", error));
    }

    initialize();
})();
