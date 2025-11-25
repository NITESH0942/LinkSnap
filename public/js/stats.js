// ============ DOM ELEMENTS ============
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorText = document.getElementById('error-text');
const statsContent = document.getElementById('stats-content');
const breadcrumbCode = document.getElementById('breadcrumb-code');
const linkCode = document.getElementById('link-code');
const linkUrl = document.getElementById('link-url');
const copyCodeBtn = document.getElementById('copy-code-btn');
const deleteBtn = document.getElementById('delete-btn');
const totalClicks = document.getElementById('total-clicks');
const lastClicked = document.getElementById('last-clicked');
const createdAt = document.getElementById('created-at');
const visitsLoading = document.getElementById('visits-loading');
const visitsEmpty = document.getElementById('visits-empty');
const visitsTableWrapper = document.getElementById('visits-table-wrapper');
const visitsTableBody = document.getElementById('visits-table-body');

let currentLink = null;

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
  const code = getCodeFromUrl();
  if (code) {
    loadLinkStats(code);
  } else {
    showError('Invalid link code');
  }
});

// ============ HELPER FUNCTIONS ============
function getCodeFromUrl() {
  const pathParts = window.location.pathname.split('/');
  // URL is /code/:code
  if (pathParts[1] === 'code' && pathParts[2]) {
    return pathParts[2];
  }
  return null;
}

async function loadLinkStats(code) {
  try {
    const response = await fetch(`/api/links/${code}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        showError('Link not found');
      } else {
        showError('Failed to load link stats');
      }
      return;
    }

    const link = await response.json();
    currentLink = link;
    renderStats(link);
    showContent();
  } catch (error) {
    console.error('Error loading link stats:', error);
    showError('Failed to load link stats');
  }
}

function renderStats(link) {
  // Update breadcrumb and header
  breadcrumbCode.textContent = link.code;
  linkCode.textContent = link.code;
  linkUrl.href = link.url;
  linkUrl.textContent = link.url;

  // Update stats
  totalClicks.textContent = link.clicks.toLocaleString();
  lastClicked.textContent = link.lastClickedAt ? formatDate(link.lastClickedAt) : 'Never';
  createdAt.textContent = formatDateTime(link.createdAt);

  // Setup copy button
  copyCodeBtn.addEventListener('click', () => copyShortUrl(link.code));

  // Setup delete button
  deleteBtn.addEventListener('click', () => handleDelete(link.code));

  // Render visits
  renderVisits(link.visits || []);
}

function renderVisits(visits) {
  visitsLoading.classList.add('hidden');

  if (visits.length === 0) {
    visitsEmpty.classList.remove('hidden');
    return;
  }

  visitsTableWrapper.classList.remove('hidden');
  visitsTableBody.innerHTML = visits.map(visit => `
    <tr>
      <td>${formatDateTime(visit.createdAt)}</td>
      <td class="hide-mobile">
        <span class="truncate-text" title="${escapeHtml(visit.referer || 'Direct')}">
          ${visit.referer ? escapeHtml(truncateUrl(visit.referer, 40)) : 'Direct'}
        </span>
      </td>
      <td class="hide-tablet">
        <span class="truncate-text" title="${escapeHtml(visit.userAgent || 'Unknown')}">
          ${visit.userAgent ? parseUserAgent(visit.userAgent) : 'Unknown'}
        </span>
      </td>
    </tr>
  `).join('');
}

function showContent() {
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  statsContent.classList.remove('hidden');
}

function showError(message) {
  loadingState.classList.add('hidden');
  statsContent.classList.add('hidden');
  errorState.classList.remove('hidden');
  errorText.textContent = message;
}

async function copyShortUrl(code) {
  const url = `${window.location.origin}/${code}`;
  
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
  const originalHTML = copyCodeBtn.innerHTML;
  copyCodeBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  `;
  copyCodeBtn.style.color = 'var(--success)';
  
  setTimeout(() => {
    copyCodeBtn.innerHTML = originalHTML;
    copyCodeBtn.style.color = '';
  }, 1500);
}

let deleteConfirmed = false;
let deleteTimeout = null;

async function handleDelete(code) {
  if (!deleteConfirmed) {
    deleteConfirmed = true;
    deleteBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span>Click to confirm</span>
    `;
    
    deleteTimeout = setTimeout(() => {
      deleteConfirmed = false;
      deleteBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        <span>Delete</span>
      `;
    }, 3000);
    return;
  }

  if (deleteTimeout) clearTimeout(deleteTimeout);
  deleteBtn.disabled = true;
  deleteBtn.innerHTML = `
    <svg class="spinner-inline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10"/>
    </svg>
    <span>Deleting...</span>
  `;

  try {
    const response = await fetch(`/api/links/${code}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete');
    
    // Redirect to dashboard
    window.location.href = '/';
  } catch (error) {
    console.error('Error deleting link:', error);
    alert('Failed to delete link');
    deleteBtn.disabled = false;
    deleteBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
      <span>Delete</span>
    `;
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

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
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

function parseUserAgent(ua) {
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera')) return 'Opera';
  return 'Browser';
}

