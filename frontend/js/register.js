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

    const registerForm = document.getElementById("registerForm");

    const fullName = document.getElementById("fullname");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const terms = document.getElementById("terms");
    const termsError = document.querySelector(".terms .error-message");

    const strengthBar = document.getElementById("strengthBar");
    const strengthText = document.getElementById("strengthText");

    // Password Requirement Checklist

const lengthCheck = document.getElementById("lengthCheck");
const uppercaseCheck = document.getElementById("uppercaseCheck");
const lowercaseCheck = document.getElementById("lowercaseCheck");
const numberCheck = document.getElementById("numberCheck");
const specialCheck = document.getElementById("specialCheck");

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

                button.classList.remove("fa-eye");
                button.classList.add("fa-eye-slash");

            } else {

                input.type = "password";

                button.classList.remove("fa-eye-slash");
                button.classList.add("fa-eye");

            }

        });

    });

    // ==========================================
    // Password Strength Meter
    // ==========================================

    password.addEventListener("input", () => {

        const value = password.value;

        let score = 0;

        if (value.length >= 8) score++;
        if (/[A-Z]/.test(value)) score++;
        if (/[a-z]/.test(value)) score++;
        if (/[0-9]/.test(value)) score++;
        if (/[^A-Za-z0-9]/.test(value)) score++;

        switch (score) {

            case 0:
            case 1:
                strengthBar.style.width = "20%";
                strengthBar.style.background = "#EF4444";
                strengthText.textContent = "Weak Password";
                break;

            case 2:
            case 3:
                strengthBar.style.width = "50%";
                strengthBar.style.background = "#F59E0B";
                strengthText.textContent = "Medium Password";
                break;

            case 4:
                strengthBar.style.width = "75%";
                strengthBar.style.background = "#10B981";
                strengthText.textContent = "Strong Password";
                break;

            case 5:
                strengthBar.style.width = "100%";
                strengthBar.style.background = "#2563EB";
                strengthText.textContent = "Very Strong Password";
                break;

        }

        if (value.length === 0) {

            strengthBar.style.width = "0";
            strengthText.textContent = "Password Strength";

        }

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

    clearInput(fullName);
    clearInput(email);
    clearInput(password);
    clearInput(confirmPassword);

    termsError.textContent = "";

}

// ==========================================
// Password Requirement Checklist
// ==========================================

function updateRequirement(item, isValid) {

    const icon = item.querySelector("i");

    if (isValid) {

        item.classList.add("valid");

        icon.classList.remove("fa-times");
        icon.classList.add("fa-check");

    } else {

        item.classList.remove("valid");

        icon.classList.remove("fa-check");
        icon.classList.add("fa-times");

    }

}
    // ==========================================
    // Validation Functions
    // ==========================================

    function validateFullName() {

        if (fullName.value.trim() === "") {

            setError(fullName, "Full name is required.");
            return false;

        }

        setSuccess(fullName);
        return true;

    }

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

    const value = password.value;

    if (value.trim() === "") {

        setError(password, "Password is required.");
        return false;

    }

    if (value.length < 8) {

        setError(password, "Password must be at least 8 characters.");
        return false;

    }

    if (!/[A-Z]/.test(value)) {

        setError(password, "Include at least one uppercase letter.");
        return false;

    }

    if (!/[a-z]/.test(value)) {

        setError(password, "Include at least one lowercase letter.");
        return false;

    }

    if (!/[0-9]/.test(value)) {

        setError(password, "Include at least one number.");
        return false;

    }

    if (!/[^A-Za-z0-9]/.test(value)) {

        setError(password, "Include at least one special character.");
        return false;

    }

    setSuccess(password);

    return true;

}

    function validateConfirmPassword() {

        if (confirmPassword.value.trim() === "") {

            setError(confirmPassword, "Please confirm your password.");
            return false;

        }

        if (confirmPassword.value !== password.value) {

            setError(confirmPassword, "Passwords do not match.");
            return false;

        }

        setSuccess(confirmPassword);
        return true;

    }

function validateTerms() {

    if (!terms.checked) {

        termsError.textContent = "Please accept the Terms & Privacy Policy.";

        return false;

    }

    termsError.textContent = "";

    return true;

}

// ==========================================
// Live Validation
// ==========================================

// Full Name

// Full Name
fullName.addEventListener("blur", validateFullName);
fullName.addEventListener("input", () => {
    if (fullName.classList.contains("input-error")) {
        validateFullName();
    }
});

// Email
email.addEventListener("blur", validateEmail);
email.addEventListener("input", () => {
    if (email.classList.contains("input-error")) {
        validateEmail();
    }
});

// Password
password.addEventListener("blur", validatePassword);
password.addEventListener("input", () => {
    if (password.classList.contains("input-error")) {
        validatePassword();
    }

    const value = password.value;

    if (confirmPassword.value !== "") {
        validateConfirmPassword();
    }

    updateRequirement(lengthCheck, value.length >= 8);
    updateRequirement(uppercaseCheck, /[A-Z]/.test(value));
    updateRequirement(lowercaseCheck, /[a-z]/.test(value));
    updateRequirement(numberCheck, /[0-9]/.test(value));
    updateRequirement(specialCheck, /[^A-Za-z0-9]/.test(value));
});

// Confirm Password
confirmPassword.addEventListener("blur", validateConfirmPassword);
confirmPassword.addEventListener("input", () => {
    if (confirmPassword.classList.contains("input-error")) {
        validateConfirmPassword();
    }
});

// Terms

terms.addEventListener("change", () => {

    validateTerms();

});

    // ==========================================
    // Form Submit
    // ==========================================

    registerForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        clearFormValidation();

        let isValid = true;

        if (!validateFullName()) isValid = false;
        if (!validateEmail()) isValid = false;
        if (!validatePassword()) isValid = false;
        if (!validateConfirmPassword()) isValid = false;
        if (!validateTerms()) isValid = false;

     if (isValid) {

    const registerButton = registerForm.querySelector("button[type='submit']");

    registerButton.disabled = true;
    registerButton.textContent = "Creating Account...";

    try {

        const response = await fetch(`${window.API_BASE}/users/register`, {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                name: fullName.value.trim(),
                email: email.value.trim(),
                password: password.value

            })

        });

        const data = await response.json();

        if (!response.ok) {

            throw new Error(data.message || "Registration Failed");

        }

        showToast("Registration Successful!", "success");

        registerForm.reset();

        strengthBar.style.width = "0%";
        strengthText.textContent = "Password Strength";

        window.location.href = "login.html";

    }

    catch (error) {

        showToast(error.message, "error");

    }

    finally {

        registerButton.disabled = false;
        registerButton.textContent = "Create Account";

    }

}

        terms.addEventListener("change", () => {

        if (terms.checked) {

        termsError.textContent = "";

    }

    });

    });

    // Google Sign-in initialized asynchronously via onload handler

});