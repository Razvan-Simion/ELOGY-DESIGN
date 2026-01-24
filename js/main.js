/* =========================================
   ELOGY Design - minimal JS
   - Hamburger drawer open/close
   - Simple fade-in on scroll for [data-animate]
   ========================================= */

(function () {
  const drawer = document.querySelector("[data-drawer]");
  const openBtn = document.querySelector("[data-drawer-open]");
  const closeBtns = document.querySelectorAll("[data-drawer-close]");
  const headerHamburger = document.querySelector(".header__hamburger");

  if (drawer && openBtn && closeBtns.length) {
    const setOpen = (isOpen) => {
      drawer.classList.toggle("is-open", isOpen);
      drawer.setAttribute("aria-hidden", String(!isOpen));
      openBtn.setAttribute("aria-expanded", String(isOpen));

      // Lock scroll only when open (simple, non-invasive)
      document.documentElement.style.overflow = isOpen ? "hidden" : "";
    };

    openBtn.addEventListener("click", () => setOpen(true));
    closeBtns.forEach((btn) => btn.addEventListener("click", () => setOpen(false)));

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) {
        setOpen(false);
        headerHamburger?.focus();
      }
    });
  }

  // Simple fade-in for sections marked with [data-animate]
  const items = document.querySelectorAll("[data-animate]");
  if (items.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.15 }
    );

    items.forEach((el) => io.observe(el));
  }
})();
