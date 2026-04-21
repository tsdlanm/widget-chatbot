// Find the widget script via its data attribute so the loader works in dev and build.
const currentScript = document.querySelector("script[data-api-key]");

const apiKey = currentScript?.getAttribute("data-api-key");

if (!apiKey) {
  console.error(
    "Chatbot Widget: Missing data-api-key attribute on the script tag."
  );
} else {
  initWidget(apiKey);
}

function initWidget(apiKey: string) {
  const CHAT_UI_URL = import.meta.env.WIDGET_URL;
  const DRAG_THRESHOLD = 6;
  const EDGE_PADDING = 12;

  const container = document.createElement("div");
  container.id = "chatbot-widget-container";
  container.style.position = "fixed";
  container.style.bottom = "24px";
  container.style.right = "24px";
  container.style.zIndex = "999999";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "flex-end";
  container.style.fontFamily = "sans-serif";

  const iframe = document.createElement("iframe");
  const parentOrigin = encodeURIComponent(window.location.href);
  iframe.src = `${CHAT_UI_URL}?key=${apiKey}&origin=${parentOrigin}`;
  iframe.style.width = "380px";
  iframe.style.height = "600px";
  iframe.style.maxWidth = "calc(100vw - 48px)";
  iframe.style.maxHeight = "calc(100vh - 120px)";
  iframe.style.border = "none";
  iframe.style.borderRadius = "16px";
  iframe.style.boxShadow = "0 10px 40px -10px rgba(0,0,0,0.2)";
  iframe.style.marginBottom = "16px";
  iframe.style.opacity = "0";
  iframe.style.transition = "opacity 0.2s ease, transform 0.2s ease";
  iframe.style.transform = "translateY(10px) scale(0.98)";
  iframe.style.pointerEvents = "none";
  iframe.style.backgroundColor = "transparent";

  const button = document.createElement("button");
  button.style.width = "clamp(48px, 7vw, 56px)";
  button.style.height = "clamp(48px, 7vw, 56px)";
  button.style.borderRadius = "50%";
  button.style.backgroundColor = "#0f172a";
  button.style.color = "#ffffff";
  button.style.border = "none";
  button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  button.style.cursor = "grab";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.transition = "transform 0.2s ease";
  button.style.userSelect = "none";
  button.style.touchAction = "none";

  const messageIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="clamp(18px, 3.5vw, 24px)" height="clamp(18px, 3.5vw, 24px)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
    </svg>
  `;

  const closeIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="clamp(18px, 3.5vw, 24px)" height="clamp(18px, 3.5vw, 24px)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;

  button.innerHTML = messageIcon;

  let isOpen = false;
  let isDragging = false;
  let suppressClick = false;
  let isAtDefaultPosition = true;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let pointerStartX = 0;
  let pointerStartY = 0;

  const resetToDefaultPosition = () => {
    container.style.left = "";
    container.style.top = "";
    container.style.right = "24px";
    container.style.bottom = "24px";
    isAtDefaultPosition = true;
  };

  const closeWidget = () => {
    isOpen = false;
    iframe.style.opacity = "0";
    iframe.style.transform = "translateY(10px) scale(0.98)";
    iframe.style.pointerEvents = "none";
    button.innerHTML = messageIcon;
  };

  const getViewportRect = () => {
    const viewport = window.visualViewport;

    if (viewport) {
      return {
        left: viewport.offsetLeft,
        top: viewport.offsetTop,
        width: viewport.width,
        height: viewport.height,
      };
    }

    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  };

  const clampButtonToViewport = () => {
    const buttonRect = button.getBoundingClientRect();
    const viewportRect = getViewportRect();
    const containerRect = container.getBoundingClientRect();

    const minLeft = viewportRect.left + EDGE_PADDING;
    const minTop = viewportRect.top + EDGE_PADDING;
    const maxRight = viewportRect.left + viewportRect.width - EDGE_PADDING;
    const maxBottom = viewportRect.top + viewportRect.height - EDGE_PADDING;

    let nextLeft = containerRect.left;
    let nextTop = containerRect.top;

    if (buttonRect.left < minLeft) {
      nextLeft += minLeft - buttonRect.left;
    }

    if (buttonRect.right > maxRight) {
      nextLeft -= buttonRect.right - maxRight;
    }

    if (buttonRect.top < minTop) {
      nextTop += minTop - buttonRect.top;
    }

    if (buttonRect.bottom > maxBottom) {
      nextTop -= buttonRect.bottom - maxBottom;
    }

    container.style.left = `${nextLeft}px`;
    container.style.top = `${nextTop}px`;
    container.style.right = "auto";
    container.style.bottom = "auto";
  };

  button.addEventListener("mouseenter", () => {
    button.style.transform = "scale(1.05)";
  });

  button.addEventListener("mouseleave", () => {
    button.style.transform = "scale(1)";
  });

  button.addEventListener("click", () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }

    if (!isAtDefaultPosition) {
      resetToDefaultPosition();
      return;
    }

    isOpen = !isOpen;

    if (isOpen) {
      iframe.style.opacity = "1";
      iframe.style.transform = "translateY(0) scale(1)";
      iframe.style.pointerEvents = "auto";
      button.innerHTML = closeIcon;
    } else {
      closeWidget();
    }
  });

  button.addEventListener("pointerdown", (event) => {
    isDragging = false;
    suppressClick = false;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;

    const rect = container.getBoundingClientRect();
    dragOffsetX = pointerStartX - rect.left;
    dragOffsetY = pointerStartY - rect.top;

    button.setPointerCapture(event.pointerId);
    button.style.cursor = "grabbing";
  });

  button.addEventListener("pointermove", (event) => {
    if (!button.hasPointerCapture(event.pointerId)) return;

    const distanceX = Math.abs(event.clientX - pointerStartX);
    const distanceY = Math.abs(event.clientY - pointerStartY);

    if (!isDragging && Math.max(distanceX, distanceY) >= DRAG_THRESHOLD) {
      isDragging = true;
      suppressClick = true;
      isAtDefaultPosition = false;
      iframe.style.pointerEvents = "none";
    }

    if (!isDragging) return;

    container.style.left = `${event.clientX - dragOffsetX}px`;
    container.style.top = `${event.clientY - dragOffsetY}px`;
    container.style.right = "auto";
    container.style.bottom = "auto";
    clampButtonToViewport();
  });

  const endDrag = () => {
    if (isDragging) {
      window.setTimeout(() => {
        isDragging = false;
        button.style.cursor = "grab";
      }, 0);
    } else {
      button.style.cursor = "grab";
    }

    iframe.style.pointerEvents = isOpen ? "auto" : "none";
  };

  button.addEventListener("pointerup", endDrag);
  button.addEventListener("pointercancel", endDrag);

  const handleViewportChange = () => {
    if (!isAtDefaultPosition) {
      clampButtonToViewport();
    }
  };

  window.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("scroll", handleViewportChange);

  document.addEventListener("pointerdown", (event) => {
    if (!isOpen) return;

    const target = event.target;
    if (!(target instanceof Node)) return;

    if (!container.contains(target)) {
      closeWidget();
    }
  });

  container.appendChild(iframe);
  container.appendChild(button);
  document.body.appendChild(container);
  resetToDefaultPosition();
}
