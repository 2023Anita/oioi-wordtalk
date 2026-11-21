import { flushSync } from "react-dom";

type VTDocument = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Run a DOM-changing update inside a View Transition when the browser supports it. */
export function transition(update: () => void) {
  const d = document as VTDocument;
  if (!d.startViewTransition || reduced()) {
    update();
    return;
  }
  // If the transition cannot start or its snapshot fails (seen on some iOS builds), make sure the
  // new page is still committed instead of leaving the old one or a blank frame on screen.
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    flushSync(update);
  };
  try {
    const t = d.startViewTransition(run);
    t.finished.catch(run);
    window.setTimeout(run, 400);
  } catch {
    run();
  }
}

/** Morph an element (e.g. a gallery tile's illustration) into the word card. */
export function morphFrom(el: HTMLElement | null | undefined, update: () => void) {
  const d = document as VTDocument;
  if (!el || !d.startViewTransition || reduced()) {
    update();
    return;
  }
  el.style.viewTransitionName = "word-art";
  const t = d.startViewTransition(() => {
    el.style.viewTransitionName = "";
    flushSync(update);
  });
  t.finished.finally(() => (el.style.viewTransitionName = ""));
}
