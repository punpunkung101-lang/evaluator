(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.AdminTabs = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const tabs = Object.freeze([
        { id: "summary", key: "admin_tab_summary", hash: "#summary" },
        { id: "effectiveness", key: "admin_tab_effectiveness", hash: "#effectiveness" },
        { id: "satisfaction", key: "admin_tab_satisfaction", hash: "#satisfaction" },
        { id: "settings", key: "admin_tab_settings", hash: "#settings" }
    ]);

    function pageUrl(path, scriptUrl, runtimeUrl, systemId, hash = "") {
        const url = new URL(runtimeUrl.fromScript(`../../../${path}`, scriptUrl));
        if (systemId) url.searchParams.set("system", systemId);
        if (hash) url.hash = hash;
        return url.href;
    }

    function mount(options = {}) {
        const scriptUrl = document.currentScript?.src || document.querySelector('script[src$="admin-tabs.js"]')?.src;
        const runtimeUrl = window.EvaluatorRuntimeUrl;
        const mountPoint = document.getElementById(options.mountId || "admin-tabs");
        if (!scriptUrl || !runtimeUrl || !mountPoint) return null;
        const systemId = options.systemId || new URLSearchParams(location.search).get("system") || "";
        const systems = options.systems || window.AssessmentCatalog?.getSystems?.() || window.systems || [];
        const t = key => window.ThemeLang?.i18n?.[document.documentElement.lang === "en" ? "en" : "th"]?.[key] || key;
        const selected = systems.find(item => item.id === systemId);
        const shell = document.createElement("section");
        shell.className = "admin-page-shell";
        shell.dataset.systemId = systemId;

        const context = document.createElement("div");
        context.className = "admin-system-context";
        const label = document.createElement("label");
        label.htmlFor = "admin-system-select";
        label.textContent = t("admin_system_label");
        const select = document.createElement("select");
        select.id = "admin-system-select";
        select.setAttribute("aria-label", label.textContent);
        select.add(new Option(t("admin_system_choose"), ""));
        for (const system of systems) select.add(new Option(system.name || system.id, system.id));
        select.value = systemId;
        select.addEventListener("change", () => {
            if (!select.value) return;
            location.assign(pageUrl("admin/results.html", scriptUrl, runtimeUrl, select.value, location.hash || "#summary"));
        });
        const name = document.createElement("p");
        name.className = "admin-system-name";
        name.textContent = selected?.name ? `${selected.name} (${selected.id})` : t("admin_system_all");
        context.append(label, select, name);

        const nav = document.createElement("nav");
        nav.className = "admin-tabs";
        nav.setAttribute("aria-label", t("admin_tabs_label"));
        const requestedTab = options.activeTab || "summary";
        const activeTab = tabs.some(tab => tab.id === requestedTab) ? requestedTab : "summary";
        const processManagement = /\/admin\/manage\/processes\.html$/i.test(location.pathname);
        for (const tab of tabs) {
            const link = document.createElement("a");
            link.href = pageUrl("admin/results.html", scriptUrl, runtimeUrl, systemId, tab.hash);
            link.dataset.i18n = tab.key;
            link.textContent = t(tab.key);
            if (processManagement) link.id = "q-admin-dashboard-back";
            if (tab.id === activeTab) {
                link.className = "active";
                link.setAttribute("aria-current", "page");
            }
            nav.append(link);
        }
        const settings = document.createElement("div");
        settings.className = "admin-settings-links";
        settings.hidden = activeTab !== "settings";
        for (const [key, path] of [
            ["admin_assessment_settings", "admin/manage/assessment-management.html"],
            ["admin_process_settings", "admin/manage/processes.html"]
        ]) {
            const link = document.createElement("a");
            link.href = pageUrl(path, scriptUrl, runtimeUrl, systemId);
            link.dataset.i18n = key;
            link.textContent = t(key);
            if (processManagement) link.id = "q-admin-dashboard-back";
            settings.append(link);
        }
        shell.append(context, nav, settings);
        mountPoint.replaceWith(shell);
        document.addEventListener("langchange", () => {
            shell.querySelectorAll("[data-i18n]").forEach(element => { element.textContent = t(element.dataset.i18n); });
            label.textContent = t("admin_system_label");
            select.setAttribute("aria-label", label.textContent);
            name.textContent = selected?.name ? `${selected.name} (${selected.id})` : t("admin_system_all");
            nav.setAttribute("aria-label", t("admin_tabs_label"));
        });
        return shell;
    }

    return Object.freeze({ tabs, pageUrl, mount });
});
