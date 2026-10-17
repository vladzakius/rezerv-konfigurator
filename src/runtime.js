import { useEffect, useState } from "react";

/* Можливості claude.ai Artifact (db, downloads). Поза claude.ai — null, працює localStorage. */
export function useRuntime() {
  const available = typeof window !== "undefined" && !!(window.claude && window.claude.use);
  const [rt, setRt] = useState({ db: null, dl: null, ready: !available, available });
  useEffect(() => {
    if (!available) return;
    let off = false;
    (async () => {
      let dl = null;
      let db = null;
      try {
        dl = await window.claude.use("downloads");
      } catch {
        dl = null;
      }
      try {
        db = await window.claude.use("db");
      } catch {
        db = null;
      }
      if (!off) setRt({ db, dl, ready: true, available: true });
    })();
    return () => {
      off = true;
    };
  }, [available]);
  return rt;
}

/** Зберегти файл: через downloads у claude.ai, інакше звичайне завантаження браузера */
export async function saveFile(dl, filename, blob) {
  if (dl) {
    try {
      await dl.save({ filename, data: blob });
      return true;
    } catch (e) {
      if (e && e.code === "cancelled") return false;
    }
  }
  try {
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
    return true;
  } catch {
    return false;
  }
}
