(function (root) {
    "use strict";
    const base = root.ENV?.API_BASE_URL || "http://127.0.0.1:8080";
    root.EvaluatorAPIBaseUrl = base;
    let activeUser = null;
    const auth = {
        async request(path, values = {}, method = "POST") {
            const token = sessionStorage.getItem("evaluatorToken");
            const options = {
                method,
                headers: {
                    ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            };
            if (method !== "GET") options.body = JSON.stringify(values);
            let response;
            try {
                response = await fetch(`${base}${path}`, options);
            } catch (error) {
                const failure = new Error(`เชื่อมต่อ API ไม่ได้ (${base}${path}): ${error.message}`);
                console.error("[EvaluatorAuth] API request failed", { path, baseUrl: base, message: error.message });
                throw failure;
            }
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                const message = result.error || `HTTP ${response.status}`;
                console.error("[EvaluatorAuth] API returned an error", { path, baseUrl: base, status: response.status, message });
                const failure = new Error(message);
                failure.status = response.status;
                throw failure;
            }
            if (!result.user) return result;
            return { ...result.user, token: result.token || result.user.token };
        },
        login(username, password) { return this.request("/auth/login", { username, password }); },
        register(username, password, displayName, role) {
            return this.request("/auth/register", { username, password, displayName, role });
        },
        saveSession(user) {
            if (user.token) sessionStorage.setItem("evaluatorToken", user.token);
            const profile = {
                id: user.id, username: user.username, displayName: user.displayName,
                name: user.displayName, evaluatorName: user.displayName, role: user.role, userRole: user.role
            };
            activeUser = profile;
            sessionStorage.setItem("evaluatorProfile", JSON.stringify(profile));
            return user;
        },
        async verify() {
            try {
                const user = await this.request("/auth/me", {}, "GET");
                this.saveSession(user);
                return user;
            } catch (error) {
                if (error.status === 401) this.clearSession();
                throw error;
            }
        },
        clearSession() {
            activeUser = null;
            sessionStorage.removeItem("evaluatorToken");
            sessionStorage.removeItem("evaluatorProfile");
        },
        async logout() {
            try { await this.request("/auth/logout", {}); }
            finally { this.clearSession(); }
        },
        current() {
            try { return JSON.parse(sessionStorage.getItem("evaluatorProfile") || "null"); }
            catch (_) { return null; }
        },
        async renderAuthButton(user) {
            if (arguments.length === 0) {
                if (sessionStorage.getItem("evaluatorToken")) {
                    try { user = await this.verify(); }
                    catch (error) {
                        if (error.status !== 401) console.error("[EvaluatorAuth] Could not restore signed-in account", error);
                        user = null;
                    }
                } else {
                    this.clearSession();
                    user = null;
                }
            }
            activeUser = user ? {
                id: user.id, username: user.username, displayName: user.displayName,
                name: user.displayName || user.name, role: user.role
            } : null;
            this.bindAuthControls();
            document.querySelectorAll(".auth-control-wrap").forEach(wrapper => {
                const control = wrapper.querySelector("[data-auth-control]");
                if (!control) return;
                const label = control.querySelector("[data-auth-label]") || control;
                label.textContent = activeUser?.displayName || activeUser?.name || "เข้าสู่ระบบ";
                label.removeAttribute("data-i18n");
                control.title = activeUser
                    ? `${activeUser.displayName || activeUser.name} · ${activeUser.role} · ID ${activeUser.id}`
                    : "เข้าสู่ระบบ";
                control.setAttribute("aria-haspopup", "menu");
                control.setAttribute("aria-expanded", "false");
                const menu = wrapper.querySelector(".auth-user-menu");
                menu.hidden = true;
                const name = menu.querySelector("[data-auth-name]");
                const role = menu.querySelector("[data-auth-role]");
                const id = menu.querySelector("[data-auth-id]");
                if (name) name.textContent = activeUser?.displayName || activeUser?.name || "";
                if (role) role.textContent = `Role: ${activeUser?.role || ""}`;
                if (id) id.textContent = `ID: ${activeUser?.id || ""}`;
            });
            return activeUser;
        },
        bindAuthControls() {
            const controls = document.querySelectorAll(".ev-signin, .login-button, [data-auth-control]");
            controls.forEach(control => {
                if (control.dataset.authBound === "1") return;
                control.dataset.authBound = "1";
                control.dataset.authControl = "1";
                control.removeAttribute("disabled");
                control.removeAttribute("data-open-dialog");
                const wrapper = document.createElement("div");
                wrapper.className = "auth-control-wrap";
                control.parentNode.insertBefore(wrapper, control);
                wrapper.append(control);
                const menu = document.createElement("div");
                menu.className = "auth-user-menu";
                menu.setAttribute("role", "menu");
                const name = document.createElement("strong");
                name.dataset.authName = "";
                const role = document.createElement("span");
                role.dataset.authRole = "";
                const id = document.createElement("span");
                id.dataset.authId = "";
                const logout = document.createElement("button");
                logout.type = "button";
                logout.textContent = "ออกจากระบบ";
                logout.addEventListener("click", async () => {
                    logout.disabled = true;
                    try { await auth.logout(); }
                    catch (error) { console.error("[EvaluatorAuth] Logout request failed", error); }
                    await auth.renderAuthButton(null);
                });
                menu.append(name, role, id, logout);
                wrapper.append(menu);
                control.addEventListener("click", event => {
                    event.preventDefault();
                    if (!activeUser) {
                        const dialog = document.getElementById("login-dialog");
                        if (dialog?.showModal) dialog.showModal();
                        else {
                            const rootPath = location.pathname.match(/^(.*?\/frontend\/)/)?.[1] || "/frontend/";
                            const loginUrl = new URL(`${rootPath}user/index.html`, location.origin);
                            loginUrl.searchParams.set("login", "1");
                            loginUrl.searchParams.set("returnTo", location.pathname + location.search + location.hash);
                            location.assign(loginUrl.href);
                        }
                        return;
                    }
                    const opening = menu.hidden;
                    document.querySelectorAll(".auth-user-menu").forEach(other => { other.hidden = true; });
                    menu.hidden = !opening;
                    control.setAttribute("aria-expanded", String(opening));
                });
            });
            if (!document.documentElement.dataset.authMenuBound) {
                document.documentElement.dataset.authMenuBound = "1";
                document.addEventListener("click", event => {
                    if (event.target.closest?.(".auth-control-wrap")) return;
                    document.querySelectorAll(".auth-user-menu").forEach(menu => { menu.hidden = true; });
                    document.querySelectorAll("[data-auth-control]").forEach(control => control.setAttribute("aria-expanded", "false"));
                });
                document.addEventListener("keydown", event => {
                    if (event.key !== "Escape") return;
                    document.querySelectorAll(".auth-user-menu").forEach(menu => { menu.hidden = true; });
                    document.querySelectorAll("[data-auth-control]").forEach(control => control.setAttribute("aria-expanded", "false"));
                });
            }
            if (!document.getElementById("auth-control-styles")) {
                const style = document.createElement("style");
                style.id = "auth-control-styles";
                style.textContent = ".auth-control-wrap{position:relative;display:inline-flex;align-items:center}.auth-user-menu{position:absolute;z-index:1000;top:calc(100% + 8px);right:0;display:grid;gap:8px;min-width:220px;padding:14px;border:1px solid var(--border,#d7deea);border-radius:10px;background:var(--bg-surface,#fff);color:var(--text-primary,#17365d);box-shadow:0 12px 32px #102d5526;font:400 .9rem/1.4 'Kanit','Prompt',sans-serif}.auth-user-menu[hidden]{display:none}.auth-user-menu strong{font-weight:600}.auth-user-menu span{color:var(--text-secondary,#56657a)}.auth-user-menu button{margin-top:4px;padding:8px 12px;border:1px solid var(--border-strong,#bdc8d8);border-radius:6px;background:var(--bg-page,#f4f7fb);color:inherit;font:inherit;cursor:pointer}.auth-user-menu button:hover{background:var(--primary-light,#eaf2ff)}";
                document.head.append(style);
            }
        }
    };
    root.EvaluatorAuth = auth;
})(typeof window !== "undefined" ? window : globalThis);
