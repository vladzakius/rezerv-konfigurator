export const fmt = (n) => Math.round(+n || 0).toLocaleString("uk-UA");
export const dec = (n, d = 1) => (+n || 0).toFixed(d).replace(".", ",");
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function load(k) {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}
export function save(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* сховище недоступне — працюємо в пам'яті */
  }
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function slug(s) {
  return (String(s || "obiekt").replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 40)) || "obiekt";
}

export async function copyText(t) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(t);
      return true;
    }
  } catch {
    /* fallback нижче */
  }
  try {
    const b = document.createElement("textarea");
    b.value = t;
    b.style.position = "fixed";
    b.style.left = "-9999px";
    document.body.appendChild(b);
    b.select();
    document.execCommand("copy");
    b.remove();
    return true;
  } catch {
    return false;
  }
}

/** Зменшує фото до 1500 px по більшій стороні, JPEG */
export function shrinkImage(file) {
  return new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const M = 1500;
        const k = Math.min(1, M / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res({ src: c.toDataURL("image/jpeg", 0.82), w: c.width, h: c.height });
      };
      img.onerror = () => res(null);
      img.src = fr.result;
    };
    fr.onerror = () => res(null);
    fr.readAsDataURL(file);
  });
}
