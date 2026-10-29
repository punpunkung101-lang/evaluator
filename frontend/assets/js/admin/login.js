/**
 * IT Evaluator - Admin Login Authentication Handler
 * Faculty of Allied Health Sciences, Naresuan University
 */

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("adminLoginForm");
    const emailInput = document.getElementById("adminEmail");
    const passwordInput = document.getElementById("adminPassword");
    const loginError = document.getElementById("loginError");

    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const email = (emailInput?.value || "").trim();
            const password = (passwordInput?.value || "").trim();

            if (!email || !password) {
                if (loginError) {
                    loginError.textContent = "กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน";
                    loginError.hidden = false;
                }
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
});
