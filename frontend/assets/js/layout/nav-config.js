(function (root, factory) {
    "use strict";
    const config = factory();
    if (typeof module === "object" && module.exports) module.exports = config;
    else root.EvaluatorNavigation = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    function matchesPage(pathname, suffix) {
        const path = String(pathname || "").replace(/\/+$/, "").toLowerCase();
        const target = String(suffix).toLowerCase();
        return path === target || path.endsWith(`/${target}`);
    }

    function dashboardPath(pathname) {
        return matchesPage(pathname, "admin/dashboard.html");
    }

    const home = Object.freeze({
        id: "home",
        labelKey: "nav_home",
        href: "user/index.html",
        icon: "home",
        activeMatcher: ({ pathname }) => matchesPage(pathname, "user/index.html")
    });
    const effectiveness = Object.freeze({
        id: "effectiveness",
        labelKey: "nav_effectiveness",
        href: "user/effectiveness/evaluation.html",
        activeMatcher: ({ pathname }) => matchesPage(pathname, "user/effectiveness/evaluation.html")
    });
    const satisfaction = Object.freeze({
        id: "satisfaction",
        labelKey: "nav_satisfaction_survey",
        href: "user/satisfaction/satisfaction.html",
        activeMatcher: ({ pathname }) => /\/user\/satisfaction\//i.test(String(pathname || ""))
    });
    const guide = Object.freeze({ id: "guide", labelKey: "nav_guide", action: "ev-guide" });
    const contact = Object.freeze({ id: "contact", labelKey: "nav_contact", action: "ev-contact" });
    const overview = Object.freeze({
        id: "overview",
        labelKey: "nav_overview",
        href: "admin/dashboard.html#overview",
        icon: "overview",
        activeMatcher: ({ pathname, hash }) =>
            dashboardPath(pathname) && (!hash || hash === "#overview")
    });
    const results = Object.freeze({
        id: "results",
        labelKey: "nav_systems",
        href: "admin/results.html",
        icon: "results",
        activeMatcher: ({ pathname, hash }) =>
            (dashboardPath(pathname) && ["#systems", "#quantitative-results", "#satisfaction"].includes(hash)) ||
            matchesPage(pathname, "admin/results.html") ||
            matchesPage(pathname, "admin/evaluation-detail.html") ||
            matchesPage(pathname, "admin/manage/assessment-management.html") ||
            matchesPage(pathname, "admin/manage/processes.html")
    });

    const publicHeader = Object.freeze([home, effectiveness, satisfaction, guide, contact]);
    const adminHeader = Object.freeze([home, overview, results]);
    const adminSidebar = Object.freeze([overview, results]);
    const footer = Object.freeze({
        id: "user-evaluation",
        labelKey: "nav_user_evaluation",
        href: satisfaction.href,
        icon: "home"
    });
    const header = Object.freeze({ guest: publicHeader, user: publicHeader, admin: adminHeader });
    const sidebar = Object.freeze({ admin: adminSidebar, footer });
    const labelKeys = Object.freeze([...new Set([
        ...publicHeader.map(item => item.labelKey),
        ...adminHeader.map(item => item.labelKey),
        footer.labelKey
    ])]);

    function activeItem(items, location) {
        return items.find(item => item.activeMatcher?.(location || {})) || null;
    }

    function activeKey(location, items = adminSidebar) {
        return activeItem(items, location)?.id || null;
    }

    function showsSidebarFooter(pathname) {
        return matchesPage(pathname, "admin/dashboard.html") ||
            matchesPage(pathname, "admin/evaluation-detail.html") || matchesPage(pathname, "admin/results.html");
    }

    function isProcessManagementPage(pathname) {
        return matchesPage(pathname, "admin/manage/processes.html");
    }

    return Object.freeze({ header, sidebar, labelKeys, activeItem, activeKey, showsSidebarFooter, isProcessManagementPage });
});
