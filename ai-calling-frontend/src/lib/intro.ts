export const INTRO_KEY = "talkaor-intro-seen";
export const INTRO_EVENT = "talkaor:intro-state";

/** Inline script (runs before paint): decides whether the intro plays this session. */
export const introBootScript = `(function(){try{var d=document.documentElement;var seen=sessionStorage.getItem('${INTRO_KEY}');if(seen){d.dataset.intro='done';return;}if(location.pathname==='/'){d.dataset.intro='pending';}else{sessionStorage.setItem('${INTRO_KEY}','1');d.dataset.intro='done';}}catch(e){document.documentElement.dataset.intro='done';}})();`;

export function isIntroPending(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.intro === "pending";
}

export function finishIntro() {
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {}
  document.documentElement.dataset.intro = "done";
  window.dispatchEvent(new CustomEvent(INTRO_EVENT, { detail: "done" }));
}
