window.API_BASE = window.API_BASE ? (window.API_BASE.endsWith("/api") ? window.API_BASE : window.API_BASE + "/api") : "http://localhost:5000/api";

document.addEventListener("DOMContentLoaded", () => {
    const resetForm = document.getElementById("resetForm");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");

    // Extract token from URL
    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
        showToast("No password reset token found in URL. Redirecting to login.", "warning");
        window.location.href = "login.html";
        return;
    }

    // Password Visibility Toggle
    const toggleButtons = document.querySelectorAll(".toggle-password");
    toggleButtons.forEach(button => {
        button.addEventListener("click", () => {
            const input = button.previousElementSibling;
            if (input.type === "password") {
                input.type = "text";
                button.classList.replace("fa-eye", "fa-eye-slash");
            } else {
                input.type = "password";
                button.classList.replace("fa-eye-slash", "fa-eye");
            }
        });
    });

    resetForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password !== confirmPassword) {
            showToast("Passwords do not match. Please verify.", "error");
            return;
        }

        const submitBtn = resetForm.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving Password...";

        try {
            const response = await fetch(`${window.API_BASE}/users/reset-password/${token}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to reset password.");
            }

            showToast("Success! Your password has been reset. Redirecting...", "success");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 3000);
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Save New Password";
        }
    });
});
