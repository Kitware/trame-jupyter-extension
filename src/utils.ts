export function updateOutputs() {
  const full = document.querySelectorAll<HTMLElement>(
    '.jp-LinkedOutputView iframe[id*=trame__template]'
  );
  const all = document.querySelectorAll<HTMLElement>(
    'iframe[id*=trame__template]'
  );
  const visibleInFullScreen: Record<string, boolean> = {};
  const moveToFullScreen: Array<HTMLElement> = [];

  for (let i = 0; i < full.length; i++) {
    const iframe = full[i];
    visibleInFullScreen[iframe.id] = true;
    moveToFullScreen.push(iframe);
  }
  for (let i = 0; i < all.length; i++) {
    const iframe = all[i];
    if (moveToFullScreen.includes(iframe)) {
      continue;
    }
    if (visibleInFullScreen[iframe.id]) {
      iframe.style.display = 'none';
    } else {
      iframe.style.display = 'block';
    }
  }
  for (let i = 0; i < moveToFullScreen.length; i++) {
    const iframe = moveToFullScreen[i];
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    if (iframe?.parentElement) {
      iframe.parentElement.style.padding = '0';
    }
    if (iframe?.parentElement?.parentElement) {
      iframe.parentElement.parentElement.style.height = '100%';
    }
  }
}
