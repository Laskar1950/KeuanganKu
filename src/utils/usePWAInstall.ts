import { useCallback, useEffect, useMemo, useState } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
}

function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

function isIOSDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Macintosh but with touch
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || isIPadOS;
}

function isIOSStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandaloneDisplayMode() || isIOSStandalone());
  const [canInstall, setCanInstall] = useState(false);

  const isIOS = useMemo(() => isIOSDevice(), []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      event.preventDefault();
      const e = event as BeforeInstallPromptEvent;
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    const mql = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setCanInstall(false);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Some browsers (e.g. Samsung) may fire without beforeinstallprompt being cancelable
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handleDisplayModeChange);
    } else if (typeof (mql as unknown as { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener === "function") {
      (mql as unknown as { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener(handleDisplayModeChange);
    }

    // Re-check standalone on mount (in case PWA was already installed)
    if (isStandaloneDisplayMode() || isIOSStandalone()) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", handleDisplayModeChange);
      } else if (typeof (mql as unknown as { removeListener: (cb: (e: MediaQueryListEvent) => void) => void }).removeListener === "function") {
        (mql as unknown as { removeListener: (cb: (e: MediaQueryListEvent) => void) => void }).removeListener(handleDisplayModeChange);
      }
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable" | "already-installed"> => {
    if (isInstalled) return "already-installed";
    if (!deferredPrompt) return "unavailable";
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      // After prompt, clear it - Chrome only lets you call prompt() once.
      setDeferredPrompt(null);
      setCanInstall(false);
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        return "accepted";
      }
      return "dismissed";
    } catch {
      return "unavailable";
    }
  }, [deferredPrompt, isInstalled]);

  return {
    canInstall: canInstall && !isInstalled && !!deferredPrompt,
    isInstalled,
    isIOS,
    isIOSStandalone: isIOSStandalone(),
    deferredPrompt,
    promptInstall,
  };
}
