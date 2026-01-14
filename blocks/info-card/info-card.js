import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  // 將每一列的第一個 Cell 轉為一個屬性陣列
  const props = [...block.children].map((row) => row.firstElementChild);
  const [imgCol, titleCol, descCol, btnTextCol, btnLinkCol] = props;

  // 取得圖片並進行最佳化 (更加魯棒的提取方式)
  const img = imgCol?.querySelector('img');
  let picture = img ? createOptimizedPicture(img.src, img.alt || 'Info card image') : null;

  // 如果找不到 img 標籤但有純文字連結，嘗試手動優化
  if (!picture && imgCol?.textContent.trim().match(/\.(jpg|jpeg|png|gif|svg|webp)/i)) {
    picture = createOptimizedPicture(imgCol.textContent.trim(), 'Info card image');
  }


  // 取得文字內容
  const title = titleCol?.textContent || '';
  const desc = descCol?.innerHTML || '';
  const btnText = btnTextCol?.textContent || '';
  const btnLink = btnLinkCol?.textContent || '';

  // 清空原始表格並重建 DOM
  block.textContent = '';
  block.innerHTML = `
    <div class="info-card-image 2">${picture?.outerHTML}</div>
    <div class="info-card-content">
      <h2 class="title">${title}</h2>
      <div class="desc">${desc}</div>
      <a href="${btnLink}" class="button primary">${btnText}</a>
    </div>
  `;
}
