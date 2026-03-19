(function () {
  const content = window.siteContent;
  const siteNav = document.getElementById("site-nav");
  const tabsTrack = document.getElementById("tabs-track");
  const siteEyebrow = document.getElementById("site-eyebrow");
  const siteTitle = document.getElementById("site-title");
  const menuToggle = document.getElementById("menu-toggle");

  if (!content || !siteNav || !tabsTrack || !siteEyebrow || !siteTitle || !menuToggle) {
    return;
  }

  siteEyebrow.textContent = content.brand.eyebrow;
  siteTitle.textContent = content.brand.name;

  const tabs = [{ id: "home", label: "首页" }].concat(
    content.sections.map((section) => ({ id: section.id, label: section.navLabel }))
  );

  siteNav.innerHTML = tabs
    .map(
      (tab, index) =>
        `<button class="nav-link${index === 0 ? " is-active" : ""}" type="button" data-tab-trigger="${tab.id}">${tab.label}</button>`
    )
    .join("");

  tabsTrack.innerHTML = [renderHome(content.home)].concat(content.sections.map(renderSection)).join("");

  const entryModals = []
    .concat(content.miniProgram && content.miniProgram.modalId ? [content.miniProgram] : [])
    .concat(Array.isArray(content.resourceModals) ? content.resourceModals.filter((modal) => modal && modal.modalId) : []);

  if (entryModals.length) {
    document.body.insertAdjacentHTML("beforeend", entryModals.map(renderEntryModal).join(""));
  }

  const tabTriggers = Array.from(document.querySelectorAll("[data-tab-trigger]"));
  const tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));
  const quickJumpButtons = Array.from(document.querySelectorAll("[data-tab-jump]"));
  const modalOpenButtons = Array.from(document.querySelectorAll("[data-modal-open]"));
  const modalCloseButtons = Array.from(document.querySelectorAll("[data-modal-close]"));
  const tabIds = tabPanels.map((panel) => panel.dataset.tabPanel);
  let activeModal = null;
  let coreStage3DModulePromise = null;

  function activateTab(tabId) {
    const tabIndex = tabIds.indexOf(tabId);
    if (tabIndex === -1) {
      return;
    }

    tabTriggers.forEach((trigger) => {
      trigger.classList.toggle("is-active", trigger.dataset.tabTrigger === tabId);
    });

    tabPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.tabPanel === tabId);
    });

    tabsTrack.style.transform = `translateX(-${tabIndex * 100}%)`;
    siteNav.classList.remove("is-open");

    requestAnimationFrame(syncProjectMediaState);
  }

  tabTriggers.forEach((trigger) => {
    trigger.addEventListener("click", function () {
      activateTab(trigger.dataset.tabTrigger);
    });
  });

  quickJumpButtons.forEach((button) => {
    button.addEventListener("click", function () {
      activateTab(button.dataset.tabJump);
    });
  });

  modalOpenButtons.forEach((button) => {
    button.addEventListener("click", function () {
      openModal(button.dataset.modalOpen);
    });
  });

  modalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeActiveModal);
  });

  menuToggle.addEventListener("click", function () {
    siteNav.classList.toggle("is-open");
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeActiveModal();
    }
  });

  activateTab("home");
  syncModalMediaState();
  syncProjectMediaState();
  setupCoreStage();
  setupStarfield();
  setupCursorGlow();

  function openModal(modalId) {
    if (!modalId) {
      return;
    }

    const nextModal = document.querySelector(`[data-modal-id="${modalId}"]`);
    if (!nextModal) {
      return;
    }

    activeModal = nextModal;
    nextModal.hidden = false;
    nextModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-modal-open");
    siteNav.classList.remove("is-open");
    syncModalMediaState();

    const closeButton = nextModal.querySelector(".site-modal-close");
    if (closeButton) {
      closeButton.focus();
    }
  }

  function closeActiveModal() {
    if (!activeModal) {
      return;
    }

    activeModal.hidden = true;
    activeModal.setAttribute("aria-hidden", "true");
    activeModal = null;
    document.body.classList.remove("has-modal-open");
  }

  function syncModalMediaState() {
    const mediaShells = Array.from(document.querySelectorAll("[data-modal-media-shell]"));

    mediaShells.forEach((shell) => {
      const image = shell.querySelector("[data-modal-media-image]");
      if (!image) {
        return;
      }

      const updateState = () => {
        if (!image.getAttribute("src")) {
          shell.classList.remove("has-image");
          return;
        }

        if (image.complete && image.naturalWidth > 0) {
          shell.classList.add("has-image");
          return;
        }

        shell.classList.remove("has-image");
      };

      if (!image.dataset.mediaBound) {
        image.addEventListener("load", updateState);
        image.addEventListener("error", updateState);
        image.dataset.mediaBound = "true";
      }

      updateState();
    });
  }

  function syncProjectMediaState() {
    const mediaShells = Array.from(document.querySelectorAll("[data-project-media-shell]"));

    mediaShells.forEach((shell) => {
      const image = shell.querySelector("[data-project-media-image]");
      if (!image) {
        return;
      }

      const updateState = () => {
        if (!image.getAttribute("src")) {
          shell.classList.remove("has-image");
          return;
        }

        if (image.complete && image.naturalWidth > 0) {
          shell.classList.add("has-image");
          return;
        }

        shell.classList.remove("has-image");
      };

      if (!image.dataset.mediaBound) {
        image.addEventListener("load", updateState);
        image.addEventListener("error", updateState);
        image.dataset.mediaBound = "true";
      }

      updateState();
    });
  }

  function renderHome(home) {
    const hero = home.hero;
    const coreCards = home.coreStage.cards.map(renderCoreStageCard).join("");
    const coreStageMedia = renderCoreStageMedia();
    const overviewItems = home.tabOverview.items.map(renderOverviewItem).join("");

    return `
      <section class="tab-panel" data-tab-panel="home">
        <div class="section-panel home-panel">
          <div class="home-hero-grid">
            <div class="hero-copy home-copy">
              <p class="system-pill">${hero.systemLabel}</p>
              <p class="eyebrow home-eyebrow">${hero.eyebrow}</p>
              <h2 class="home-title">
                ${hero.titleLines
                  .map(
                    (line, index) =>
                      `<span class="home-title-line${index === hero.titleLines.length - 1 ? " is-accent" : ""}">${line}</span>`
                  )
                  .join("")}
              </h2>
              <div class="hero-paragraph-stack">
                <p class="hero-subtitle home-subtitle">${hero.intro}</p>
                <p class="hero-subtitle home-subtitle secondary">${hero.detail}</p>
              </div>
              <div class="status-list">
                ${hero.statusPills.map((pill) => `<span class="status-pill">${pill}</span>`).join("")}
              </div>
              <div class="action-row home-actions">
                ${hero.actions.map(renderAction).join("")}
              </div>
            </div>

            <aside class="core-stage" data-core-stage>
              <div class="core-stage-shell" data-stage-shell>
                <span class="core-stage-grid"></span>
                ${coreStageMedia}
                <span class="core-cursor"></span>
              </div>
              <span class="core-stage-label">${home.coreStage.label}</span>
              ${coreCards}
            </aside>
          </div>

          <div class="section-module home-overview-module">
            <div class="module-head module-head-wide">
              <div>
                <p class="eyebrow">${home.tabOverview.eyebrow}</p>
                <h3 class="section-title section-title-compact">${home.tabOverview.title}</h3>
                <p class="section-desc">${home.tabOverview.description}</p>
              </div>
            </div>
            <div class="overview-grid">
              ${overviewItems}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderCoreStageCard(card) {
    const depthMap = {
      top: 1.16,
      left: 0.82,
      bottom: 1.04
    };
    const depth = depthMap[card.position] || 1;

    return `
      <article class="stage-panel stage-panel-${card.position}" data-stage-card style="--panel-depth: ${depth};">
        <strong>${card.title}</strong>
        <p>${card.text}</p>
      </article>
    `;
  }

  function renderCoreStageMedia() {
    return `
      <div class="core-stage-media" data-core-stage-flow>
        <span class="core-stage-fallback" aria-hidden="true"></span>
        <div class="core-orbital-shell" aria-hidden="true">
          <span class="core-orb-rear" aria-hidden="true">
            <canvas class="core-stage-canvas" data-core-stage-canvas aria-hidden="true"></canvas>
            <span class="core-orb-layer core-orb-layer-c"></span>
            <span class="core-orb-frame core-orb-frame-a"></span>
            <span class="core-orb-frame core-orb-frame-b"></span>
            <span class="core-orb-plane core-orb-plane-a"></span>
            <span class="core-orb-plane core-orb-plane-b"></span>
            <span class="core-orb-plane core-orb-plane-c"></span>
            <span class="core-orb-axis core-orb-axis-a"></span>
            <span class="core-orb-axis core-orb-axis-b"></span>
            <span class="core-orb-axis core-orb-axis-c"></span>
            <span class="core-orb-grid-sphere"></span>
            <span class="core-orb-arc core-orb-arc-a"></span>
            <span class="core-orb-arc core-orb-arc-b"></span>
            <span class="core-orb-arc core-orb-arc-c"></span>
            <span class="core-orb-arc core-orb-arc-d"></span>
          </span>
          <span class="core-core-sphere"></span>
          <span class="core-orb-front" aria-hidden="true">
            <span class="core-orb-layer core-orb-layer-a"></span>
            <span class="core-orb-layer core-orb-layer-b"></span>
            <span class="core-orb-glow"></span>
            <span class="core-orb-wave core-orb-wave-a"></span>
            <span class="core-orb-wave core-orb-wave-b"></span>
            <span class="core-orb-pulse core-orb-pulse-a"></span>
            <span class="core-orb-pulse core-orb-pulse-b"></span>
            <span class="core-orb-node core-orb-node-a"></span>
            <span class="core-orb-node core-orb-node-b"></span>
            <span class="core-orb-node core-orb-node-c"></span>
            <span class="core-orb-node core-orb-node-d"></span>
            <span class="core-orb-node core-orb-node-e"></span>
            <span class="core-orb-node core-orb-node-f"></span>
          </span>
        </div>
      </div>
    `;
  }

  function renderOverviewItem(item) {
    return `
      <button class="overview-card" type="button" data-tab-jump="${item.target}">
        <span class="overview-kicker">Tab Guide</span>
        <strong class="overview-title">${item.title}</strong>
        <span class="overview-text">${item.text}</span>
        <span class="overview-link">进入这个 tab</span>
      </button>
    `;
  }

  function renderSection(section) {
    return `
      <section class="tab-panel" data-tab-panel="${section.id}">
        <div class="section-panel">
          <div class="section-stack">
            ${section.modules.map((module) => renderModule(module, section)).join("")}
          </div>
        </div>
      </section>
    `;
  }

  function renderModule(module, section) {
    if (module.type === "intro") {
      return renderIntroModule(module, section);
    }

    if (module.type === "cards-grid") {
      return renderCardsGridModule(module);
    }

    if (module.type === "project-showcase") {
      return renderProjectShowcaseModule(module);
    }

    if (module.type === "timeline") {
      return renderTimelineModule(module);
    }

    if (module.type === "stats-grid") {
      return renderStatsGridModule(module);
    }

    if (module.type === "contact-grid") {
      return renderContactGridModule(module);
    }

    if (module.type === "cta-panel") {
      return renderCtaPanelModule(module);
    }

    return `<article class="content-card"><p class="empty-text">未识别的模块类型。</p></article>`;
  }

  function renderIntroModule(module, section) {
    return `
      <section class="section-module intro-module">
        <div class="section-head section-head-intro">
          <div>
            <p class="eyebrow">${module.eyebrow || section.navLabel}</p>
            <h2 class="section-title">${module.title || section.navLabel}</h2>
            <p class="section-desc">${module.text}</p>
          </div>
        </div>
        ${module.pills && module.pills.length ? `<div class="pill-row">${module.pills.map((pill) => `<span class="pill">${pill}</span>`).join("")}</div>` : ""}
      </section>
    `;
  }

  function renderCardsGridModule(module) {
    return `
      <section class="section-module">
        ${renderModuleHead(module)}
        <div class="module-grid columns-${module.columns || 3}">
          ${module.cards.map(renderDetailCard).join("")}
        </div>
      </section>
    `;
  }

  function renderProjectShowcaseModule(module) {
    return `
      <section class="section-module">
        ${renderModuleHead(module)}
        <div class="showcase-grid columns-${module.columns || 3}">
          ${module.items.map(renderProjectShowcaseCard).join("")}
        </div>
      </section>
    `;
  }

  function renderTimelineModule(module) {
    return `
      <section class="section-module">
        ${renderModuleHead(module)}
        <div class="timeline">
          ${module.items.map(renderTimelineItem).join("")}
        </div>
      </section>
    `;
  }

  function renderStatsGridModule(module) {
    return `
      <section class="section-module">
        ${renderModuleHead(module)}
        <div class="stats-grid">
          ${module.items.map(renderStatCard).join("")}
        </div>
      </section>
    `;
  }

  function renderContactGridModule(module) {
    return `
      <section class="section-module">
        ${renderModuleHead(module)}
        <div class="contact-grid">
          ${module.items.map(renderContactCard).join("")}
        </div>
      </section>
    `;
  }

  function renderCtaPanelModule(module) {
    return `
      <section class="section-module">
        <article class="cta-panel">
          <p class="eyebrow">${module.eyebrow}</p>
          <h3 class="section-title section-title-compact">${module.title}</h3>
          <p class="section-desc">${module.text}</p>
          ${module.actions && module.actions.length ? `<div class="action-row cta-actions">${module.actions.map(renderAction).join("")}</div>` : ""}
        </article>
      </section>
    `;
  }

  function renderModuleHead(module) {
    if (!module.title && !module.description && !module.eyebrow) {
      return "";
    }

    return `
      <div class="module-head">
        <div>
          ${module.eyebrow ? `<p class="eyebrow">${module.eyebrow}</p>` : ""}
          ${module.title ? `<h3 class="section-title section-title-compact">${module.title}</h3>` : ""}
          ${module.description ? `<p class="section-desc">${module.description}</p>` : ""}
        </div>
      </div>
    `;
  }

  function renderDetailCard(card) {
    return `
      <article class="content-card detail-card">
        ${card.kicker ? `<p class="card-kicker">${card.kicker}</p>` : ""}
        <h3 class="card-title">${card.title}</h3>
        ${card.text ? `<p class="card-text">${card.text}</p>` : ""}
        ${renderBulletList(card.bullets)}
      </article>
    `;
  }

  function renderProjectShowcaseCard(item) {
    return `
      <article class="content-card showcase-card">
        ${item.kicker ? `<p class="card-kicker">${item.kicker}</p>` : ""}
        <div class="card-title-row">
          <h3 class="card-title">${item.title}</h3>
          ${item.status ? `<span class="status-badge">${item.status}</span>` : ""}
        </div>
        ${renderProjectMedia(item)}
        <p class="card-text">${item.text}</p>
        ${renderProjectStatusPills(item.statusPills)}
        ${renderBulletList(item.bullets)}
        ${renderProjectActions(item)}
      </article>
    `;
  }

  function renderTimelineItem(item) {
    return `
      <article class="timeline-item">
        <p class="timeline-meta">${item.date}</p>
        <h3 class="card-title">${item.title}</h3>
        <p class="card-text">${item.text}</p>
        ${renderBulletList(item.bullets)}
      </article>
    `;
  }

  function renderStatCard(item) {
    return `
      <article class="content-card stat-card">
        <p class="stat-label">${item.label}</p>
        <p class="stat-value">${item.value}</p>
        <p class="card-text">${item.text}</p>
      </article>
    `;
  }

  function renderContactCard(item) {
    return `
      <article class="content-card contact-card">
        <h3 class="card-title">${item.title}</h3>
        ${item.text ? `<p class="card-text">${item.text}</p>` : ""}
        ${renderBulletList(item.bullets)}
        ${item.contacts && item.contacts.length ? renderContactList(item.contacts) : ""}
      </article>
    `;
  }

  function renderContactList(contacts) {
    return `
      <div class="contact-list">
        ${contacts
          .map(
            (contact) => `
              <div class="contact-row">
                <span class="contact-label">${contact.label}</span>
                <span class="contact-value">${contact.value}</span>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderAction(action) {
    const className = action.ghost ? "ghost-button" : "link-button";

    if (action.modalId) {
      return `<button class="${className}" type="button" data-modal-open="${action.modalId}">${action.label}</button>`;
    }

    if (action.href) {
      return `<a class="${className}" href="${action.href}" target="_blank" rel="noreferrer">${action.label}</a>`;
    }

    if (action.target) {
      return `<button class="${className}" type="button" data-tab-jump="${action.target}">${action.label}</button>`;
    }

    return `<span class="${className}" aria-disabled="true">${action.label}</span>`;
  }

  function renderProjectMedia(item) {
    if (!item.imageSrc && !item.imageLabel) {
      return "";
    }

    return `
      <div class="project-media" data-project-media-shell>
        <img
          class="project-media-image"
          src="${item.imageSrc || ""}"
          alt="${item.imageAlt || item.title}"
          loading="eager"
          decoding="async"
          data-project-media-image
        />
        <div class="project-media-fallback">
          <strong>${item.imageLabel || "替换为真实项目截图"}</strong>
        </div>
      </div>
    `;
  }

  function renderProjectStatusPills(items) {
    if (!items || !items.length) {
      return "";
    }

    return `<div class="pill-row showcase-pill-row">${items.map((item) => `<span class="pill">${item}</span>`).join("")}</div>`;
  }

  function renderProjectActions(item) {
    const actions =
      item.actions && item.actions.length
        ? item.actions
        : item.modalId || item.href || item.linkLabel
          ? [{ label: item.linkLabel || "查看入口", modalId: item.modalId, href: item.href }]
          : [];

    if (!actions.length) {
      return "";
    }

    return `<div class="action-row showcase-actions">${actions.map(renderAction).join("")}</div>`;
  }

  function renderBulletList(items) {
    if (!items || !items.length) {
      return "";
    }

    return `<ul class="bullet-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  }

  function renderExternalLink(href, label) {
    if (!href) {
      return `<span class="link-button" aria-disabled="true">${label || "查看入口"}</span>`;
    }

    return `<a class="link-button" href="${href}" target="_blank" rel="noreferrer">${label}</a>`;
  }

  function renderEntryModal(entryModal) {
    const steps = Array.isArray(entryModal.steps) ? entryModal.steps : [];
    const tips = Array.isArray(entryModal.tips) ? entryModal.tips : [];
    const titleId = `${entryModal.modalId}-title`;

    return `
      <section class="site-modal" data-modal-id="${entryModal.modalId}" aria-hidden="true" hidden>
        <button class="site-modal-backdrop" type="button" data-modal-close tabindex="-1" aria-label="关闭弹层"></button>
        <div class="site-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
          <div class="site-modal-head">
            <div>
              <p class="eyebrow">${entryModal.badge || "查看入口"}</p>
              <h2 class="site-modal-title" id="${titleId}">${entryModal.name}</h2>
              <p class="site-modal-subtitle">${entryModal.subtitle || ""}</p>
            </div>
            <button class="ghost-button site-modal-close" type="button" data-modal-close>关闭</button>
          </div>

          <div class="site-modal-grid">
            <div class="miniapp-qr-panel">
              <div class="miniapp-qr-shell" data-modal-media-shell>
                <img
                  class="miniapp-qr-image"
                  src="${entryModal.mediaSrc || ""}"
                  alt="${entryModal.mediaAlt || entryModal.name}"
                  decoding="async"
                  data-modal-media-image
                />
                <div class="miniapp-qr-fallback">
                  <span class="miniapp-qr-placeholder" aria-hidden="true"></span>
                  <strong>${entryModal.emptyStateTitle || "入口展示"}</strong>
                  <p>${entryModal.emptyStateText || "这里可以展示对应二维码或项目图片。"}</p>
                </div>
              </div>
            </div>

            <div class="miniapp-info-panel">
              <p class="section-desc site-modal-desc">${entryModal.description || ""}</p>
              ${
                steps.length
                  ? `<ol class="miniapp-step-list">${steps
                      .map((step) => `<li class="miniapp-step-item">${step}</li>`)
                      .join("")}</ol>`
                  : ""
              }
              ${
                tips.length
                  ? `<div class="miniapp-tip-grid">${tips
                      .map(
                        (tip) => `
                          <article class="miniapp-tip-card">
                            <p class="miniapp-tip-title">${tip.title}</p>
                            <p class="card-text">${tip.text}</p>
                          </article>
                        `
                      )
                      .join("")}</div>`
                  : ""
              }
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function loadCoreStage3DModule() {
    if (!coreStage3DModulePromise) {
      coreStage3DModulePromise = import("./assets/core-stage-3d.js");
    }

    return coreStage3DModulePromise;
  }

  function createCoreStageRenderer(stage, canvas, options) {
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    const media = stage.querySelector("[data-core-stage-flow]");
    const pointerState = {
      currentX: 0,
      currentY: 0,
      currentIntensity: 0,
      targetX: 0,
      targetY: 0,
      targetIntensity: 0
    };
    const state = {
      width: 0,
      height: 0,
      dpr: 1,
      frameId: 0,
      resizeObserver: null,
      interactive: options.interactive,
      reducedMotion: options.reducedMotion,
      compact: false,
      config: null,
      startTime: performance.now()
    };

    function buildConfig(width, height) {
      const compact = options.coarsePointer || width < 520;
      const maxRadius = Math.min(width * (compact ? 0.255 : 0.282), height * (compact ? 0.3 : 0.34));

      return {
        compact,
        pathSamples: compact ? 74 : 110,
        surfaceSamples: compact ? 28 : 44,
        streamSamples: compact ? 20 : 34,
        causticBlobs: compact ? 4 : 8,
        shimmerBands: compact ? 3 : 6,
        maxRadius,
        neckRadius: maxRadius * (compact ? 0.148 : 0.136),
        liquidScale: compact ? 0.926 : 0.936,
        shellScale: compact ? 1.004 : 1.01,
        outerShellScale: compact ? 1.016 : 1.024,
        topSurfaceProgress: compact ? 0.308 : 0.298,
        bottomSurfaceProgress: compact ? 0.704 : 0.692
      };
    }

    function setStageGlow(percentX, percentY, intensity) {
      stage.style.setProperty("--stage-glow-x", `${percentX.toFixed(2)}%`);
      stage.style.setProperty("--stage-glow-y", `${percentY.toFixed(2)}%`);
      stage.style.setProperty("--flow-glow-x", `${(50 + (percentX - 50) * 0.55).toFixed(2)}%`);
      stage.style.setProperty("--flow-glow-y", `${(50 + (percentY - 50) * 0.55).toFixed(2)}%`);
      stage.style.setProperty("--flow-glow-opacity", (0.7 + intensity * 0.24).toFixed(2));
      stage.style.setProperty("--cursor-x", `${percentX.toFixed(2)}%`);
      stage.style.setProperty("--cursor-y", `${percentY.toFixed(2)}%`);
      stage.style.setProperty("--cursor-opacity", intensity > 0.02 ? (0.12 + intensity * 0.34).toFixed(2) : "0");
    }

    function resetStageGlow() {
      setStageGlow(52, 48, 0);
    }

    function resize() {
      const rect = (media || canvas).getBoundingClientRect();
      const nextWidth = Math.max(Math.round(rect.width), 320);
      const nextHeight = Math.max(Math.round(rect.height), 260);
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);

      if (nextWidth === state.width && nextHeight === state.height && nextDpr === state.dpr) {
        return;
      }

      state.width = nextWidth;
      state.height = nextHeight;
      state.dpr = nextDpr;
      state.config = buildConfig(nextWidth, nextHeight);
      state.compact = state.config.compact;

      canvas.width = Math.round(nextWidth * nextDpr);
      canvas.height = Math.round(nextHeight * nextDpr);
      canvas.style.width = `${nextWidth}px`;
      canvas.style.height = `${nextHeight}px`;
    }

    function getHourglassY(progress) {
      return state.height * 0.072 + (state.height * 0.856) * progress;
    }

    function getHalfWidth(progress, scale) {
      const distance = Math.abs(progress - 0.5) / 0.5;
      const eased = Math.pow(distance, 0.62);
      const shoulderLift = 0.94 + 0.12 * Math.sin(distance * Math.PI * 0.9);
      return (state.config.neckRadius + (state.config.maxRadius - state.config.neckRadius) * eased) * shoulderLift * scale;
    }

    function traceHourglass(scale) {
      const centerX = state.width * 0.5;
      const points = state.config.pathSamples;

      context.beginPath();

      for (let index = 0; index <= points; index += 1) {
        const progress = index / points;
        const x = centerX - getHalfWidth(progress, scale);
        const y = getHourglassY(progress);

        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      for (let index = points; index >= 0; index -= 1) {
        const progress = index / points;
        const x = centerX + getHalfWidth(progress, scale);
        const y = getHourglassY(progress);
        context.lineTo(x, y);
      }

      context.closePath();
    }

    function tracePoints(points) {
      points.forEach(function (point, index) {
        if (index === 0) {
          context.moveTo(point.x, point.y);
        } else {
          context.lineTo(point.x, point.y);
        }
      });
    }

    function traceTopLiquid(points) {
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(state.width, 0);
      context.lineTo(points[points.length - 1].x, points[points.length - 1].y);

      for (let index = points.length - 2; index >= 0; index -= 1) {
        context.lineTo(points[index].x, points[index].y);
      }

      context.closePath();
    }

    function traceBottomLiquid(points) {
      context.beginPath();
      context.moveTo(0, state.height);
      context.lineTo(state.width, state.height);
      context.lineTo(points[points.length - 1].x, points[points.length - 1].y);

      for (let index = points.length - 2; index >= 0; index -= 1) {
        context.lineTo(points[index].x, points[index].y);
      }

      context.closePath();
    }

    function traceRibbon(points, widths) {
      const left = [];
      const right = [];

      points.forEach(function (point, index) {
        const previous = points[index === 0 ? index : index - 1];
        const next = points[index === points.length - 1 ? index : index + 1];
        const tangentX = next.x - previous.x;
        const tangentY = next.y - previous.y;
        const length = Math.hypot(tangentX, tangentY) || 1;
        const normalX = -tangentY / length;
        const normalY = tangentX / length;
        const width = widths[index];

        left.push({
          x: point.x + normalX * width,
          y: point.y + normalY * width
        });
        right.push({
          x: point.x - normalX * width,
          y: point.y - normalY * width
        });
      });

      context.beginPath();
      tracePoints(left);

      for (let index = right.length - 1; index >= 0; index -= 1) {
        context.lineTo(right[index].x, right[index].y);
      }

      context.closePath();
    }

    function fillEllipseGradient(x, y, radiusX, radiusY, colorStops, opacity) {
      const safeRadiusX = Math.max(radiusX, 1);
      const safeRadiusY = Math.max(radiusY, 1);

      context.save();
      context.translate(x, y);
      context.scale(1, safeRadiusY / safeRadiusX);

      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, safeRadiusX);
      colorStops.forEach(function (stop) {
        gradient.addColorStop(stop.position, stop.color);
      });

      context.globalAlpha = opacity;
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(0, 0, safeRadiusX, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    function drawBackdrop(time, flowShiftX, flowShiftY) {
      const centerX = state.width * 0.5 + flowShiftX * 0.18;
      const centerY = state.height * 0.5 + flowShiftY * 0.12;
      const pulse = 0.09 + 0.02 * Math.sin(time * 0.0018);
      const haloGradient = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        state.width * 0.42
      );

      haloGradient.addColorStop(0, "rgba(214, 244, 255, 0.16)");
      haloGradient.addColorStop(0.24, "rgba(125, 203, 255, 0.1)");
      haloGradient.addColorStop(0.62, `rgba(56, 124, 255, ${pulse.toFixed(3)})`);
      haloGradient.addColorStop(1, "rgba(4, 11, 24, 0)");

      context.fillStyle = haloGradient;
      context.fillRect(0, 0, state.width, state.height);

      fillEllipseGradient(
        centerX,
        state.height * 0.74,
        state.config.maxRadius * 0.92,
        state.config.maxRadius * 0.38,
        [
          { position: 0, color: "rgba(120, 197, 255, 0.12)" },
          { position: 0.48, color: "rgba(43, 94, 190, 0.08)" },
          { position: 1, color: "rgba(4, 11, 24, 0)" }
        ],
        0.9
      );
    }

    function strokeCurrentPath(color, lineWidth, shadowBlur) {
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.shadowColor = shadowBlur ? color : "transparent";
      context.shadowBlur = shadowBlur;
      context.stroke();
      context.shadowBlur = 0;
    }

    function buildSurfacePoints(baseProgress, amplitude, time, flowShiftX, flowShiftY, region) {
      const centerX = state.width * 0.5;
      const points = [];
      const localWidth = getHalfWidth(baseProgress, state.config.liquidScale * 1.012);
      const baseY = getHourglassY(baseProgress);
      const phase = region === "top" ? 0.6 : 2.3;

      for (let sample = 0; sample <= state.config.surfaceSamples; sample += 1) {
        const ratio = sample / state.config.surfaceSamples;
        const unit = -1 + ratio * 2;
        const edgeMask = 1 - Math.pow(Math.abs(unit), 1.72);
        const primaryWave = Math.sin(unit * 2.8 + time * 0.00125 + phase) * amplitude * edgeMask;
        const secondaryWave = Math.sin(unit * 5.9 - time * 0.00145 + phase * 1.2) * amplitude * 0.28 * edgeMask;
        const centerPocket =
          Math.exp(-Math.pow(unit / 0.22, 2)) *
          (region === "top" ? 1.65 + Math.sin(time * 0.0038) * 0.45 : 3.05 + Math.sin(time * 0.0046) * 0.72);
        const pullTilt = -flowShiftX * 0.038 * unit * edgeMask;
        const verticalPull = flowShiftY * 0.014 * edgeMask;
        const x = centerX + unit * localWidth + flowShiftX * edgeMask * 0.024;
        const y = baseY + primaryWave + secondaryWave + centerPocket + pullTilt + verticalPull;

        points.push({ x, y });
      }

      return points;
    }

    function getSurfaceCenter(points) {
      return points[Math.floor(points.length / 2)];
    }

    function drawGlassReflections(time, flowShiftX, flowShiftY) {
      const centerX = state.width * 0.5;
      const topY = getHourglassY(0.1);
      const bottomY = getHourglassY(0.9);

      context.save();
      traceHourglass(state.config.shellScale);
      context.clip();

      const sideShade = context.createLinearGradient(centerX - state.config.maxRadius, 0, centerX + state.config.maxRadius, 0);
      sideShade.addColorStop(0, "rgba(3, 8, 18, 0.22)");
      sideShade.addColorStop(0.12, "rgba(255, 255, 255, 0.03)");
      sideShade.addColorStop(0.32, "rgba(255, 255, 255, 0)");
      sideShade.addColorStop(0.68, "rgba(255, 255, 255, 0)");
      sideShade.addColorStop(0.88, "rgba(255, 255, 255, 0.04)");
      sideShade.addColorStop(1, "rgba(3, 8, 18, 0.24)");
      context.fillStyle = sideShade;
      context.fillRect(0, 0, state.width, state.height);

      context.globalCompositeOperation = "screen";

      fillEllipseGradient(
        centerX - state.config.maxRadius * 0.34 + flowShiftX * 0.04,
        topY + state.config.maxRadius * 0.14,
        state.config.maxRadius * 0.26,
        state.config.maxRadius * 0.64,
        [
          { position: 0, color: "rgba(255, 255, 255, 0.16)" },
          { position: 0.42, color: "rgba(213, 239, 255, 0.08)" },
          { position: 1, color: "rgba(255, 255, 255, 0)" }
        ],
        1
      );

      fillEllipseGradient(
        centerX + state.config.maxRadius * 0.28,
        bottomY - state.config.maxRadius * 0.18 + flowShiftY * 0.04,
        state.config.maxRadius * 0.22,
        state.config.maxRadius * 0.58,
        [
          { position: 0, color: "rgba(255, 255, 255, 0.12)" },
          { position: 0.48, color: "rgba(173, 221, 255, 0.08)" },
          { position: 1, color: "rgba(255, 255, 255, 0)" }
        ],
        1
      );

      const sheenGradient = context.createLinearGradient(centerX - state.config.maxRadius * 0.66, 0, centerX - state.config.maxRadius * 0.16, 0);
      sheenGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
      sheenGradient.addColorStop(0.46, "rgba(255, 255, 255, 0.1)");
      sheenGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      context.fillStyle = sheenGradient;
      context.fillRect(0, 0, state.width, state.height);

      context.restore();
      context.globalCompositeOperation = "source-over";
    }

    function drawSurfaceStroke(points, shadowStrength) {
      context.beginPath();
      tracePoints(points);
      strokeCurrentPath("rgba(236, 248, 255, 0.62)", 1.35, shadowStrength);
      context.beginPath();
      tracePoints(points);
      strokeCurrentPath("rgba(118, 202, 255, 0.2)", 3.4, 16);
    }

    function drawLiquidBands(region, time, flowShiftX, flowShiftY, topLimit, bottomLimit) {
      const centerX = state.width * 0.5;
      const count = state.config.shimmerBands;

      for (let index = 0; index < count; index += 1) {
        const ratio = (index + 1) / (count + 1);
        const anchorY = lerp(topLimit, bottomLimit, ratio);
        const swing = Math.sin(time * 0.0012 + index * 0.72 + (region === "top" ? 0 : 1.2)) * state.config.maxRadius * 0.08;
        const width = state.config.maxRadius * (region === "top" ? 1.08 : 1.14);
        const drift = flowShiftX * (0.16 + ratio * 0.18);

        context.beginPath();
        context.moveTo(centerX - width * 0.86 + drift, anchorY + swing * 0.22);
        context.bezierCurveTo(
          centerX - width * 0.42 + drift,
          anchorY - swing * 0.56 - 6,
          centerX + width * 0.18 + drift,
          anchorY + swing * 0.34 + 5,
          centerX + width * 0.88 + drift,
          anchorY - swing * 0.22
        );

        context.strokeStyle = region === "top" ? "rgba(232, 246, 255, 0.072)" : "rgba(220, 240, 255, 0.082)";
        context.lineWidth = state.compact ? 8 + index * 0.6 : 12 + index * 0.8;
        context.shadowColor = "rgba(210, 241, 255, 0.12)";
        context.shadowBlur = state.compact ? 10 : 16;
        context.stroke();
        context.shadowBlur = 0;

        fillEllipseGradient(
          centerX + Math.sin(time * 0.001 + index * 1.8) * state.config.maxRadius * 0.34 + flowShiftX * 0.22,
          anchorY + Math.cos(time * 0.0016 + index * 1.2) * 7 + flowShiftY * 0.06,
          state.config.maxRadius * (region === "top" ? 0.16 : 0.19),
          state.config.maxRadius * 0.08,
          [
            { position: 0, color: "rgba(236, 248, 255, 0.14)" },
            { position: 0.55, color: "rgba(144, 206, 255, 0.08)" },
            { position: 1, color: "rgba(236, 248, 255, 0)" }
          ],
          0.9
        );
      }
    }

    function drawTopLiquid(surfacePoints, time, flowShiftX, flowShiftY) {
      const centerSurface = getSurfaceCenter(surfacePoints);
      const liquidTop = getHourglassY(0.055);

      context.save();
      traceTopLiquid(surfacePoints);
      context.clip();

      const topGradient = context.createLinearGradient(0, liquidTop, 0, centerSurface.y + 24);
      topGradient.addColorStop(0, "rgba(223, 244, 255, 0.36)");
      topGradient.addColorStop(0.28, "rgba(127, 195, 240, 0.3)");
      topGradient.addColorStop(0.62, "rgba(78, 136, 214, 0.42)");
      topGradient.addColorStop(1, "rgba(30, 72, 160, 0.54)");
      context.fillStyle = topGradient;
      context.fillRect(0, 0, state.width, centerSurface.y + 40);

      fillEllipseGradient(
        state.width * 0.5 - state.config.maxRadius * 0.2 + flowShiftX * 0.22,
        getHourglassY(0.17) + flowShiftY * 0.05,
        state.config.maxRadius * 0.88,
        state.config.maxRadius * 0.62,
        [
          { position: 0, color: "rgba(238, 248, 255, 0.18)" },
          { position: 0.46, color: "rgba(143, 205, 255, 0.1)" },
          { position: 1, color: "rgba(50, 112, 198, 0)" }
        ],
        1
      );

      context.globalCompositeOperation = "screen";
      drawLiquidBands("top", time, flowShiftX, flowShiftY, liquidTop + 18, centerSurface.y - 14);

      for (let index = 0; index < state.config.causticBlobs; index += 1) {
        const x =
          state.width * 0.5 +
          Math.sin(time * 0.001 + index * 0.92) * state.config.maxRadius * 0.42 +
          flowShiftX * 0.18;
        const y =
          getHourglassY(0.13 + index * 0.028) +
          Math.cos(time * 0.0015 + index * 1.16) * 7 +
          flowShiftY * 0.04;

        fillEllipseGradient(
          x,
          y,
          state.config.maxRadius * (0.14 + (index % 3) * 0.028),
          state.config.maxRadius * 0.08,
          [
            { position: 0, color: "rgba(245, 252, 255, 0.12)" },
            { position: 0.58, color: "rgba(168, 220, 255, 0.06)" },
            { position: 1, color: "rgba(245, 252, 255, 0)" }
          ],
          0.95
        );
      }

      context.restore();
      context.globalCompositeOperation = "source-over";
      drawSurfaceStroke(surfacePoints, 12);
    }

    function drawBottomRipples(surfaceCenter, time, flowShiftX) {
      const rippleCount = state.compact ? 2 : 3;

      for (let index = 0; index < rippleCount; index += 1) {
        const pulse = (time * 0.0018 + index * 0.62) % 1;
        const radiusX = state.config.neckRadius * (1.35 + pulse * (1.45 + index * 0.2));
        const radiusY = state.config.neckRadius * (0.26 + pulse * 0.34);
        const opacity = 0.12 * (1 - pulse) + 0.03;

        context.beginPath();
        context.ellipse(
          surfaceCenter.x + flowShiftX * 0.16,
          surfaceCenter.y + 8 + index * 1.5,
          radiusX,
          radiusY,
          0,
          0,
          Math.PI * 2
        );
        context.strokeStyle = `rgba(232, 247, 255, ${opacity.toFixed(3)})`;
        context.lineWidth = 1.2;
        context.shadowColor = "rgba(188, 231, 255, 0.18)";
        context.shadowBlur = 10;
        context.stroke();
        context.shadowBlur = 0;
      }
    }

    function drawBottomLiquid(surfacePoints, time, flowShiftX, flowShiftY) {
      const centerSurface = getSurfaceCenter(surfacePoints);
      const liquidBottom = getHourglassY(0.95);

      context.save();
      traceBottomLiquid(surfacePoints);
      context.clip();

      const bottomGradient = context.createLinearGradient(0, centerSurface.y, 0, liquidBottom + 20);
      bottomGradient.addColorStop(0, "rgba(171, 219, 255, 0.34)");
      bottomGradient.addColorStop(0.22, "rgba(116, 179, 235, 0.36)");
      bottomGradient.addColorStop(0.58, "rgba(67, 118, 212, 0.46)");
      bottomGradient.addColorStop(1, "rgba(22, 52, 132, 0.68)");
      context.fillStyle = bottomGradient;
      context.fillRect(0, centerSurface.y - 10, state.width, state.height);

      fillEllipseGradient(
        centerSurface.x + flowShiftX * 0.24,
        centerSurface.y + 18 + flowShiftY * 0.08,
        state.config.maxRadius * 0.54,
        state.config.maxRadius * 0.28,
        [
          { position: 0, color: "rgba(244, 251, 255, 0.22)" },
          { position: 0.38, color: "rgba(162, 219, 255, 0.12)" },
          { position: 1, color: "rgba(32, 88, 184, 0)" }
        ],
        1
      );

      fillEllipseGradient(
        state.width * 0.5,
        getHourglassY(0.83),
        state.config.maxRadius * 0.9,
        state.config.maxRadius * 0.54,
        [
          { position: 0, color: "rgba(222, 244, 255, 0.1)" },
          { position: 0.4, color: "rgba(106, 169, 233, 0.08)" },
          { position: 1, color: "rgba(22, 52, 132, 0)" }
        ],
        0.9
      );

      context.globalCompositeOperation = "screen";
      drawLiquidBands("bottom", time, flowShiftX, flowShiftY, centerSurface.y + 14, liquidBottom - 14);

      for (let index = 0; index < state.config.causticBlobs; index += 1) {
        const x =
          state.width * 0.5 +
          Math.sin(time * 0.00086 + index * 1.24) * state.config.maxRadius * 0.48 +
          flowShiftX * 0.22;
        const y =
          getHourglassY(0.74 + index * 0.024) +
          Math.cos(time * 0.00118 + index * 1.44) * 9 +
          flowShiftY * 0.04;

        fillEllipseGradient(
          x,
          y,
          state.config.maxRadius * (0.15 + (index % 3) * 0.03),
          state.config.maxRadius * 0.09,
          [
            { position: 0, color: "rgba(246, 252, 255, 0.13)" },
            { position: 0.55, color: "rgba(170, 222, 255, 0.08)" },
            { position: 1, color: "rgba(246, 252, 255, 0)" }
          ],
          1
        );
      }

      drawBottomRipples(centerSurface, time, flowShiftX);
      context.restore();
      context.globalCompositeOperation = "source-over";
      drawSurfaceStroke(surfacePoints, 14);
    }

    function drawStream(time, flowShiftX, flowShiftY, bottomSurfacePoints) {
      const centerX = state.width * 0.5;
      const streamStartY = getHourglassY(0.47);
      const surfaceCenter = getSurfaceCenter(bottomSurfacePoints);
      const streamEndY = surfaceCenter.y + 5;
      const points = [];
      const widths = [];

      for (let sample = 0; sample <= state.config.streamSamples; sample += 1) {
        const ratio = sample / state.config.streamSamples;
        const sway =
          Math.sin(ratio * 5.4 - time * 0.0052) * (1.2 + ratio * 2.2) +
          Math.sin(ratio * 12.2 + time * 0.0021) * 0.8;
        const x =
          centerX +
          flowShiftX * (0.08 + ratio * 0.28) +
          sway +
          Math.sin(time * 0.0018 + ratio * 6) * 0.55;
        const y = lerp(streamStartY, streamEndY, ratio) + flowShiftY * (0.008 + ratio * 0.025);

        points.push({ x, y });
        widths.push(lerp(state.config.neckRadius * 0.56, state.config.neckRadius * 0.24, ratio));
      }

      context.save();
      traceHourglass(state.config.liquidScale * 0.992);
      context.clip();

      traceRibbon(points, widths);
      const streamGradient = context.createLinearGradient(centerX, streamStartY, centerX, streamEndY);
      streamGradient.addColorStop(0, "rgba(219, 244, 255, 0.4)");
      streamGradient.addColorStop(0.32, "rgba(156, 217, 255, 0.48)");
      streamGradient.addColorStop(0.7, "rgba(88, 157, 239, 0.54)");
      streamGradient.addColorStop(1, "rgba(229, 248, 255, 0.34)");
      context.fillStyle = streamGradient;
      context.shadowColor = "rgba(210, 241, 255, 0.22)";
      context.shadowBlur = 18;
      context.fill();
      context.shadowBlur = 0;

      context.beginPath();
      tracePoints(points);
      context.strokeStyle = "rgba(245, 252, 255, 0.8)";
      context.lineWidth = 1.5;
      context.shadowColor = "rgba(227, 247, 255, 0.24)";
      context.shadowBlur = 14;
      context.stroke();
      context.shadowBlur = 0;

      fillEllipseGradient(
        centerX + flowShiftX * 0.16,
        streamStartY + 8,
        state.config.neckRadius * 1.36,
        state.config.neckRadius * 0.68,
        [
          { position: 0, color: "rgba(244, 252, 255, 0.16)" },
          { position: 0.56, color: "rgba(150, 220, 255, 0.12)" },
          { position: 1, color: "rgba(244, 252, 255, 0)" }
        ],
        1
      );

      context.restore();
    }

    function drawGlassShell(time, flowShiftX, flowShiftY) {
      const centerX = state.width * 0.5;
      const waistY = getHourglassY(0.5);

      drawGlassReflections(time, flowShiftX, flowShiftY);

      context.save();
      traceHourglass(state.config.outerShellScale);
      strokeCurrentPath("rgba(241, 249, 255, 0.34)", 1.8, 18);
      context.restore();

      context.save();
      traceHourglass(state.config.shellScale);
      strokeCurrentPath("rgba(178, 224, 255, 0.16)", 1.08, 0);
      context.restore();

      context.save();
      traceHourglass(state.config.liquidScale + 0.024);
      strokeCurrentPath("rgba(255, 255, 255, 0.08)", 0.7, 0);
      context.restore();

      fillEllipseGradient(
        centerX,
        waistY,
        state.config.neckRadius * 2.2,
        state.config.neckRadius * 1.08,
        [
          { position: 0, color: "rgba(234, 247, 255, 0.14)" },
          { position: 0.58, color: "rgba(146, 209, 255, 0.1)" },
          { position: 1, color: "rgba(234, 247, 255, 0)" }
        ],
        1
      );
    }

    function renderFrame(timestamp) {
      const time = (timestamp - state.startTime) * (state.reducedMotion ? 0.42 : 1);
      const smoothing = state.reducedMotion ? 0.045 : 0.085;

      pointerState.currentX = lerp(pointerState.currentX, pointerState.targetX, smoothing);
      pointerState.currentY = lerp(pointerState.currentY, pointerState.targetY, smoothing);
      pointerState.currentIntensity = lerp(pointerState.currentIntensity, pointerState.targetIntensity, smoothing);

      const autoShiftX = state.interactive ? 0 : Math.sin(time * 0.001) * state.width * 0.01;
      const autoShiftY = state.interactive ? 0 : Math.cos(time * 0.00082) * state.height * 0.006;
      const flowShiftX = pointerState.currentX * pointerState.currentIntensity * state.width * 0.055 + autoShiftX;
      const flowShiftY = pointerState.currentY * pointerState.currentIntensity * state.height * 0.028 + autoShiftY;
      const topSurfacePoints = buildSurfacePoints(
        state.config.topSurfaceProgress,
        state.compact ? 4.6 : 6.4,
        time,
        flowShiftX,
        flowShiftY,
        "top"
      );
      const bottomSurfacePoints = buildSurfacePoints(
        state.config.bottomSurfaceProgress,
        state.compact ? 5.1 : 7.3,
        time,
        flowShiftX,
        flowShiftY,
        "bottom"
      );

      context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      context.clearRect(0, 0, state.width, state.height);

      drawBackdrop(time, flowShiftX, flowShiftY);

      context.save();
      traceHourglass(state.config.liquidScale);
      context.clip();
      drawTopLiquid(topSurfacePoints, time, flowShiftX, flowShiftY);
      drawBottomLiquid(bottomSurfacePoints, time, flowShiftX, flowShiftY);
      drawStream(time, flowShiftX, flowShiftY, bottomSurfacePoints);
      context.restore();

      drawGlassShell(time, flowShiftX, flowShiftY);

      const percentX = 50 + pointerState.currentX * pointerState.currentIntensity * 18;
      const percentY = 50 + pointerState.currentY * pointerState.currentIntensity * 14;
      setStageGlow(percentX, percentY, pointerState.currentIntensity);

      state.frameId = window.requestAnimationFrame(renderFrame);
    }

    function updatePointer(event) {
      if (!state.interactive || event.pointerType === "touch") {
        return;
      }

      const rect = stage.getBoundingClientRect();
      const paddingX = rect.width * 0.28;
      const paddingY = rect.height * 0.22;
      const expandedLeft = rect.left - paddingX;
      const expandedRight = rect.right + paddingX;
      const expandedTop = rect.top - paddingY;
      const expandedBottom = rect.bottom + paddingY;

      if (
        event.clientX < expandedLeft ||
        event.clientX > expandedRight ||
        event.clientY < expandedTop ||
        event.clientY > expandedBottom
      ) {
        pointerState.targetX = 0;
        pointerState.targetY = 0;
        pointerState.targetIntensity = 0;
        resetStageGlow();
        return;
      }

      const percentX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const percentY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;
      const deltaX = clamp((event.clientX - centerX) / (rect.width * 0.5 + paddingX), -1, 1);
      const deltaY = clamp((event.clientY - centerY) / (rect.height * 0.5 + paddingY), -1, 1);
      const distance = Math.hypot(deltaX, deltaY);
      const intensity = clamp(1 - distance, 0, 1);

      pointerState.targetX = deltaX;
      pointerState.targetY = deltaY;
      pointerState.targetIntensity = intensity;
      setStageGlow(percentX * 100, percentY * 100, intensity);
    }

    function handlePointerLeave() {
      pointerState.targetX = 0;
      pointerState.targetY = 0;
      pointerState.targetIntensity = 0;
      resetStageGlow();
    }

    function start() {
      resize();
      resetStageGlow();

      if (state.interactive) {
        window.addEventListener("pointermove", updatePointer);
        document.addEventListener("mouseleave", handlePointerLeave);
      }

      window.addEventListener("resize", resize);

      if (typeof ResizeObserver === "function") {
        state.resizeObserver = new ResizeObserver(resize);
        state.resizeObserver.observe(media || stage);
      }

      state.frameId = window.requestAnimationFrame(renderFrame);
    }

    function destroy() {
      window.cancelAnimationFrame(state.frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", updatePointer);
      document.removeEventListener("mouseleave", handlePointerLeave);

      if (state.resizeObserver) {
        state.resizeObserver.disconnect();
        state.resizeObserver = null;
      }

      resetStageGlow();
      context.clearRect(0, 0, state.width, state.height);
    }

    return {
      start,
      destroy
    };
  }

  async function setupCoreStage() {
    const stage = document.querySelector("[data-core-stage]");
    if (!stage) {
      return;
    }

    const loadToken = (stage.__coreStageLoadToken || 0) + 1;
    stage.__coreStageLoadToken = loadToken;

    if (stage.__coreStageRenderer && typeof stage.__coreStageRenderer.destroy === "function") {
      stage.__coreStageRenderer.destroy();
    }

    stage.__coreStageRenderer = null;
    stage.classList.remove("is-core-fallback", "is-core-rendered", "is-core-static");

    function useStaticMode() {
      stage.classList.remove("is-core-rendered", "is-core-fallback");
      stage.classList.add("is-core-static");
    }

    const canvas = stage.querySelector("[data-core-stage-canvas]");
    if (!canvas || typeof canvas.getContext !== "function") {
      stage.classList.add("is-core-fallback");
      return;
    }

    if (window.location.protocol === "file:") {
      useStaticMode();
      return;
    }

    let module;
    try {
      module = await loadCoreStage3DModule();
    } catch (error) {
      console.error(error);
      useStaticMode();
      return;
    }

    if (stage.__coreStageLoadToken !== loadToken || !module || typeof module.createCoreStageRenderer !== "function") {
      return;
    }

    const renderer = module.createCoreStageRenderer(stage, canvas, {
      coarsePointer: window.matchMedia("(pointer: coarse)").matches,
      interactive: !window.matchMedia("(pointer: coarse)").matches,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
    });

    if (!renderer || typeof renderer.start !== "function") {
      useStaticMode();
      return;
    }

    try {
      stage.classList.remove("is-core-fallback", "is-core-static");
      stage.classList.add("is-core-rendered");
      stage.__coreStageRenderer = renderer;
      renderer.start();
    } catch (error) {
      console.error(error);
      if (stage.__coreStageRenderer && typeof stage.__coreStageRenderer.destroy === "function") {
        stage.__coreStageRenderer.destroy();
      }
      stage.__coreStageRenderer = null;
      useStaticMode();
    }
  }

  function setupStarfield() {
    const starfield = document.getElementById("starfield");
    const glowOverlay = document.getElementById("star-glow-overlay");
    if (!starfield || !glowOverlay) {
      return;
    }

    let stars = [];
    let activeX = -1000;
    let activeY = -1000;
    let hasPointer = false;
    const glowRadius = 128;

    function createStar() {
      const star = document.createElement("span");
      const sizeSeed = Math.random();
      let size = 1.6 + Math.random() * 2.3;

      if (sizeSeed > 0.72) {
        size = 3 + Math.random() * 2.2;
      }

      if (sizeSeed > 0.92) {
        size = 4.8 + Math.random() * 2.6;
      }

      const opacity = 0.42 + Math.random() * 0.58;

      star.className = "star";
      const isCross = Math.random() > 0.84;
      if (isCross) {
        star.classList.add("star-cross");
      }

      const glowStar = document.createElement("span");
      glowStar.className = "glow-star";
      if (isCross) {
        glowStar.classList.add("glow-star-cross");
      }

      star.style.setProperty("--size", `${size.toFixed(2)}px`);
      star.style.setProperty("--opacity", opacity.toFixed(2));
      star.style.opacity = opacity.toFixed(2);
      glowStar.style.setProperty("--size", `${size.toFixed(2)}px`);

      return {
        element: star,
        glowElement: glowStar,
        size,
        baseOpacity: opacity,
        anchorX: Math.random() * window.innerWidth,
        anchorY: Math.random() * window.innerHeight,
        driftRadiusX: 8 + Math.random() * 22,
        driftRadiusY: 8 + Math.random() * 20,
        driftSpeed: 0.16 + Math.random() * 0.22,
        driftPhaseX: Math.random() * Math.PI * 2,
        driftPhaseY: Math.random() * Math.PI * 2,
        twinkleSpeed: 2.2 + Math.random() * 2.6,
        twinklePhase: Math.random() * Math.PI * 2
      };
    }

    function renderStars() {
      const fragment = document.createDocumentFragment();
      const glowFragment = document.createDocumentFragment();
      const width = window.innerWidth;
      const starCount = width < 640 ? 80 : width < 1080 ? 127 : 187;

      starfield.innerHTML = "";
      glowOverlay.innerHTML = "";
      stars = [];

      for (let i = 0; i < starCount; i += 1) {
        const starData = createStar();
        stars.push(starData);
        fragment.appendChild(starData.element);
        glowFragment.appendChild(starData.glowElement);
      }

      starfield.appendChild(fragment);
      glowOverlay.appendChild(glowFragment);
    }

    function animateStars(now) {
      const time = now / 1000;

      stars.forEach((star) => {
        const driftX =
          Math.sin(time * star.driftSpeed + star.driftPhaseX) * star.driftRadiusX +
          Math.cos(time * star.driftSpeed * 0.62 + star.driftPhaseY) * star.driftRadiusX * 0.35;
        const driftY =
          Math.cos(time * star.driftSpeed * 0.84 + star.driftPhaseY) * star.driftRadiusY +
          Math.sin(time * star.driftSpeed * 0.54 + star.driftPhaseX) * star.driftRadiusY * 0.28;

        const x = star.anchorX + driftX;
        const y = star.anchorY + driftY;

        const twinkleWave = (Math.sin(time * star.twinkleSpeed + star.twinklePhase) + 1) / 2;
        const flicker = Math.pow(twinkleWave, 1.28);
        let opacity = Math.min(1, star.baseOpacity * (0.5 + flicker * 0.9));
        let scale = 0.76 + flicker * 0.92;
        let shadowStrength = 0.18 + flicker * 0.28;
        let illuminated = false;
        let haloStrength = 0;

        if (hasPointer) {
          const distance = Math.hypot(x - activeX, y - activeY);
          if (distance <= glowRadius) {
            illuminated = true;
            haloStrength = 1 - distance / glowRadius;
            opacity = 1;
            scale = Math.max(scale, 1.72 + haloStrength * 0.42);
            shadowStrength = 0.64 + haloStrength * 0.36;
          }
        }

        star.element.style.opacity = opacity.toFixed(3);
        star.element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
        star.element.style.boxShadow = illuminated
          ? `0 0 ${(star.size * (6.8 + haloStrength * 2.6)).toFixed(2)}px rgba(232, 249, 255, ${shadowStrength.toFixed(2)}), 0 0 ${(star.size * (12.5 + haloStrength * 5.5)).toFixed(2)}px rgba(92, 239, 255, ${(0.34 + haloStrength * 0.32).toFixed(2)})`
          : `0 0 ${(star.size * 4.2).toFixed(2)}px rgba(198, 225, 255, ${shadowStrength.toFixed(2)})`;
        star.element.classList.toggle("is-illuminated", illuminated);

        if (illuminated) {
          star.glowElement.style.opacity = (0.38 + haloStrength * 0.62).toFixed(3);
          star.glowElement.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${(1.15 + haloStrength * 0.45).toFixed(3)})`;
          star.glowElement.style.boxShadow = `0 0 ${(star.size * (8.4 + haloStrength * 3.2)).toFixed(2)}px rgba(240, 252, 255, ${(0.72 + haloStrength * 0.2).toFixed(2)}), 0 0 ${(star.size * (16 + haloStrength * 6)).toFixed(2)}px rgba(76, 236, 255, ${(0.42 + haloStrength * 0.3).toFixed(2)})`;
        } else {
          star.glowElement.style.opacity = "0";
        }
      });

      window.requestAnimationFrame(animateStars);
    }

    let resizeTimer = 0;
    renderStars();
    window.requestAnimationFrame(animateStars);

    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(renderStars, 140);
    });

    window.addEventListener("pointermove", function (event) {
      if (event.pointerType === "touch") {
        return;
      }

      activeX = event.clientX;
      activeY = event.clientY;
      hasPointer = true;
    });

    document.addEventListener("mouseleave", function () {
      hasPointer = false;
    });

    window.addEventListener("blur", function () {
      hasPointer = false;
    });
  }

  function setupCursorGlow() {
    const cursorGlow = document.getElementById("cursor-glow");
    if (!cursorGlow || window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    window.addEventListener("pointermove", function (event) {
      if (event.pointerType === "touch") {
        return;
      }

      document.body.classList.add("has-pointer");
      cursorGlow.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
    });

    document.addEventListener("mouseleave", function () {
      document.body.classList.remove("has-pointer");
    });

    window.addEventListener("blur", function () {
      document.body.classList.remove("has-pointer");
    });
  }
})();
