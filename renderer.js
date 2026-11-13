let tabs = [];
let activeTabId = null;
let tabCounter = 0;

const tabsContainer = document.getElementById('tabs-container');
const webviewContainer = document.getElementById('webview-container');
const newTabBtn = document.getElementById('new-tab-btn');
const btnBack = document.getElementById('btn-back');
const btnForward = document.getElementById('btn-forward');
const btnReload = document.getElementById('btn-reload');
const btnHome = document.getElementById('btn-home');
const btnDevtools = document.getElementById('btn-devtools');
const btnMenu = document.getElementById('btn-menu');
const menuDropdown = document.getElementById('menu-dropdown');
const omniboxInput = document.getElementById('omnibox-input');
const bookmarksBar = document.getElementById('bookmarks-bar');

function normalizeUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return 'https://www.google.com';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://')) {
    return trimmed;
  }

  // Check if it's a domain name (e.g. youtube.com, github.com/user, localhost:3000)
  const isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(trimmed) || trimmed.startsWith('localhost');
  if (isDomain) {
    return 'https://' + trimmed;
  }

  // Otherwise, Google search query
  return 'https://www.google.com/search?q=' + encodeURIComponent(trimmed);
}

function updateNavButtons(webview) {
  if (!webview) return;
  try {
    btnBack.disabled = !webview.canGoBack();
    btnForward.disabled = !webview.canGoForward();
  } catch (e) {
    // Webview might not be ready
  }
}

function createTab(initialUrl = 'https://www.google.com') {
  const id = 'tab-' + (++tabCounter);

  // 1. Create Tab DOM
  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.id = id;
  tabEl.innerHTML = `
    <div class="tab-icon">
      <img src="https://www.google.com/favicon.ico" class="favicon" onerror="this.style.display='none'">
      <div class="tab-spinner" style="display: none;"></div>
    </div>
    <span class="tab-title">New Tab</span>
    <span class="tab-close-btn" title="Close tab">&times;</span>
  `;

  // 2. Create Webview DOM
  const webview = document.createElement('webview');
  webview.id = 'webview-' + id;
  webview.src = initialUrl;
  webview.setAttribute('allowpopups', 'true');

  const tabData = {
    id,
    tabEl,
    webview,
    isLoading: false,
    url: initialUrl,
    title: 'New Tab',
    zoomFactor: 1.0
  };
  tabs.push(tabData);

  // Event handlers for Webview
  const faviconImg = tabEl.querySelector('.favicon');
  const spinner = tabEl.querySelector('.tab-spinner');
  const titleSpan = tabEl.querySelector('.tab-title');
  const closeBtn = tabEl.querySelector('.tab-close-btn');

  webview.addEventListener('did-start-loading', () => {
    tabData.isLoading = true;
    spinner.style.display = 'block';
    faviconImg.style.display = 'none';
    if (activeTabId === id) {
      document.getElementById('reload-icon').innerHTML = `
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      `;
      btnReload.title = 'Stop loading this page';
    }
  });

  webview.addEventListener('did-stop-loading', () => {
    tabData.isLoading = false;
    spinner.style.display = 'none';
    faviconImg.style.display = 'block';
    if (activeTabId === id) {
      document.getElementById('reload-icon').innerHTML = `
        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
      `;
      btnReload.title = 'Reload this page';
      updateNavButtons(webview);
    }
  });

  webview.addEventListener('page-title-updated', (e) => {
    tabData.title = e.title;
    titleSpan.textContent = e.title;
    if (activeTabId === id) {
      document.title = `${e.title} - Google Chrome`;
    }
  });

  webview.addEventListener('page-favicon-updated', (e) => {
    if (e.favicons && e.favicons.length > 0) {
      faviconImg.src = e.favicons[0];
      faviconImg.style.display = 'block';
    }
  });

  webview.addEventListener('did-navigate', (e) => {
    tabData.url = e.url;
    if (activeTabId === id) {
      omniboxInput.value = e.url;
      updateNavButtons(webview);
    }
  });

  webview.addEventListener('did-navigate-in-page', (e) => {
    tabData.url = e.url;
    if (activeTabId === id) {
      omniboxInput.value = e.url;
      updateNavButtons(webview);
    }
  });

  webview.addEventListener('new-window', (e) => {
    createTab(e.url);
  });

  // Tab click actions
  tabEl.addEventListener('click', (e) => {
    if (e.target === closeBtn) {
      e.stopPropagation();
      closeTab(id);
    } else {
      switchTab(id);
    }
  });

  // Middle click to close tab
  tabEl.addEventListener('auxclick', (e) => {
    if (e.button === 1) {
      e.preventDefault();
      closeTab(id);
    }
  });

  tabsContainer.appendChild(tabEl);
  webviewContainer.appendChild(webview);

  switchTab(id);
}

function switchTab(id) {
  activeTabId = id;
  const currentTab = tabs.find(t => t.id === id);
  if (!currentTab) return;

  tabs.forEach(t => {
    if (t.id === id) {
      t.tabEl.classList.add('active');
      t.webview.classList.add('active');
    } else {
      t.tabEl.classList.remove('active');
      t.webview.classList.remove('active');
    }
  });

  omniboxInput.value = currentTab.url || '';
  document.title = `${currentTab.title || 'New Tab'} - Google Chrome`;
  updateNavButtons(currentTab.webview);

  // Ensure active tab is visible in tabs container scroll
  currentTab.tabEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest' });
}

function closeTab(id) {
  const index = tabs.findIndex(t => t.id === id);
  if (index === -1) return;

  const [removed] = tabs.splice(index, 1);
  removed.tabEl.remove();
  removed.webview.remove();

  if (tabs.length === 0) {
    createTab();
  } else if (activeTabId === id) {
    const nextIndex = Math.min(index, tabs.length - 1);
    switchTab(tabs[nextIndex].id);
  }
}

function getActiveTab() {
  return tabs.find(t => t.id === activeTabId);
}

// Omnibox Navigation
omniboxInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const active = getActiveTab();
    if (!active) return;
    const url = normalizeUrl(omniboxInput.value);
    active.webview.src = url;
    omniboxInput.blur();
  }
});

omniboxInput.addEventListener('focus', () => {
  omniboxInput.select();
});

// Toolbar Button Actions
btnBack.addEventListener('click', () => {
  const active = getActiveTab();
  if (active && active.webview.canGoBack()) {
    active.webview.goBack();
  }
});

btnForward.addEventListener('click', () => {
  const active = getActiveTab();
  if (active && active.webview.canGoForward()) {
    active.webview.goForward();
  }
});

btnReload.addEventListener('click', () => {
  const active = getActiveTab();
  if (!active) return;
  if (active.isLoading) {
    active.webview.stop();
  } else {
    active.webview.reload();
  }
});

btnHome.addEventListener('click', () => {
  const active = getActiveTab();
  if (active) {
    active.webview.src = 'https://www.google.com';
  }
});

btnDevtools.addEventListener('click', () => {
  const active = getActiveTab();
  if (active) {
    if (active.webview.isDevToolsOpened()) {
      active.webview.closeDevTools();
    } else {
      active.webview.openDevTools();
    }
  }
});

newTabBtn.addEventListener('click', () => {
  createTab();
});

// Bookmarks Bar Click Handlers
bookmarksBar.addEventListener('click', (e) => {
  const item = e.target.closest('.bookmark-item');
  if (item && item.dataset.url) {
    const active = getActiveTab();
    if (active) {
      active.webview.src = item.dataset.url;
    }
  }
});

// 3-Dots Menu Toggle
btnMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  menuDropdown.classList.toggle('show');
});

document.addEventListener('click', () => {
  menuDropdown.classList.remove('show');
});

// Menu Actions
document.getElementById('menu-new-tab').addEventListener('click', () => {
  createTab();
});

document.getElementById('menu-reload').addEventListener('click', () => {
  const active = getActiveTab();
  if (active) active.webview.reload();
});

document.getElementById('menu-zoom-in').addEventListener('click', () => {
  const active = getActiveTab();
  if (active) {
    active.zoomFactor = Math.min(3.0, (active.zoomFactor || 1.0) + 0.1);
    active.webview.setZoomFactor(active.zoomFactor);
  }
});

document.getElementById('menu-zoom-out').addEventListener('click', () => {
  const active = getActiveTab();
  if (active) {
    active.zoomFactor = Math.max(0.3, (active.zoomFactor || 1.0) - 0.1);
    active.webview.setZoomFactor(active.zoomFactor);
  }
});

document.getElementById('menu-zoom-reset').addEventListener('click', () => {
  const active = getActiveTab();
  if (active) {
    active.zoomFactor = 1.0;
    active.webview.setZoomFactor(1.0);
  }
});

document.getElementById('menu-devtools').addEventListener('click', () => {
  const active = getActiveTab();
  if (active) {
    active.webview.openDevTools();
  }
});

document.getElementById('menu-about').addEventListener('click', () => {
  alert('Google Chrome Clone\nVersion 1.0.0 (Chromium Engine)\nBuilt for testing & UI recreation.');
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 't') {
    e.preventDefault();
    createTab();
  } else if (e.ctrlKey && e.key.toLowerCase() === 'w') {
    e.preventDefault();
    if (activeTabId) closeTab(activeTabId);
  } else if (e.ctrlKey && e.key.toLowerCase() === 'r') {
    e.preventDefault();
    const active = getActiveTab();
    if (active) active.webview.reload();
  } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    omniboxInput.focus();
    omniboxInput.select();
  } else if (e.key === 'F12') {
    e.preventDefault();
    const active = getActiveTab();
    if (active) {
      if (active.webview.isDevToolsOpened()) {
        active.webview.closeDevTools();
      } else {
        active.webview.openDevTools();
      }
    }
  }
});

// Initialize first tab
createTab('https://www.google.com');

