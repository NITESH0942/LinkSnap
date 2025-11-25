// ============ STATE ============
let links = [];
let sortField = 'createdAt';
let sortDirection = 'desc';
let filter = '';

// ============ DOM ELEMENTS ============
const statsGrid = document.getElementById('stats-grid');
const linksContainer = document.getElementById('links-container');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const errorState = document.getElementById('error-state');
const errorStateText = document.getElementById('error-state-text');
const tableWrapper = document.getElementById('table-wrapper');
const linksTableBody = document.getElementById('links-table-body');
const noResults = document.getElementById('no-results');
const searchInput = document.getElementById('search-input');
const newLinkBtn = document.getElementById('new-link-btn');
const addForm = document.getElementById('add-form');
const createForm = document.getElementById('create-form');
const urlInput = document.getElementById('url-input');
const codeInput = document.getElementById('code-input');
const formError = document.getElementById('form-error');
const errorText = document.getElementById('error-text');
const formSuccess = document.getElementById('form-success');
const successLink = document.getElementById('success-link');
const submitBtn = document.getElementById('submit-btn');
const retryBtn = document.getElementById('retry-btn');

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadLinks();
  setupEventListeners();
});

// ============ EVENT LISTENERS ============
function setupEventListeners() {
  // Toggle add form
  newLinkBtn.addEventListener('click', () => {
    addForm.classList.toggle('hidden');
    if (!addForm.classList.contains('hidden')) {
      urlInput.focus();
      newLinkBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span>Cancel</span>
      `;
    } else {
      resetForm();
      newLinkBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>Add Link</span>
      `;
    }
  });

  // Create form submit
  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await createLink();
  });

  // Search/filter
  searchInput.addEventListener('input', (e) => {
    filter = e.target.value.toLowerCase();
    renderTable();
  });

  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.sort;
      if (sortField === field) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortDirection = 'desc';
      }
      updateSortButtons();
      renderTable();
    });
  });

  // Retry button
  retryBtn.addEventListener('click', loadLinks);

  // Format custom code as user types (alphanumeric only)
  codeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '');
  });

  // Clear errors on input
  urlInput.addEventListener('input', hideFormMessages);
  codeInput.addEventListener('input', hideFormMessages);
}

// ============ API CALLS ============
async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    if (!response.ok) throw new Error('Failed to fetch stats');
    const data = await response.json();
    renderStats(data);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadLinks() {
  showLoading();
  
  try {
    const response = await fetch('/api/links');
    if (!response.ok) throw new Error('Failed to fetch links');
    links = await response.json();
    
    if (links.length === 0) {
      showEmpty();
    } else {
      renderTable();
      showTable();
    }
  } catch (error) {
    console.error('Error loading links:', error);
    showError(error.message);
  }
}

async function createLink() {
  const url = urlInput.value.trim();
  const code = codeInput.value.trim();

  // Validation
  if (!url) {
    showFormError('Please enter a URL');
    return;
  }

  if (!isValidUrl(url)) {
    showFormError('Please enter a valid URL (including http:// or https://)');
    return;
  }

  if (code && !/^[A-Za-z0-9]{6,8}$/.test(code)) {
    showFormError('Code must be 6-8 alphanumeric characters');
    return;
  }

  hideFormMessages();
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg class="spinner-inline" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10"/>
    </svg>
    <span>Creating...</span>
  `;

  try {
    const response = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, code: code || undefined }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create link');
    }

    // Success
    const shortUrl = `${window.location.origin}/${data.code}`;
    showFormSuccess(shortUrl);
    urlInput.value = '';
    codeInput.value = '';
    
    loadStats();
    loadLinks();

  } catch (error) {
    showFormError(error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
      <span>Create</span>
    `;
  }
}

async function deleteLink(code) {
  try {
    const response = await fetch(`/api/links/${code}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete link');
    
    links = links.filter(link => link.code !== code);
    loadStats();
    
    if (links.length === 0) {
      showEmpty();
    } else {
      renderTable();
    }
  } catch (error) {
    console.error('Error deleting link:', error);
    alert('Failed to delete link');
  }
}

// ============ RENDER FUNCTIONS ============
function renderStats(data) {
  statsGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-header">
        <div class="stat-icon brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <span class="stat-label">Total Links</span>
      </div>
      <div class="stat-value">${data.totalLinks.toLocaleString()}</div>
    </div>
    <div class="stat-card">
      <div class="stat-header">
        <div class="stat-icon blue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M15 15l-2 5L9 9l11 4-5 2z"/>
            <path d="M15 15l5 5"/>
          </svg>
        </div>
        <span class="stat-label">Total Clicks</span>
      </div>
      <div class="stat-value">${data.totalClicks.toLocaleString()}</div>
    </div>
    <div class="stat-card">
      <div class="stat-header">
        <div class="stat-icon emerald">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M13 17h8"/>
            <path d="M13 17V3"/>
            <path d="M3 11h8"/>
            <path d="M11 11V3"/>
            <path d="M3 21h18"/>
          </svg>
        </div>
        <span class="stat-label">Clicks Today</span>
      </div>
      <div class="stat-value">${data.clicksToday.toLocaleString()}</div>
    </div>
    <div class="stat-card">
      <div class="stat-header">
        <div class="stat-icon amber">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
        <span class="stat-label">Top Link</span>
      </div>
      <div class="stat-value">${data.topLink ? data.topLink.code : '—'}</div>
      ${data.topLink ? `<div class="stat-sub">${data.topLink.clicks} clicks</div>` : ''}
    </div>
  `;
}

function renderTable() {
  // Filter links
  let filteredLinks = links;
  if (filter) {
    filteredLinks = links.filter(link => 
      link.code.toLowerCase().includes(filter) ||
      link.url.toLowerCase().includes(filter)
    );
  }

  // Sort links
  filteredLinks.sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'createdAt':
        comparison = new Date(a.createdAt) - new Date(b.createdAt);
        break;
      case 'clicks':
        comparison = a.clicks - b.clicks;
        break;
      case 'code':
        comparison = a.code.localeCompare(b.code);
        break;
      case 'lastClickedAt':
        const aTime = a.lastClickedAt ? new Date(a.lastClickedAt) : new Date(0);
        const bTime = b.lastClickedAt ? new Date(b.lastClickedAt) : new Date(0);
        comparison = aTime - bTime;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Show no results if filtered list is empty
  if (filteredLinks.length === 0 && filter) {
    noResults.classList.remove('hidden');
    tableWrapper.classList.add('hidden');
    return;
  } else {
    noResults.classList.add('hidden');
    tableWrapper.classList.remove('hidden');
  }

  // Render rows
  const baseUrl = window.location.origin;
  
  linksTableBody.innerHTML = filteredLinks.map(link => `
    <tr>
      <td>
        <a href="/code/${link.code}" class="link-code">
          ${link.code}
        </a>
      </td>
      <td class="hide-mobile">
        <a href="${link.url}" target="_blank" rel="noopener" class="link-url" title="${escapeHtml(link.url)}">
          ${escapeHtml(truncateUrl(link.url, 50))}
        </a>
      </td>
      <td>
        <span class="link-clicks">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          ${link.clicks.toLocaleString()}
        </span>
      </td>
      <td class="hide-tablet">
        <span class="link-date">${link.lastClickedAt ? formatDate(link.lastClickedAt) : 'Never'}</span>
      </td>
      <td>
        <div class="action-btns">
          <button class="action-btn copy-btn" data-url="${baseUrl}/${link.code}" title="Copy short URL">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button class="action-btn delete delete-btn" data-code="${link.code}" title="Delete link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  // Add event listeners to action buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => copyToClipboard(btn));
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(btn));
  });
}

function updateSortButtons() {
  document.querySelectorAll('.sort-btn').forEach(btn => {
    const isActive = btn.dataset.sort === sortField;
    btn.classList.toggle('active', isActive);
    btn.classList.toggle('desc', isActive && sortDirection === 'desc');
  });
}

// ============ UI STATE FUNCTIONS ============
function showLoading() {
  loadingState.classList.remove('hidden');
  emptyState.classList.add('hidden');
  errorState.classList.add('hidden');
  tableWrapper.classList.add('hidden');
  noResults.classList.add('hidden');
}

function showEmpty() {
  loadingState.classList.add('hidden');
  emptyState.classList.remove('hidden');
  errorState.classList.add('hidden');
  tableWrapper.classList.add('hidden');
  noResults.classList.add('hidden');
}

function showError(message) {
  loadingState.classList.add('hidden');
  emptyState.classList.add('hidden');
  errorState.classList.remove('hidden');
  errorStateText.textContent = message;
  tableWrapper.classList.add('hidden');
  noResults.classList.add('hidden');
}

function showTable() {
  loadingState.classList.add('hidden');
  emptyState.classList.add('hidden');
  errorState.classList.add('hidden');
  tableWrapper.classList.remove('hidden');
}

function showFormError(message) {
  errorText.textContent = message;
  formError.classList.remove('hidden');
  formSuccess.classList.add('hidden');
}

function showFormSuccess(url) {
  successLink.href = url;
  successLink.textContent = url;
  formSuccess.classList.remove('hidden');
  formError.classList.add('hidden');
}

function hideFormMessages() {
  formError.classList.add('hidden');
  formSuccess.classList.add('hidden');
}

function resetForm() {
  urlInput.value = '';
  codeInput.value = '';
  hideFormMessages();
}

// ============ HELPER FUNCTIONS ============
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function truncateUrl(url, maxLength) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + '...';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function copyToClipboard(btn) {
  const url = btn.dataset.url;
  
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }

  // Show success feedback
  const originalHTML = btn.innerHTML;
  btn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  `;
  btn.style.color = 'var(--success)';
  
  setTimeout(() => {
    btn.innerHTML = originalHTML;
    btn.style.color = '';
  }, 1500);
}

let deleteConfirmCode = null;
let deleteConfirmTimeout = null;

function handleDelete(btn) {
  const code = btn.dataset.code;
  
  if (deleteConfirmCode !== code) {
    // First click - show confirmation
    if (deleteConfirmTimeout) clearTimeout(deleteConfirmTimeout);
    
    // Reset previous confirm state
    document.querySelectorAll('.delete-btn.confirm').forEach(b => {
      b.classList.remove('confirm');
      b.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      `;
    });
    
    deleteConfirmCode = code;
    btn.classList.add('confirm');
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    `;
    
    // Reset after 3 seconds
    deleteConfirmTimeout = setTimeout(() => {
      deleteConfirmCode = null;
      btn.classList.remove('confirm');
      btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      `;
    }, 3000);
  } else {
    // Second click - delete
    if (deleteConfirmTimeout) clearTimeout(deleteConfirmTimeout);
    deleteConfirmCode = null;
    
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="spinner-inline" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" opacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10"/>
      </svg>
    `;
    
    deleteLink(code);
  }
}
