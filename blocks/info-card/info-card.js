import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  // 按照 JSON 定義的順序提取欄位
  const props = [...block.children].map((row) => row.firstElementChild);
  const [imgCol, titleCol, descCol, btnTextCol, btnLinkCol] = props;

  // 取得圖片並進行最佳化
  const img = imgCol.querySelector('img');
  const picture = img ? createOptimizedPicture(img.src, img.alt || 'Info card image') : '';

  // 構造全新的語義化 DOM
  block.textContent = '';
  block.innerHTML = `
    <div class="info-card-image">${picture.outerHTML}</div>
    <div class="info-card-content">
      <h2>${titleCol.textContent}</h2>
      <div class="desc">${descCol.innerHTML}</div>
      <a href="${btnLinkCol.textContent}" class="button primary">${btnTextCol.textContent}</a>
    </div>
  `;
}
