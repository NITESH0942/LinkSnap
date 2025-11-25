// ============ DOM ELEMENTS ============
const form = document.getElementById('shorten-form');
const urlInput = document.getElementById('url-input');
const customSlugInput = document.getElementById('custom-slug');
const toggleCustomBtn = document.getElementById('toggle-custom');
const customSlugWrapper = document.getElementById('custom-slug-wrapper');
const slugPrefix = document.getElementById('slug-prefix');
const formError = document.getElementById('form-error');
const errorText = document.getElementById('error-text');
const submitBtn = document.getElementById('submit-btn');
const result = document.getElementById('result');
const resultUrl = document.getElementById('result-url');
const copyBtn = document.getElementById('copy-btn');
const errorBanner = document.getElementById('error-banner');
const errorBannerText = document.getElementById('error-banner-text');

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
  // Set slug prefix
  slugPrefix.textContent = window.location.origin + '/';

  // Check for error in URL
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  if (error === 'not-found') {
    showBannerError('The link you tried to access does not exist.');
    // Clean URL
    window.history.replaceState({}, '', '/');
  } else if (error === 'server-error') {
    showBannerError('Something went wrong. Please try again.');
    window.history.replaceState({}, '', '/');
  }
});

// ============ EVENT LISTENERS ============

// Toggle custom slug
toggleCustomBtn.addEventListener('click', () => {
  toggleCustomBtn.classList.toggle('active');
  customSlugWrapper.classList.toggle('hidden');
  if (!customSlugWrapper.classList.contains('hidden')) {
    customSlugInput.focus();
  }
});

// Format custom slug as user types
customSlugInput.addEventListener('input', (e) => {
  e.target.value = e.target.value
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
});

// Clear error on input
urlInput.addEventListener('input', () => {
  hideError();
});

customSlugInput.addEventListener('input', () => {
  hideError();
});

// Form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const url = urlInput.value.trim();
  const customSlug = customSlugInput.value.trim();

  // Validation
  if (!url) {
    showError('Please enter a URL');
    urlInput.focus();
    return;
  }

  if (!isValidUrl(url)) {
    showError('Please enter a valid URL (including http:// or https://)');
    urlInput.focus();
    return;
  }

  if (customSlug && !/^[a-zA-Z0-9-_]+$/.test(customSlug)) {
    showError('Custom slug can only contain letters, numbers, hyphens, and underscores');
    customSlugInput.focus();
    return;
  }

  // Submit
  setLoading(true);
  hideError();
  hideResult();

  try {
    const response = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url, 
        customSlug: customSlug || undefined 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to shorten URL');
    }

    // Success
    const shortUrl = `${window.location.origin}/${data.slug}`;
    showResult(shortUrl);
    
    // Reset form
    urlInput.value = '';
    customSlugInput.value = '';
    toggleCustomBtn.classList.remove('active');
    customSlugWrapper.classList.add('hidden');

  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
});

// Copy button
copyBtn.addEventListener('click', async () => {
  const url = resultUrl.textContent;
  
  try {
    await navigator.clipboard.writeText(url);
    showCopySuccess();
  } catch {
    // Fallback
    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showCopySuccess();
  }
});

// ============ HELPER FUNCTIONS ============

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function showError(message) {
  errorText.textContent = message;
  formError.classList.remove('hidden');
}

function hideError() {
  formError.classList.add('hidden');
}

function showBannerError(message) {
  errorBannerText.textContent = message;
  errorBanner.classList.remove('hidden');
  setTimeout(() => {
    errorBanner.classList.add('hidden');
  }, 5000);
}

function showResult(url) {
  resultUrl.textContent = url;
  result.classList.remove('hidden');
}

function hideResult() {
  result.classList.add('hidden');
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  urlInput.disabled = loading;
  customSlugInput.disabled = loading;
  
  if (loading) {
    submitBtn.innerHTML = `
      <svg class="spinner-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" opacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
      </svg>
      <span>Shortening...</span>
    `;
    submitBtn.querySelector('.spinner-icon').style.animation = 'spin 0.8s linear infinite';
  } else {
    submitBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
      <span>Shorten URL</span>
    `;
  }
}

function showCopySuccess() {
  const originalHTML = copyBtn.innerHTML;
  copyBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    <span>Copied!</span>
  `;
  copyBtn.classList.add('copied');
  
  setTimeout(() => {
    copyBtn.innerHTML = originalHTML;
    copyBtn.classList.remove('copied');
  }, 2000);
}

