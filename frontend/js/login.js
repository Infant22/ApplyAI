window.API_BASE = window.API_BASE ? (window.API_BASE.endsWith("/api") ? window.API_BASE : window.API_BASE + "/api") : "http://localhost:5000/api";

// Global callback for Google OAuth2 response
window.handleCredentialResponse = async (response) => {
    try {
        const res = await fetch(`${window.API_BASE}/users/google-login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ credential: response.credential })
        });
        
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || "Google Sign-In failed.");
        }
        
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        showToast("Google Login Successful!", "success");
        window.location.href = "dashboard.html";
    } catch (err) {
        showToast(err.message, "error");
    }
};

window.onGoogleLibraryLoad = () => {
    if (window.google) {
        google.accounts.id.initialize({
            client_id: "115386718020-k4nlmue5cvgqvob0v3qr20i33j75n786.apps.googleusercontent.com",
            callback: window.handleCredentialResponse
        });
        google.accounts.id.renderButton(
            document.getElementById("googleBtn"),
            { theme: "outline", size: "large", width: "100%" }
        );
    }
};

// Trigger immediately if script loaded first
if (window.google) {
    window.onGoogleLibraryLoad();
}

document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // DOM Elements
    // ==========================================

    const loginForm = document.getElementById("loginForm");

    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const rememberMe = document.getElementById("rememberMe");

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // ==========================================
    // Password Visibility Toggle
    // ==========================================

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

    // ==========================================
    // Helper Functions
    // ==========================================

    function getErrorElement(input) {

        if (input.parentElement.classList.contains("password-field")) {

            return input.parentElement.nextElementSibling;

        }

        return input.nextElementSibling;

    }

    function setError(input, message) {

        const error = getErrorElement(input);

        input.classList.add("input-error");
        input.classList.remove("input-success");

        error.textContent = message;

    }

    function setSuccess(input) {

        const error = getErrorElement(input);

        input.classList.remove("input-error");
        input.classList.add("input-success");

        error.textContent = "";

    }

    function clearInput(input) {

        const error = getErrorElement(input);

        input.classList.remove("input-error");
        input.classList.remove("input-success");

        error.textContent = "";

    }

    function clearFormValidation() {

        clearInput(email);
        clearInput(password);

    }

    // ==========================================
    // Validation Functions
    // ==========================================

    function validateEmail() {

        const value = email.value.trim();

        if (value === "") {

            setError(email, "Email is required.");
            return false;

        }

        if (!emailPattern.test(value)) {

            setError(email, "Please enter a valid email address.");
            return false;

        }

        setSuccess(email);

        return true;

    }

    function validatePassword() {

        const value = password.value.trim();

        if (value === "") {

            setError(password, "Password is required.");
            return false;

        }

        if (value.length < 8) {

            setError(password, "Password must be at least 8 characters.");
            return false;

        }

        setSuccess(password);

        return true;

    }

    // ==========================================
    // Live Validation
    // ==========================================

    // Validate fields when focus is lost (blur event)
    email.addEventListener("blur", validateEmail);
    password.addEventListener("blur", validatePassword);

    // If an error is already showing, validate live on keypress to clear the error immediately when fixed
    email.addEventListener("input", () => {
        if (email.classList.contains("input-error")) {
            validateEmail();
        }
    });

    password.addEventListener("input", () => {
        if (password.classList.contains("input-error")) {
            validatePassword();
        }
    });

    // ==========================================
    // Form Submit
    // ==========================================

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        clearFormValidation();

        let isValid = true;

        if (!validateEmail()) isValid = false;
        if (!validatePassword()) isValid = false;

        if (!isValid) return;

        // Remember Me

        if (rememberMe.checked) {

            localStorage.setItem("rememberedEmail", email.value.trim());

        } else {

            localStorage.removeItem("rememberedEmail");

        }

        const loginButton = loginForm.querySelector("button[type='submit']");

        loginButton.disabled = true;
        loginButton.textContent = "Signing In...";

        try {

            const response = await fetch(`${window.API_BASE}/users/login`, {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    email: email.value.trim(),
                    password: password.value

                })

            });

            const data = await response.json();

            if (!response.ok) {

                throw new Error(data.message || "Login Failed");

            }

            // Save JWT Token

            localStorage.setItem("token", data.token);

            // Save User Details

            localStorage.setItem("user", JSON.stringify(data.user));

            showToast("Login Successful!", "success");

            // Redirect to Dashboard

            window.location.href = "dashboard.html";

        }

        catch (error) {

            showToast(error.message, "error");

        }

        finally {

            loginButton.disabled = false;
            loginButton.textContent = "Sign In";

        }

    });

    // ==========================================
    // Load Remembered Email
    // ==========================================

    const rememberedEmail = localStorage.getItem("rememberedEmail");

    if (rememberedEmail) {

        email.value = rememberedEmail;

        rememberMe.checked = true;

    }

    // Google Sign-in initialized asynchronously via onload handler

});