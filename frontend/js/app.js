// ==========================================
// Hamburger Menu & Navigation Overlay
// ==========================================

const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
const navButtons = document.querySelector(".nav-buttons");
const navOverlay = document.getElementById("navOverlay");

if (hamburger && navLinks && navButtons) {

    hamburger.addEventListener("click", () => {
        navLinks.classList.toggle("active");
        navButtons.classList.toggle("active");
        if (navOverlay) {
            navOverlay.classList.toggle("active");
        }

        const icon = hamburger.querySelector("i");

        if (navLinks.classList.contains("active")) {
            icon.classList.replace("fa-bars", "fa-xmark");
        } else {
            icon.classList.replace("fa-xmark", "fa-bars");
        }
    });

    if (navOverlay) {
        navOverlay.addEventListener("click", () => {
            navLinks.classList.remove("active");
            navButtons.classList.remove("active");
            navOverlay.classList.remove("active");
            const icon = hamburger.querySelector("i");
            icon.classList.replace("fa-xmark", "fa-bars");
        });
    }

    document.querySelectorAll(".nav-links a").forEach(link => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("active");
            navButtons.classList.remove("active");
            if (navOverlay) {
                navOverlay.classList.remove("active");
            }

            const icon = hamburger.querySelector("i");
            icon.classList.replace("fa-xmark", "fa-bars");
        });
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) {
            navLinks.classList.remove("active");
            navButtons.classList.remove("active");
            if (navOverlay) {
                navOverlay.classList.remove("active");
            }

            const icon = hamburger.querySelector("i");
            icon.classList.replace("fa-xmark", "fa-bars");
        }
    });

}