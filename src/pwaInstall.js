let deferredInstallPrompt = null;

export function setupInstallPrompt(onAvailable, onInstalled) {
  const handleBeforeInstallPrompt = (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (typeof onAvailable === 'function') onAvailable(true);
  };

  const handleAppInstalled = () => {
    deferredInstallPrompt = null;
    if (typeof onAvailable === 'function') onAvailable(false);
    if (typeof onInstalled === 'function') onInstalled();
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);

  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  };
}

export async function installMediDocs() {
  if (!deferredInstallPrompt) return false;
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  return result.outcome === 'accepted';
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
