document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.getElementById("sidebar");

  if (!menuBtn || !sidebar) return;

  menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("sidebar-open");
    document.body.classList.toggle("no-scroll");
  });

  // Close sidebar when clicking any nav link (mobile UX)
  sidebar.querySelectorAll(".nav-item").forEach(link => {
    link.addEventListener("click", () => {
      sidebar.classList.remove("sidebar-open");
      document.body.classList.remove("no-scroll");
    });
  });
});
