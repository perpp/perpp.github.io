// ──────────────────────────────────────────
// SEARCH ENGINE MANAGEMENT
// ──────────────────────────────────────────
let currentEngine = 'https://www.google.com/search';
// Load saved engine on startup
window.addEventListener('DOMContentLoaded', () => {
    const savedEngine = localStorage.getItem('searchEngine');
    if (savedEngine) {
        currentEngine = savedEngine;
        const matchingTab = document.querySelector(`.searchTab[data-engine="${savedEngine}"]`);
        if (matchingTab) {
            document.querySelectorAll('.searchTab').forEach(tab => tab.classList.remove('activeTab'));
            matchingTab.classList.add('activeTab');
        }
    } else {
        const firstTab = document.querySelector('.searchTab');
        if (firstTab) firstTab.classList.add('activeTab');
    }
});

// Engine switching
window.setEngine = function (url, element) {
    currentEngine = url;
    localStorage.setItem('searchEngine', url);
    document.querySelectorAll('.searchTab').forEach(tab => tab.classList.remove('activeTab'));
    element.classList.add('activeTab');
};

// Special icon search (does NOT affect the form)
function searchSpecial(target) {
    const query = document.getElementById('searchInput').value.trim();

    if (target === 'arxiv') {
        if (!query) {
            window.location.href = 'https://arxiv.org/';
        } else {
            window.location.href = `https://arxiv.org/search/?query=${encodeURIComponent(query)}`;
        }
    }
    else if (target === 'chatgpt') {
        if (!query) {
            window.location.href = 'https://arxiv.org/';
        } else {
            window.location.href = `https://arxiv.org/search/?query=${encodeURIComponent(query)}`;
        }
    } else if (target === 'GoogleScholar') {
        if (!query) {
            window.location.href = 'https://scholar.google.com/';
        } else {
            window.location.href = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
        }
    }
}
// Form submission (Enter key or hidden submit button) → always normal web search
document.getElementById('searchForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;
    window.location.href = `${currentEngine}?q=${encodeURIComponent(query)}`;
});

// ──────────────────────────────────────────
// 2. TABBED INTERFACE SCRIPT (ttab + ctab)
// ──────────────────────────────────────────
(function () {
    // --- Reusable helper: turn an array of {url, name} into HTML links ---
    function renderLinks(links) {
        if (!Array.isArray(links)) return '';
        return links.map(link =>
            `<a class="hyperlinks" href="${link.url}" target="_blank" rel="noopener">${link.name}</a>`
        ).join('');
    }

    // --- Load all JSON data first, then initialize ---
    Promise.all([
        fetch('json/quickaccess.json').then(r => r.json()),
        fetch('json/creation.json').then(r => r.json()),
        fetch('json/entertainment.json').then(r => r.json()),
        fetch('json/utilities.json').then(r => r.json()),
        fetch('json/log.json').then(r => r.json())
    ]).then(([quickAccess, creation, entertainment, utilities, log]) => {
        // Build the data array in the same order as your tabs
        const data = [
            quickAccess,      // ttab 0
            creation,         // ttab 1
            entertainment,    // ttab 2
            utilities,        // ttab 3
            log               // ttab 4
        ];

        // Populate the static Quick Access box (mobile) using the helper
        const quickAccessData = data[0];  // array of ctabs (usually one item)
        const qaLinksContainer = document.getElementById('quickAccessLinks');
        if (qaLinksContainer && quickAccessData.length) {
            const links = quickAccessData[0].links || [];
            qaLinksContainer.innerHTML = renderLinks(links);
        }

        // ── Tab logic ──
        let activeTtab = 0;
        let activeCtab = 0;

        const ttabBar = document.getElementById('ttabBar');
        const ctabPanel = document.getElementById('ctabPanel');
        const displayArea = document.getElementById('displayArea');
        const ttabButtons = ttabBar.querySelectorAll('.ttab');

        function renderCtabs(ttabIndex) {
            const ctabsData = data[ttabIndex];
            ctabPanel.innerHTML = '';
            ctabsData.forEach((ctab, idx) => {
                const btn = document.createElement('button');
                btn.className = 'ctab';
                if (idx === activeCtab) btn.classList.add('active');

                if (ctab.icon) {
                    btn.innerHTML = `<img src="${ctab.icon}" class="ctab-icon" alt=""> ${ctab.label}`;
                } else {
                    btn.textContent = ctab.label;
                }

                btn.setAttribute('data-ctab', idx);
                btn.addEventListener('mouseenter', () => setActiveCtab(idx, ttabIndex));
                btn.addEventListener('click', () => setActiveCtab(idx, ttabIndex));
                btn.addEventListener('focus', () => setActiveCtab(idx, ttabIndex));
                ctabPanel.appendChild(btn);
            });
        }

        function setActiveCtab(ctabIndex, ttabIndex) {
            activeCtab = ctabIndex;
            const ctabButtons = ctabPanel.querySelectorAll('.ctab');
            ctabButtons.forEach((btn, idx) => {
                btn.classList.toggle('active', idx === ctabIndex);
            });
            updateDisplay(ttabIndex, ctabIndex);
        }

        function updateDisplay(ttabIndex, ctabIndex) {
            const content = data[ttabIndex][ctabIndex];

            if (content.type === 'links') {
                // Use the shared helper to generate link HTML
                const linksHtml = renderLinks(content.links);
                displayArea.innerHTML = `<div class="display-content">${linksHtml}</div>`;
            } else if (content.type === 'section') {
                fetch(content.section)
                    .then(res => res.text())
                    .then(html => {
                        displayArea.innerHTML = html;
                        // If this section uses the links container, fill it
                        const linksContainer = displayArea.querySelector('#quickAccessLinks');
                        if (linksContainer && content.links) {
                            linksContainer.innerHTML = renderLinks(content.links);
                        }
                    })
                    .catch(err => displayArea.innerHTML = '<p>Error loading section.</p>');
            } else {
                displayArea.innerHTML = `
                    <div class="display-content">
                        <h2>${content.title}</h2>
                        <span class="badge">${content.badge}</span>
                        <p>${content.description}</p>
                        <div class="info-card">${content.info}</div>
                    </div>`;
            }
        }

        function switchTtab(ttabIndex) {
            activeTtab = ttabIndex;
            activeCtab = 0;
            ttabButtons.forEach((btn, idx) => {
                btn.classList.toggle('active', idx === ttabIndex);
            });
            renderCtabs(ttabIndex);
            updateDisplay(ttabIndex, 0);
        }

        ttabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-ttab'), 10);
                if (idx !== activeTtab) switchTtab(idx);
            });
            btn.addEventListener('mouseenter', () => {
                const idx = parseInt(btn.getAttribute('data-ttab'), 10);
                if (idx !== activeTtab) switchTtab(idx);
            });
        });

        // Initialize: default ttab 0 active
        renderCtabs(0);
        updateDisplay(0, 0);

    }).catch(error => {
        console.error('Failed to load tab data:', error);
    });
})();

// Toggle overlay on small screens
(function () {
    const hamburger = document.getElementById('tabHamburger');
    const overlay = document.getElementById('tabOverlay');
    const closeBtn = document.getElementById('tabOverlayClose');

    if (hamburger && overlay && closeBtn) {
        function openOverlay() {
            overlay.classList.add('open');
        }
        function closeOverlay() {
            overlay.classList.remove('open');
        }

        hamburger.addEventListener('click', openOverlay);
        hamburger.addEventListener('mouseenter', openOverlay);
        closeBtn.addEventListener('click', closeOverlay);
    }
})();