(function (root) {
    "use strict";

    function fromScript(relativePath, script) {
        const source = typeof script === "string" ? script : script?.src;
        if (!source) throw new TypeError("A script URL is required to resolve this path.");
        return new URL(relativePath, source).href;
    }

    const runtimeUrl = Object.freeze({ fromScript });
    if (typeof module === "object" && module.exports) module.exports = runtimeUrl;
    else root.EvaluatorRuntimeUrl = runtimeUrl;
})(typeof window !== "undefined" ? window : globalThis);
