document.addEventListener('DOMContentLoaded', () => {
  // Navigation Transitions
  const exploreBtn = document.getElementById('explore-btn');
  const landingPage = document.getElementById('landing-page');
  const workspacePortal = document.getElementById('workspace-portal');
  const logoHome = document.getElementById('logo-home');

  function enterWorkspace() {
    landingPage.classList.add('hidden');
    workspacePortal.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    initScrollSpy();
  }

  function goHome() {
    workspacePortal.classList.add('hidden');
    landingPage.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (exploreBtn) {
    exploreBtn.addEventListener('click', enterWorkspace);
  }
  if (logoHome) {
    logoHome.addEventListener('click', goHome);
  }

  // Sidebar Toggle for Mobile
  const toggleSidebarBtn = document.getElementById('toggle-sidebar');
  const sidebarEl = document.getElementById('sidebar-container');
  if (toggleSidebarBtn && sidebarEl) {
    toggleSidebarBtn.addEventListener('click', () => {
      sidebarEl.classList.toggle('-translate-x-full');
    });
  }

  // ScrollSpy & Smooth Scroll navigation
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.sidebar-link');

  function initScrollSpy() {
    const options = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach((link) => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
              // Update breadcrumbs
              const breadcrumbPage = document.getElementById('breadcrumb-page');
              if (breadcrumbPage) {
                breadcrumbPage.textContent = link.querySelector('span')?.textContent || link.textContent.trim();
              }
            }
          });
        }
      });
    }, options);

    sections.forEach((section) => {
      observer.observe(section);
    });
  }

  // Smooth scroll to anchors
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      if (targetSection) {
        // Mobile auto close sidebar
        if (sidebarEl && !sidebarEl.classList.contains('-translate-x-full')) {
          sidebarEl.classList.add('-translate-x-full');
        }
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Global Search logic
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const searchResultsContainer = document.getElementById('search-results');
      if (!searchResultsContainer) return;

      if (!query) {
        searchResultsContainer.classList.add('hidden');
        searchResultsContainer.innerHTML = '';
        return;
      }

      const matches = [];
      sections.forEach((sec) => {
        const textContent = sec.innerText.toLowerCase();
        if (textContent.includes(query)) {
          const title = sec.querySelector('h2')?.innerText || sec.id;
          matches.push({
            id: sec.id,
            title: title,
            snippet: sec.innerText.substring(0, 100).replace(/\n/g, ' ') + '...'
          });
        }
      });

      if (matches.length > 0) {
        searchResultsContainer.classList.remove('hidden');
        searchResultsContainer.innerHTML = matches.map(m => `
          <div class="p-2.5 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 last:border-0 transition-colors" data-target="#${m.id}">
            <div class="text-xs font-semibold text-indigo-400">${m.title}</div>
            <div class="text-[11px] text-zinc-400 mt-0.5 truncate">${m.snippet}</div>
          </div>
        `).join('');

        searchResultsContainer.querySelectorAll('[data-target]').forEach(item => {
          item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            const targetSec = document.querySelector(targetId);
            if (targetSec) {
              targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
              targetSec.classList.add('ring-2', 'ring-indigo-500', 'transition-all');
              setTimeout(() => {
                targetSec.classList.remove('ring-2', 'ring-indigo-500');
              }, 2000);
            }
            searchInput.value = '';
            searchResultsContainer.classList.add('hidden');
          });
        });
      } else {
        searchResultsContainer.classList.remove('hidden');
        searchResultsContainer.innerHTML = `<div class="p-3 text-xs text-zinc-500 text-center">Không tìm thấy kết quả phù hợp</div>`;
      }
    });

    // Close search dropdown on click outside
    document.addEventListener('click', (e) => {
      const searchResultsContainer = document.getElementById('search-results');
      if (searchResultsContainer && !searchInput.contains(e.target) && !searchResultsContainer.contains(e.target)) {
        searchResultsContainer.classList.add('hidden');
      }
    });
  }

  // Before/After Interactive State for Problem Statement
  const beforeStateBtn = document.getElementById('btn-before-state');
  const afterStateBtn = document.getElementById('btn-after-state');
  const comparisonView = document.getElementById('comparison-view');

  if (beforeStateBtn && afterStateBtn && comparisonView) {
    beforeStateBtn.addEventListener('click', () => {
      beforeStateBtn.classList.add('bg-rose-500/10', 'text-rose-400', 'border-rose-500/30');
      beforeStateBtn.classList.remove('bg-zinc-800', 'text-zinc-400', 'border-transparent');
      afterStateBtn.classList.remove('bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/30');
      afterStateBtn.classList.add('bg-zinc-800', 'text-zinc-400', 'border-transparent');

      comparisonView.innerHTML = `
        <div class="p-6 border border-rose-500/20 bg-rose-500/5 rounded-xl animate-pulse">
          <div class="flex items-center gap-2 mb-3">
            <span class="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-bold">CURRENT STATE</span>
            <h4 class="text-sm font-semibold text-rose-300">Vận hành thủ công & phân mảnh</h4>
          </div>
          <ul class="space-y-2 text-xs text-zinc-400">
            <li class="flex items-start gap-2"><span class="text-rose-500 mt-0.5">•</span> Cảnh báo xuất hiện rời rạc trên nhiều dashboard giám sát khác nhau.</li>
            <li class="flex items-start gap-2"><span class="text-rose-500 mt-0.5">•</span> Người vận hành tự đối chiếu thủ công trước khi tạo sự cố (Incident) hoặc ticket.</li>
            <li class="flex items-start gap-2"><span class="text-rose-500 mt-0.5">•</span> Kỹ thuật viên hiện trường tiếp cận thiết bị mà không có sẵn thông số vận hành thời gian thực.</li>
            <li class="flex items-start gap-2"><span class="text-rose-500 mt-0.5">•</span> Mất trung bình 25 phút để xác minh và bắt đầu thực hiện kiểm tra bảo trì.</li>
          </ul>
        </div>
      `;
    });

    afterStateBtn.addEventListener('click', () => {
      afterStateBtn.classList.add('bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/30');
      afterStateBtn.classList.remove('bg-zinc-800', 'text-zinc-400', 'border-transparent');
      beforeStateBtn.classList.remove('bg-rose-500/10', 'text-rose-400', 'border-rose-500/30');
      beforeStateBtn.classList.add('bg-zinc-800', 'text-zinc-400', 'border-transparent');

      comparisonView.innerHTML = `
        <div class="p-6 border border-emerald-500/20 bg-emerald-500/5 rounded-xl">
          <div class="flex items-center gap-2 mb-3">
            <span class="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">FUTURE STATE</span>
            <h4 class="text-sm font-semibold text-emerald-300">Hỗ trợ kỹ thuật viên xem thông số thiết bị qua WebAR</h4>
          </div>
          <ul class="space-y-2 text-xs text-zinc-400">
            <li class="flex items-start gap-2"><span class="text-emerald-500 mt-0.5">•</span> Trạng thái tài sản, cảnh báo và sự cố đồng bộ tập trung trên một giao diện thống nhất.</li>
            <li class="flex items-start gap-2"><span class="text-emerald-500 mt-0.5">•</span> Chuyển đổi mượt mà từ xem Cảnh báo → Tạo Sự cố → Phân công Ticket bảo trì.</li>
            <li class="flex items-start gap-2"><span class="text-emerald-500 mt-0.5">•</span> Quét mã QR code trên thiết bị giúp kỹ thuật viên truy cập lập tức thông số vận hành và hướng dẫn bảo trì AR.</li>
            <li class="flex items-start gap-2"><span class="text-emerald-500 mt-0.5">•</span> Rút ngắn thời gian phản hồi sự cố với khả năng ghi nhận nhật ký kiểm toán (Audit trail).</li>
          </ul>
        </div>
      `;
    });
  }

  // Interactive RACI Matrix filter
  const raciFilters = document.querySelectorAll('.raci-filter-btn');
  const raciCells = document.querySelectorAll('[data-raci]');

  raciFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      raciFilters.forEach(b => b.classList.remove('bg-indigo-600', 'text-white'));
      raciFilters.forEach(b => b.classList.add('bg-zinc-800', 'text-zinc-400'));
      btn.classList.add('bg-indigo-600', 'text-white');
      btn.classList.remove('bg-zinc-800', 'text-zinc-400');

      const selectedRole = btn.getAttribute('data-role');

      raciCells.forEach(cell => {
        const cellRoles = cell.getAttribute('data-raci-roles').split(',');
        const cellValue = cell.getAttribute('data-raci-val');

        if (selectedRole === 'all') {
          cell.innerHTML = `<span class="inline-block px-2.5 py-1 rounded text-xs font-semibold raci-${cellValue.toLowerCase()}">${cellValue}</span>`;
          cell.style.opacity = '1';
        } else if (cellRoles.includes(selectedRole)) {
          cell.innerHTML = `<span class="inline-block px-2.5 py-1 rounded text-xs font-semibold raci-${cellValue.toLowerCase()}">${cellValue}</span>`;
          cell.style.opacity = '1';
        } else {
          cell.innerHTML = `<span class="text-zinc-600">-</span>`;
          cell.style.opacity = '0.3';
        }
      });
    });
  });

  // Interactive Risk Heat Map Click logic
  const heatmapCells = document.querySelectorAll('.heatmap-cell');
  const riskRows = document.querySelectorAll('[data-risk-level]');
  const activeRiskFilterText = document.getElementById('active-risk-filter');

  heatmapCells.forEach(cell => {
    cell.addEventListener('click', () => {
      const level = cell.getAttribute('data-level');
      
      // Toggle selection styling
      heatmapCells.forEach(c => c.classList.remove('ring-4', 'ring-white', 'scale-105', 'z-10'));
      cell.classList.add('ring-4', 'ring-white', 'scale-105', 'z-10');

      if (activeRiskFilterText) {
        activeRiskFilterText.innerHTML = `Đang lọc: Mức Risk <span class="uppercase font-bold text-indigo-400">${level}</span> <button id="clear-risk-filter" class="ml-2 text-zinc-400 hover:text-white underline text-[10px]">Xóa lọc</button>`;
        
        const clearBtn = document.getElementById('clear-risk-filter');
        if (clearBtn) {
          clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            heatmapCells.forEach(c => c.classList.remove('ring-4', 'ring-white', 'scale-105', 'z-10'));
            riskRows.forEach(row => row.classList.remove('hidden'));
            activeRiskFilterText.textContent = 'Mẹo: Click vào các ô trên Heat Map để lọc nhanh danh sách Risk bên dưới.';
          });
        }
      }

      // Filter rows
      riskRows.forEach(row => {
        const rowLevel = row.getAttribute('data-risk-level');
        if (rowLevel === level) {
          row.classList.remove('hidden');
        } else {
          row.classList.add('hidden');
        }
      });
    });
  });
});
