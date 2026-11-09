(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.AdminData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    function createClient({ baseUrl, token, fetchImpl = fetch }) {
        async function get(path) {
            const response = await fetchImpl(`${baseUrl}${path}`, {
                method: "GET",
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error(`Unexpected response for ${path}`);
            return data;
        }
        return Object.freeze({
            load() {
                return Promise.allSettled([
                    get("/systems"),
                    get("/quantitative"),
                    get("/evaluations")
                ]).then(([systems, effectiveness, satisfaction]) => ({ systems, effectiveness, satisfaction }));
            }
        });
    }

    function fromWindow(root = typeof window !== "undefined" ? window : {}) {
        const baseUrl = root.API_CONFIG?.backendBaseUrl || root.ENV?.API_BASE_URL || "http://127.0.0.1:8080";
        const token = root.sessionStorage?.getItem("evaluatorToken") || "";
        return createClient({ baseUrl, token, fetchImpl: root.fetch?.bind(root) || fetch });
    }

    return Object.freeze({ createClient, fromWindow });
});
