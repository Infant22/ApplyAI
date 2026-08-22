window.API_BASE = window.API_BASE ? (window.API_BASE.endsWith("/api") ? window.API_BASE : window.API_BASE + "/api") : "http://localhost:5000/api";

document.addEventListener("DOMContentLoaded", () => {
    const forgotForm = document.getElementById("forgotForm");
    const emailInput = document.getElementById("email");
    const forgotFormContainer = document.getElementById("forgotFormContainer");
    const successState = document.getElementById("successState");
    const sentEmailAddress = document.getElementById("sentEmailAddress");
    const rememberPassLink = document.getElementById("rememberPassLink");

    forgotForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        if (!email) return;

        const submitBtn = forgotForm.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending Link...";

        try {
            const response = await fetch(`${window.API_BASE}/users/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to submit recovery request.");
            }

            // Successfully sent: toggle panels
            sentEmailAddress.textContent = email;
            forgotFormContainer.style.display = "none";
            rememberPassLink.style.display = "none";
            successState.style.display = "block";
            
            emailInput.value = "";
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Send Recovery Link";
        }
    });
});
