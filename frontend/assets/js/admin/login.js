/**
 * IT Evaluator - Admin Login Authentication Handler
 * Faculty of Allied Health Sciences, Naresuan University
 */

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("adminLoginForm");
    const emailInput = document.getElementById("adminEmail");
    const passwordInput = document.getElementById("adminPassword");
    const loginError = document.getElementById("loginError");

    let currentErrorKey = null;

    function showError(key) {
        if (!loginError) return;
        currentErrorKey = key;
        loginError.textContent = window.t ? window.t(key) : (key === "login_error_empty" ? "กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน" : "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        loginError.hidden = false;
    }

    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const email = (emailInput?.value || "").trim();
            const password = (passwordInput?.value || "").trim();

            if (!email || !password) {
                showError("login_error_empty");
                return;
            }

            // Institutional Academic Portal - Allow access and redirect to dashboard
            sessionStorage.setItem("adminUser", JSON.stringify({
                username: email,
                role: "administrator",
                loginTime: new Date().toISOString()
            }));

            window.location.href = "dashboard.html";
        });
    }

    document.addEventListener("langchange", () => {
        if (currentErrorKey && loginError && !loginError.hidden) {
            loginError.textContent = window.t ? window.t(currentErrorKey) : loginError.textContent;
        }
    });
});
