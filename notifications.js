/**
 * Aura Weather Dashboard - Notifications Module
 * Handles Toast notifications and Browser native notifications
 */

// Initialize toast container in DOM if not present
let toastContainer = null;

function initToastContainer() {
  if (toastContainer) return;
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);
}

// Show a beautiful sliding toast notification
export function showToast(message, type = 'info', duration = 4000) {
  initToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Icon selector based on type
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  else if (type === 'warning') icon = '⚠️';
  else if (type === 'error') icon = '❌';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close-btn">&times;</button>
  `;

  // Append toast
  toastContainer.appendChild(toast);

  // Trigger CSS entry transition
  setTimeout(() => toast.classList.add('show'), 10);

  // Timer to remove toast
  const dismissTimeout = setTimeout(() => {
    dismissToast(toast);
  }, duration);

  // Close button event
  toast.querySelector('.toast-close-btn').addEventListener('click', () => {
    clearTimeout(dismissTimeout);
    dismissToast(toast);
  });
}

function dismissToast(toast) {
  toast.classList.remove('show');
  toast.classList.add('hide');
  toast.addEventListener('transitionend', () => {
    toast.remove();
  });
}

// Browser Notification Management
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

export function triggerSevereAlertNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  // Create system notification
  try {
    const options = {
      body: body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'aura-severe-alert'
    };
    
    // Check if Service Worker is active and show notification through registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, options);
      });
    } else {
      new Notification(title, options);
    }
  } catch (e) {
    console.error('Failed to trigger native browser notification:', e);
  }
}
