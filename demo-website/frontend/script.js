document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const mobileInput = document.getElementById('mobileNumber');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalPendingView = document.getElementById('modalPendingView');
  const modalSuccessView = document.getElementById('modalSuccessView');
  const modalRejectedView = document.getElementById('modalRejectedView');
  const modalExpiredView = document.getElementById('modalExpiredView');
  const modalCancelledView = document.getElementById('modalCancelledView');

  const codeDisplay = document.getElementById('codeDisplay');
  const timerDisplay = document.getElementById('timerDisplay');
  const progressCircle = document.getElementById('progressCircle');
  const cancelBtn = document.getElementById('cancelBtn');

  const retryBtnRejected = document.getElementById('retryBtnRejected');
  const retryBtnExpired = document.getElementById('retryBtnExpired');
  const retryBtnCancelled = document.getElementById('retryBtnCancelled');

  // Determine Express backend URL dynamically
  // Ensures Live Server (port 5500/5501) never intercepts API requests
  const isServedByExpress = window.location.origin.includes(':3000');
  const BACKEND_URL = isServedByExpress ? '' : 'http://localhost:3000';

  let activeAuthId = null;
  let pollInterval = null;
  let timerInterval = null;
  let remainingSeconds = 120;
  const totalDuration = 120;

  // Circle Progress calculations (Radius r = 30)
  const circleRadius = 30;
  const circleCircumference = 2 * Math.PI * circleRadius;
  if (progressCircle) {
    progressCircle.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
    progressCircle.style.strokeDashoffset = '0';
  }

  // Reusable Toast Notification System (Zero alert() usage)
  window.showToast = function(message, type = 'error') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconSvg = type === 'error'
      ? `<svg class="toast-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
      : `<svg class="toast-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;

    toast.innerHTML = `
      ${iconSvg}
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 5000);
  };

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // Strict Phone Input Validation (Numbers Only, Max 10 digits)
  mobileInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
  });

  // Handle Form Submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const raw10Digits = mobileInput.value.trim();
    if (raw10Digits.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      mobileInput.focus();
      return;
    }

    // Automatically prepend +91 country code for backend
    const fullE164Number = `+91${raw10Digits}`;

    // Set Loading state
    submitBtn.disabled = true;
    btnText.textContent = 'Connecting to DDS...';
    btnSpinner.classList.remove('hidden');

    try {
      // Step 1: Send request to demo backend (Always target http://localhost:3000)
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: fullE164Number })
      });

      // HTTP Error Status Handling
      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        let errData = {};
        if (contentType && contentType.includes('application/json')) {
          errData = await res.json().catch(() => ({}));
        }

        let errorMsg = errData.message;
        if (!errorMsg) {
          if (res.status === 404) {
            errorMsg = 'This application is not registered with DDS.';
          } else if (res.status === 401) {
            errorMsg = 'Invalid developer credentials.';
          } else if (res.status === 403) {
            errorMsg = 'This application has been disabled.';
          } else if (res.status === 429) {
            errorMsg = 'Application request limit exceeded.';
          } else if (res.status === 405) {
            errorMsg = 'HTTP 405 Method Not Allowed: Ensure requests target Express backend.';
          } else {
            errorMsg = 'Internal DDS Server Error.';
          }
        }
        throw new Error(errorMsg);
      }

      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('DDS server returned an invalid non-JSON response.');
      }

      const data = await res.json().catch(() => {
        throw new Error('Failed to parse response payload from server.');
      });

      if (!data.success) {
        throw new Error(data.message || 'DDS Authentication request failed.');
      }

      // Step 2: Show Pending Modal
      activeAuthId = data.authenticationId;
      codeDisplay.textContent = data.verificationCode || '583921';

      showModalView('pending');
      remainingSeconds = data.expiresIn || 120;
      startTimer();
      startPolling(activeAuthId);

    } catch (err) {
      console.error('[Login Exception]', err);
      const isTypeError = err.name === 'TypeError' && err.message.includes('fetch');
      const finalMsg = isTypeError 
        ? 'Backend server is offline. Please ensure Express backend is running at http://localhost:3000.' 
        : err.message;
      showToast(finalMsg, 'error');
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = 'Continue with DDS';
      btnSpinner.classList.add('hidden');
    }
  });

  // Switch Modal Sub-Views
  function showModalView(viewName) {
    modalBackdrop.classList.remove('hidden');
    modalPendingView.classList.add('hidden');
    modalSuccessView.classList.add('hidden');
    modalRejectedView.classList.add('hidden');
    modalExpiredView.classList.add('hidden');
    modalCancelledView.classList.add('hidden');

    if (viewName === 'pending') modalPendingView.classList.remove('hidden');
    if (viewName === 'success') modalSuccessView.classList.remove('hidden');
    if (viewName === 'rejected') modalRejectedView.classList.remove('hidden');
    if (viewName === 'expired') modalExpiredView.classList.remove('hidden');
    if (viewName === 'cancelled') modalCancelledView.classList.remove('hidden');
  }

  function hideModal() {
    modalBackdrop.classList.add('hidden');
    clearInterval(pollInterval);
    clearInterval(timerInterval);
  }

  // Timer & Progress Ring
  function startTimer() {
    clearInterval(timerInterval);
    updateTimerUI();

    timerInterval = setInterval(() => {
      remainingSeconds--;
      updateTimerUI();

      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        handleStatusChange('expired');
      }
    }, 1000);
  }

  function updateTimerUI() {
    const mins = Math.floor(Math.max(0, remainingSeconds) / 60);
    const secs = Math.max(0, remainingSeconds) % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    timerDisplay.textContent = formatted;

    if (progressCircle) {
      const progress = remainingSeconds / totalDuration;
      const offset = circleCircumference - (progress * circleCircumference);
      progressCircle.style.strokeDashoffset = offset;
    }
  }

  // Poll backend status every 2 seconds via BACKEND_URL
  function startPolling(authId) {
    clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/status/${encodeURIComponent(authId)}`);
        const contentType = res.headers.get('content-type');
        if (!res.ok || !contentType || !contentType.includes('application/json')) return;

        const data = await res.json().catch(() => ({}));
        const status = (data.status || 'pending').toLowerCase();

        if (status !== 'pending') {
          handleStatusChange(status);
        }
      } catch (err) {
        console.error('[Polling Error]', err);
      }
    }, 2000);
  }

  // Handle status resolution
  function handleStatusChange(status) {
    clearInterval(pollInterval);
    clearInterval(timerInterval);

    if (status === 'approved') {
      showModalView('success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1400);

    } else if (status === 'rejected') {
      showModalView('rejected');

    } else if (status === 'expired') {
      showModalView('expired');

    } else if (status === 'cancelled') {
      showModalView('cancelled');
    }
  }

  cancelBtn.addEventListener('click', () => {
    handleStatusChange('cancelled');
  });

  [retryBtnRejected, retryBtnExpired, retryBtnCancelled].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        hideModal();
        mobileInput.focus();
      });
    }
  });
});
