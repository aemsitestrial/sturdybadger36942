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

  // 收集所有圖片資訊
  const images = [...block.children].map((row) => {
    const { src, alt } = extractImageInfo(row);
    // 保留原始 row 的 data-aue-* 屬性（Universal Editor 用）
    const dataAttrs = [...row.attributes]
      .filter((attr) => attr.name.startsWith('data-aue'))
      .map((attr) => `${attr.name}="${attr.value}"`)
      .join(' ');
    return { src, alt, dataAttrs };
  }).filter((img) => img.src); // 只保留有圖片的項目

  if (images.length === 0) {
    block.innerHTML = '<p>No images found</p>';
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
    // 生成縮圖導航
    const thumbnails = images.map((img, index) => `
      <div class="carousel-thumb${index === 0 ? ' active' : ''}" data-index="${index}">
        ${generatePictureHTML(img.src, img.alt)}
      </div>
    `).join('');

    // 第一張圖作為預設主圖
    const mainImageHTML = generatePictureHTML(images[0].src, images[0].alt, true);

    block.innerHTML = `
      <div class="carousel-main-image">
        ${mainImageHTML}
      </div>
      <div class="carousel-thumbnails">
        ${thumbnails}
      </div>
    `;

    // 綁定點擊事件：點擊縮圖切換主圖
    const mainImageContainer = block.querySelector('.carousel-main-image');
    const thumbs = block.querySelectorAll('.carousel-thumb');

    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const index = parseInt(thumb.dataset.index, 10);
        const selectedImage = images[index];

        // 更新主圖（src 和 alt 同時更新）
        const newImageHTML = generatePictureHTML(selectedImage.src, selectedImage.alt, true);
        mainImageContainer.innerHTML = newImageHTML;

        // 更新 active 狀態
        thumbs.forEach((t) => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });
  }
}
