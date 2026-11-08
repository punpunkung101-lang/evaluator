(function () {
    "use strict";
    function initialize() {
    if (document.querySelector(".site-wide-nav")) return;
    const frontendBase = new URL("../../", location.href);
    const url = path => new URL(path, frontendBase).href;
    const nav = document.createElement("nav");
    nav.className = "site-wide-nav";
    nav.setAttribute("aria-label", "เมนูหลัก");
    const style = document.createElement("style");
    style.textContent = ".site-shared-masthead{display:flex;align-items:center;gap:14px;padding:12px max(20px,calc((100% - 1180px)/2));background:#fff;color:#17365d;font:500 14px/1.4 'Kanit',sans-serif}.site-shared-masthead a{display:flex;align-items:center;gap:14px;color:inherit;text-decoration:none}.site-shared-masthead img{width:56px;height:56px;object-fit:contain}.site-shared-masthead strong,.site-shared-masthead small{display:block}.site-shared-masthead small{color:#596b80}.site-wide-nav{position:relative;z-index:20;display:flex;width:100%;box-sizing:border-box;min-height:48px;flex-wrap:wrap;align-items:center;gap:0;padding:0 max(20px,calc((100% - 1180px)/2));background:#15365d;color:#fff;border-bottom:3px solid #d6aa50;font:500 14px/1.4 'Kanit',sans-serif}.site-wide-nav a{display:inline-block;padding:12px 14px;color:inherit;text-decoration:none;white-space:nowrap}.site-wide-nav a:hover,.site-wide-nav a:focus-visible{background:#ffffff20;outline:2px solid #d6aa50;outline-offset:-2px}.site-wide-nav-admin{display:flex;flex-wrap:wrap;margin-left:auto}.site-wide-nav-admin[hidden]{display:none!important}@media(max-width:760px){.site-wide-nav{overflow-x:auto;flex-wrap:nowrap;padding:0 8px}.site-wide-nav-admin{flex-wrap:nowrap;margin-left:0}.site-shared-masthead{padding:10px 14px}}";
    document.head.append(style);
    const logoLink = Array.from(document.querySelectorAll("a img[src*='Nu_bage.png']"))
        .map(image => image.closest("a"))
        .find(link => link);
    let masthead = logoLink?.closest("header") || null;
    if (!masthead) {
        masthead = document.createElement("header");
        masthead.className = "site-shared-masthead";
        masthead.innerHTML = `<a href="${url("user/index.html")}" aria-label="กลับสู่หน้าหลัก"><img src="${url("assets/img/Nu_bage.png")}" alt="ตรามหาวิทยาลัยนเรศวร" width="56" height="56"><span><strong>คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร</strong><small>Faculty of Allied Health Sciences, Naresuan University</small></span></a><button class="ev-signin" type="button">เข้าสู่ระบบ</button>`;
        document.body.prepend(masthead);
    }
    nav.innerHTML = `
        <a href="${url("user/index.html")}">หน้าหลัก</a>
        <a href="${url("user/effectiveness/evaluation.html")}">ประเมินประสิทธิผลระบบ IT</a>
        <a href="${url("user/satisfaction/index.html")}">ประเมินความพึงพอใจ</a>
        <span class="site-wide-nav-admin" aria-label="เมนูผู้ดูแล" hidden>
            <a href="${url("admin/dashboard.html")}">Dashboard ความพึงพอใจ</a>
            <a href="${url("admin/dashboard.html#quantitative-results")}">Dashboard ประสิทธิผล</a>
            <a href="${url("admin/manage/assessment-management.html")}">จัดการคำถาม</a>
        </span>`;
    if (masthead.classList.contains("ev-survey-header")) masthead.append(nav);
    else masthead.after(nav);
    const adminLinks = nav.querySelector(".site-wide-nav-admin");
    const authState = window.EvaluatorAuth?.renderAuthButton?.();
    Promise.resolve(authState).then(user => {
        if (user?.role === "admin" && adminLinks) adminLinks.hidden = false;
    }).catch(error => console.error("[SiteNav] Could not verify role for admin navigation", error));
    }
    if (window.AdminGuard?.ready) {
        window.AdminGuard.ready.then(initialize, () => {});
        return;
    }
    initialize();
})();
