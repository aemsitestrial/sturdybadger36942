import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * 生成圖片 HTML
 * @param {string} src - 圖片來源 URL
 * @param {string} alt - 替代文字
 * @param {boolean} eager - 是否立即載入
 * @returns {string} picture HTML 字串
 */
function generatePictureHTML(src, alt = '', eager = false) {
  // 判斷是否為外部 delivery URL
  const isExternalUrl = src.includes('delivery-') && src.includes('.adobeaemcloud.com');

  if (isExternalUrl) {
    const loading = eager ? 'eager' : 'lazy';
    return `<picture><img src="${src}" alt="${alt}" loading="${loading}"></picture>`;
  }

  // 本地圖片：使用 EDS 圖片優化
  const picture = createOptimizedPicture(src, alt, eager, [{ width: '750' }]);
  return picture.outerHTML;
}

/**
 * 從 row 中提取圖片資訊
 * @param {Element} row - carousel item row
 * @returns {{ src: string|null, alt: string }}
 */
function extractImageInfo(row) {
  const columns = [...row.children];
  const picCol = columns[0]; // 第一欄：圖片
  const altCol = columns[1]; // 第二欄：alt text

  if (!picCol) return { src: null, alt: '' };

  let src = null;

  // 優先檢查是否有 img 標籤
  const img = picCol.querySelector('img');
  if (img) {
    src = img.src;
  } else {
    // Fallback: 檢查是否有 <a> 連結
    const anchor = picCol.querySelector('a');
    if (anchor?.href) {
      const { href } = anchor;
      if (href.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || href.includes('/assets/')) {
        src = href;
      }
    }
  }

  // 讀取 alt text（從第二欄）
  const alt = altCol?.textContent?.trim() || '';

  return { src, alt };
}

export default async function decorate(block) {
  // 偵測 Universal Editor 編輯模式
  const isEditMode = document.documentElement.classList.contains('adobe-ue-edit');

  // 區分 Config Rows 和 Slide Rows
  const rows = [...block.children];
  const config = {
    arrowLeftAltText: 'Previous slide',
    arrowRightAltText: 'Next slide',
  };
  const slideRows = [];

  rows.forEach((row) => {
    const firstCol = row.children[0];
    const hasImage = firstCol.querySelector('img') || (firstCol.querySelector('a')?.href.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i));
    // 如果第一欄沒有圖片且有文字，視為 Config Row
    console.log('firstCol textContent:', firstCol.textContent);
    console.log('row:', row);

    if (!hasImage && firstCol.textContent.trim()) {
      const key = firstCol.textContent.trim();
      const value = row.children[1]?.textContent.trim();


      if (key === 'Arrow Left Alt Text') config.arrowLeftAltText = value;
      if (key === 'Arrow Right Alt Text') config.arrowRightAltText = value;
    } else {
      slideRows.push(row);
    }
  });

  // 收集所有圖片資訊
  const slidesData = slideRows.map((row) => {
    const { src, alt } = extractImageInfo(row);
    // 保留原始 row 的 data-aue-* 屬性（Universal Editor 用）
    const dataAttrs = [...row.attributes]
      .filter((attr) => attr.name.startsWith('data-aue'))
      .map((attr) => `${attr.name}="${attr.value}"`)
      .join(' ');
    return { src, alt, dataAttrs };
  });

  // 在編輯模式下保留所有項目（包含新建立的空項目），預覽模式下只顯示有圖片的項目
  const images = isEditMode ? slidesData : slidesData.filter((img) => img.src);

  if (!isEditMode && images.length === 0) {
    block.innerHTML = '';
    return;
  }

  if (isEditMode) {
    // === 編輯模式 ===
    block.classList.add('is-editor');
    const thumbnails = images.map((img, index) => `
      <div class="carousel-item" ${img.dataAttrs} data-index="${index}">
        ${generatePictureHTML(img.src, img.alt)}
      </div>
    `).join('');

    block.innerHTML = `
      <div class="carousels-editor-grid">${thumbnails}</div>
    `;
  } else {
    // === 預覽 / Live 模式 ===
    // 生成縮圖導航 (Swiper Structure)
    const thumbnails = images.map((img, index) => `
      <div class="swiper-slide carousel-thumb${index === 0 ? ' active' : ''}" 
        data-index="${index}"
        tabindex="0"
        role="button"
        aria-label="Go to slide ${index + 1} - ${img.alt || `Image  + ${(index + 1)}`}">
        ${generatePictureHTML(img.src, img.alt)}
      </div>
    `).join('');

    // 第一張圖作為預設主圖
    const mainImageHTML = generatePictureHTML(images[0].src, images[0].alt, true);

    block.innerHTML = `
      <div class="carousel-main-image">
        ${mainImageHTML}
      </div>
      
      <!-- Thumbnails Swiper -->
      <div class="carousel-thumbnails swiper">
        <div class="swiper-wrapper">
          ${thumbnails}
        </div>
        <!-- Navigation Buttons -->
        <div class="swiper-button-prev" role="button" tabindex="0" aria-label="${config.arrowLeftAltText}"></div>
        <div class="swiper-button-next" role="button" tabindex="0" aria-label="${config.arrowRightAltText}"></div>
      </div>
    `;

    // 動態載入 Swiper 資源
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';
    document.head.appendChild(cssLink);

    // eslint-disable-next-line import/no-unresolved, import/extensions
    const { default: Swiper } = await import('https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.mjs');

    // 初始化 Thumbnails Swiper
    const thumbsSwiper = new Swiper(block.querySelector('.carousel-thumbnails'), {
      loop: false, // 縮圖列表通常不開啟 loop
      slidesPerView: 'auto',
      spaceBetween: 10,
      centeredSlides: true, // 設定置中
      navigation: {
        nextEl: '.carousel-thumbnails .swiper-button-next',
        prevEl: '.carousel-thumbnails .swiper-button-prev',
      },
      freeMode: false, // 改為 false，讓它每次只能滑動一格，配合 navigation
      watchSlidesProgress: true,
    });

    // 抽出更新主圖的邏輯
    const updateMainImage = (index) => {
      if (!images[index]) return;

      const selectedImage = images[index];
      const mainImageContainer = block.querySelector('.carousel-main-image');
      const thumbs = block.querySelectorAll('.carousel-thumb');

      // 更新主圖
      const imageHTML = generatePictureHTML(selectedImage.src, selectedImage.alt, true);
      mainImageContainer.innerHTML = imageHTML;

      // 更新 active 狀態
      thumbs.forEach((t) => t.classList.remove('active'));
      const activeThumb = block.querySelector(`.carousel-thumb[data-index="${index}"]`);
      if (activeThumb) activeThumb.classList.add('active');
    };

    // 綁定 slideChange 事件，確保點擊箭頭或滑動都能觸發主圖更新
    thumbsSwiper.on('slideChange', () => {
      updateMainImage(thumbsSwiper.activeIndex);
    });

    // 綁定點擊與鍵盤事件
    const thumbs = block.querySelectorAll('.carousel-thumb');
    thumbs.forEach((thumb) => {
      // 點擊事件
      thumb.addEventListener('click', () => {
        const index = parseInt(thumb.dataset.index, 10);
        // 只要讓 Swiper 滑過去，就會觸發 slideChange 事件，進而執行 updateMainImage
        thumbsSwiper.slideTo(index);
      });

      // 鍵盤事件 (Enter / Space)
      thumb.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); // 防止 Space 捲動頁面
          thumb.click();
        }
      });
    });
  }
}
