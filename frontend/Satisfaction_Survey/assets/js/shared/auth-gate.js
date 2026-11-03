(() => {
    const API = window.EvaluationAPI;
    const homeUrl = new URL("../../Effectiveness_Of_It/main/index.html", window.location.href);
    const requiredRole = document.body.dataset.authRequired;

    function addLogout(user) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `${user.fullName} · ${window.t ? window.t("logout") : "ออกจากระบบ"}`;
        button.setAttribute("aria-label", window.t ? window.t("logout") : "ออกจากระบบ");
        button.style.cssText = "position:fixed;right:16px;top:12px;z-index:1000;padding:8px 12px;border:1px solid #ccd5e0;border-radius:6px;background:var(--bg-surface,#fff);color:var(--text-primary,#183557);cursor:pointer;font:inherit";
        button.addEventListener("click", async () => {
            button.disabled = true;
            try { await API.logout(); } catch (_) { /* The server clears the session on next request if offline. */ }
            sessionStorage.removeItem("evaluatorProfile");
            sessionStorage.removeItem("itEvaluationDraft");
            sessionStorage.removeItem("itEvaluationComplete");
            window.location.replace(homeUrl.href);
        });
        document.body.appendChild(button);
    }

    window.authReady = API.getCurrentUser().then(user => {
        window.currentUser = user;
        sessionStorage.setItem("evaluatorProfile", JSON.stringify({ id: user.id, username: user.username, evaluatorId: user.evaluatorId, name: user.fullName, role: user.role }));
        if (requiredRole === "admin" && !user.isAdmin) {
            window.location.replace(homeUrl.href);
            return null;
        }
        if (requiredRole) addLogout(user);
        document.documentElement.classList.remove("auth-checking");
        document.dispatchEvent(new CustomEvent("authready", { detail: user }));
        return user;
    }).catch(() => {
        document.documentElement.classList.remove("auth-checking");
        if (!requiredRole) return null;
        sessionStorage.setItem("ahs-pending-destination", window.location.href);
        window.location.replace(homeUrl.href);
        return null;
    });
})();
