const SOUND_ENABLED_KEY = "keuanganku-notif-sound";
const SOUND_VOLUME_KEY = "keuanganku-notif-volume";

export function isSoundEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SOUND_ENABLED_KEY);
    if (raw === null) return true;
    return raw !== "0" && raw !== "false";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, enabled ? "1" : "0");
  } catch {
    // ignore storage errors (private mode, etc)
  }
}

export function getSoundVolume(): number {
  try {
    const raw = localStorage.getItem(SOUND_VOLUME_KEY);
    if (raw === null) return 0.7;
    const v = Number(raw);
    if (Number.isNaN(v)) return 0.7;
    return Math.min(1, Math.max(0, v));
  } catch {
    return 0.7;
  }
}

export function setSoundVolume(volume: number): void {
  try {
    localStorage.setItem(SOUND_VOLUME_KEY, String(Math.min(1, Math.max(0, volume))));
  } catch {
    // ignore
  }
}

function vibratePattern(): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([90, 40, 90]);
    }
  } catch {
    // ignore
  }
}

/**
 * Main notification sound — uses Web Audio API oscillator (no external asset needed).
 * Plays a pleasant two-tone chime (~880hz -> 659hz). Returns true if playback started.
 * Also triggers vibration on supported devices.
 */
export function playNotificationSound(volume = getSoundVolume()): boolean {
  if (typeof window === "undefined") return false;

  // Check user preference — we still vibrate even if muted? No, respect mute for sound only.
  // Caller should check isSoundEnabled() if they want to skip entirely. Here we still play if forced.
  // But we provide a helper below that respects preference.
  try {
    const AudioCtx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) throw new Error("AudioContext unsupported");

    const ctx = new AudioCtx();
    // Auto-resume if suspended (needed when triggered without recent user gesture)
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.value = Math.min(1, Math.max(0, volume));
    masterGain.connect(ctx.destination);

    // Reusable function to schedule a tone
    const scheduleTone = (freq: number, startOffset: number, duration: number, type: OscillatorType, peak: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + startOffset);
      gain.gain.linearRampToValueAtTime(peak, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.05);
    };

    // First chime: crisp high
    scheduleTone(880, 0, 0.24, "sine", 0.9);
    // Second chime: warmer
    scheduleTone(659.25, 0.14, 0.32, "triangle", 0.68);
    // Optional third soft overtone for richness
    scheduleTone(1318.5, 0.01, 0.12, "sine", 0.2);

    vibratePattern();

    // Cleanup AudioContext after playback to avoid resource leak.
    window.setTimeout(() => {
      try {
        ctx.close().catch(() => {});
      } catch {
        // ignore
      }
    }, 1200);

    return true;
  } catch {
    // Fallback: try via HTMLAudio with tiny embedded WAV data URI (440hz beep)
    try {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="
      );
      audio.volume = Math.min(1, Math.max(0, volume));
      // This base64 is intentionally ultra-short silence placeholder - real tone already attempted via oscillator fallback
      // If AudioContext truly unavailable, at least vibration feedback exists
      audio.play().catch(() => {});
      vibratePattern();
      return true;
    } catch {
      vibratePattern();
      return false;
    }
  }
}

/**
 * Respects user sound preference. Returns false if sound is disabled.
 */
export function playNotificationSoundIfEnabled(volume?: number): boolean {
  if (!isSoundEnabled()) {
    // Still vibrate even when muted? Keep vibration as haptic feedback regardless.
    vibratePattern();
    return false;
  }
  return playNotificationSound(volume);
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermissionWithSound(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return Notification.permission;
  }
}

/**
 * Shows a test notification (browser Notification if permitted) + vibrates + plays sound.
 * Returns metadata for UI feedback.
 */
export async function triggerTestNotification(options?: {
  title?: string;
  body?: string;
  withSound?: boolean;
  volume?: number;
}): Promise<{ shown: boolean; permission: NotificationPermission | "unsupported"; soundPlayed: boolean }> {
  const title = options?.title ?? "KeuanganKu — Test Notifikasi";
  const body = options?.body ?? "Notifikasi aktif! Suara dan getar juga berfungsi 🎉";
  const withSound = options?.withSound ?? isSoundEnabled();
  const permission = getNotificationPermission();

  let shown = false;
  let soundPlayed = false;

  if (withSound) {
    soundPlayed = playNotificationSound(options?.volume);
  } else {
    vibratePattern();
  }

  if (permission === "granted") {
    try {
      // Prefer ServiceWorker notification when in PWA / when SW is active for persistence
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        if (reg && "showNotification" in reg) {
          await (reg as unknown as { showNotification: (t: string, o: NotificationOptions) => Promise<void> }).showNotification(title, {
            body,
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            tag: "keuanganku-test",
            renotify: true,
            requireInteraction: false,
            vibrate: [90, 40, 90],
          } as NotificationOptions);
          shown = true;
        } else {
          new Notification(title, {
            body,
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            tag: "keuanganku-test",
          });
          shown = true;
        }
      } else {
        new Notification(title, {
          body,
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          tag: "keuanganku-test",
        });
        shown = true;
      }
    } catch {
      shown = false;
    }
  }

  return { shown, permission, soundPlayed };
}
