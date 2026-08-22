// Central environment-aware API URL configurations for ApplyAI
window.API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:5000"
  : "https://your-deployed-backend-url.com"; // placeholder to be replaced in production

// Global custom Toast notification handler
window.showToast = function(message, type = "success") {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        document.body.appendChild(toast);
    }
    
    // Set type styling and content
    toast.className = `toast show ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}"></i>
        <span>${message}</span>
    `;

    if (window.toastTimeout) {
        clearTimeout(window.toastTimeout);
    }
    
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
};
