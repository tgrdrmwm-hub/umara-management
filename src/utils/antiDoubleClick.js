/**
 * Sistem Pengaman Anti Double-Click Global (Anti-Double-Click System Guard)
 * 
 * Mencegah klik ganda / spam-klik tidak sengaja di SELURUH elemen button,
 * tombol form, dan interactive controls di seluruh sistem web.
 * 
 * Cara kerja:
 * 1. Capture-phase click interceptor pada level Document:
 *    Mencegat event klik sebelum masuk ke event bus React / komponen.
 *    Jika tombol diklik kembali dalam durasi cooldown (< 650ms),
 *    event klik kedua langsung di-swallow (e.preventDefault, e.stopPropagation, e.stopImmediatePropagation).
 * 2. Form submit guard:
 *    Mencegah multiple submission form berturut-turut (< 800ms).
 * 3. Element & Context memory tracker:
 *    Mencegah double click bahkan jika React me-render ulang / mereplace DOM node instance.
 * 4. Kompatibel penuh dengan React 18 & 19, Lucide, Tailwind, dan NextThemes.
 */

const DEFAULT_COOLDOWN_MS = 650;
const elementClickMap = new WeakMap();

let lastGlobalClick = {
  time: 0,
  text: "",
  ariaLabel: "",
  id: "",
  x: 0,
  y: 0,
  target: null,
};

let lastFormSubmitTime = 0;
let lastSubmittedForm = null;

let isInitialized = false;

export function initAntiDoubleClick(cooldownMs = DEFAULT_COOLDOWN_MS) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (isInitialized) return;
  isInitialized = true;

  // 1. GLOBAL CLICK INTERCEPTOR (CAPTURE PHASE)
  document.addEventListener(
    "click",
    (e) => {
      // Cari elemen button atau role="button" terdekat dari target klik
      const button = e.target?.closest?.(
        'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]',
      );

      // Jika bukan tombol atau kontrol tombol, biarkan event berjalan normal
      if (!button) return;

      // Opsional: jika ada tombol khusus yang sengaja mengizinkan multi-klik cepat
      if (button.dataset.allowMultiClick === "true") return;

      const now = Date.now();
      const lastClick = elementClickMap.get(button) || 0;
      const timeSinceLastClick = now - lastClick;

      // Cek apakah tombol sedang dalam status terkunci / busy / disabled
      const isElementLocked =
        button.dataset.clickLocked === "true" ||
        button.getAttribute("aria-busy") === "true" ||
        button.disabled;

      // Cek kesamaan konteks klik terakhir (Spatial & Text similarity)
      // untuk mengantisipasi jika React me-render ulang node DOM baru dalam hitungan milidetik
      const currentText = (button.innerText || button.textContent || "").trim();
      const currentAria = button.getAttribute("aria-label") || "";
      const currentId = button.id || "";
      const isSameContext =
        now - lastGlobalClick.time < cooldownMs &&
        (button === lastGlobalClick.target ||
          (currentText && currentText === lastGlobalClick.text) ||
          (currentId && currentId === lastGlobalClick.id) ||
          (Math.abs(e.clientX - lastGlobalClick.x) < 28 &&
            Math.abs(e.clientY - lastGlobalClick.y) < 28));

      // Jika klik terjadi dalam masa cooldown atau tombol sedang terkunci:
      if (timeSinceLastClick < cooldownMs || isElementLocked || isSameContext) {
        // Hentikan seketika event klik ini sehingga TIDAK sampai ke React handler atau browser default
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      // Catat waktu klik pertama yang valid
      elementClickMap.set(button, now);
      button.dataset.clickLocked = "true";

      lastGlobalClick = {
        time: now,
        text: currentText,
        ariaLabel: currentAria,
        id: currentId,
        x: e.clientX,
        y: e.clientY,
        target: button,
      };

      // Buka kunci secara otomatis setelah masa cooldown selesai
      setTimeout(() => {
        if (button.dataset.clickLocked === "true") {
          delete button.dataset.clickLocked;
        }
      }, cooldownMs);
    },
    { capture: true, passive: false },
  );

  // 2. GLOBAL FORM SUBMIT INTERCEPTOR (CAPTURE PHASE)
  document.addEventListener(
    "submit",
    (e) => {
      const form = e.target;
      if (!form || form.tagName !== "FORM") return;

      if (form.dataset.allowMultiSubmit === "true") return;

      const now = Date.now();
      const timeSinceLastSubmit = now - lastFormSubmitTime;

      if (
        (form === lastSubmittedForm && timeSinceLastSubmit < 800) ||
        form.dataset.submitLocked === "true"
      ) {
        // Cegah pengiriman form ganda
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      lastFormSubmitTime = now;
      lastSubmittedForm = form;
      form.dataset.submitLocked = "true";

      // Kunci juga seluruh tombol submit di dalam form tersebut
      const submitButtons = form.querySelectorAll(
        'button[type="submit"], input[type="submit"]',
      );
      submitButtons.forEach((btn) => {
        btn.dataset.clickLocked = "true";
      });

      setTimeout(() => {
        delete form.dataset.submitLocked;
        submitButtons.forEach((btn) => {
          delete btn.dataset.clickLocked;
        });
      }, 800);
    },
    { capture: true, passive: false },
  );
}

/**
 * Helper manual untuk mengunci tombol selama proses asynchronous spesifik
 */
export function lockButton(buttonElement, durationMs = 800) {
  if (!buttonElement) return;
  buttonElement.dataset.clickLocked = "true";
  elementClickMap.set(buttonElement, Date.now());
  setTimeout(() => {
    delete buttonElement.dataset.clickLocked;
  }, durationMs);
}
