import { createOptimizedPicture } from '../../scripts/aem.js';

export default async function decorate(block) {
  // 1. 偵測 Universal Editor 編輯模式
  // UE 通常會給 html tag 加上 adobe-ue-edit class
  const isEditMode = document.documentElement.classList.contains('adobe-ue-edit');

  // 2. 準備容器
  // 如果是編輯模式，我們用一個 grid container；如果是預覽，這是 swiper-wrapper
  const wrapper = document.createElement('div');
  wrapper.className = isEditMode ? 'carousels-editor-grid' : 'swiper-wrapper';

  // 3. 處理 Block 的子項目 (Rows)
  // block.children 對應到 JSON 中的 "definitions > carousels > components > carouselItem"
  [...block.children].forEach((row) => {
    // 這裡的 'row' 就是每一個 CarouselItem
    
    // 設定 class
    row.className = isEditMode ? 'carousel-item' : 'swiper-slide';

    // 處理圖片 (對應 JSON model: carouselItem > fields > image)
    const picCol = row.firstElementChild; 
    if (picCol) {
        let imgSrc = null;
        let imgAlt = '';
        
        // 優先檢查是否有 img 標籤
        const img = picCol.querySelector('img');
        if (img) {
            imgSrc = img.src;
            imgAlt = img.alt || '';
        } else {
            // 如果沒有 img，檢查是否有 <a> 連結（reference 未正確渲染時的 fallback）
            const anchor = picCol.querySelector('a');
            if (anchor && anchor.href) {
                // 檢查連結是否指向圖片
                const href = anchor.href;
                if (href.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || href.includes('/assets/')) {
                    imgSrc = href;
                    imgAlt = anchor.title || anchor.textContent || '';
                }
            }
        }
        
        if (imgSrc) {
            // EDS 圖片優化標準寫法
            const newPic = createOptimizedPicture(imgSrc, imgAlt, false, [{ width: '750' }]);
            picCol.replaceWith(newPic);
        }
    }

    // 關鍵：將處理好的 row 移動到 wrapper 中
    // 我們直接移動 row 元素本身，這樣可以保留 Universal Editor 的 data-aue-* 屬性
    wrapper.append(row);
  });

  // 4. 重組 Block DOM
  block.textContent = ''; // 清空原始內容
  block.append(wrapper);

  // 5. 根據模式分岔處理
  if (isEditMode) {
    // === 編輯模式 ===
    block.classList.add('is-editor');
    // 這裡不初始化 Swiper。
    // 因為 Block 的 HTML 結構單純 (Grid)，UE 可以輕鬆地掛載選取框和「+」按鈕。
    
  } else {
    // === 預覽 / Live 模式 ===
    block.classList.add('swiper');

    // 加入 Swiper 必備的 UI 元件
    const nextBtn = document.createElement('div');
    nextBtn.className = 'swiper-button-next';
    const prevBtn = document.createElement('div');
    prevBtn.className = 'swiper-button-prev';
    const pagination = document.createElement('div');
    pagination.className = 'swiper-pagination';

    block.append(nextBtn, prevBtn, pagination);

    // 動態載入 Swiper 資源 (Lazy Load 以提升 PageSpeed 分數)
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';
    document.head.appendChild(cssLink);

    const { default: Swiper } = await import('https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.mjs');

    // 初始化 Swiper
    new Swiper(block, {
      loop: true,
      slidesPerView: 'auto',
      spaceBetween: 20,
      centeredSlides: false,
      navigation: {
        nextEl: nextBtn,
        prevEl: prevBtn,
      },
      pagination: false,
      autoplay: false
    });
  }
}