import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  // 將每一列的第一個 Cell 轉為一個屬性陣列
  const props = [...block.children].map((row) => row.firstElementChild);
  const [imgCol, titleCol, descCol, btnTextCol, btnLinkCol] = props;

  // 取得圖片並進行最佳化 (加入 Safe Check)
  const img = imgCol?.querySelector('img');
  const picture = img ? createOptimizedPicture(img.src, img.alt || 'Info card image') : null;

  // 取得文字內容 (加入 Safe Check)
  const title = titleCol?.textContent || '';
  const desc = descCol?.innerHTML || '';
  const btnText = btnTextCol?.textContent || '';
  const btnLink = btnLinkCol?.textContent || '';

  // 清空原始表格並重建 DOM
  block.textContent = '';
  block.innerHTML = `
    <div class="info-card-image">${picture ? picture.outerHTML : ''}</div>
    <div class="info-card-content">
      <h2>${title}</h2>
      <div class="desc">${desc}</div>
      <a href="${btnLink}" class="button primary">${btnText}</a>
    </div>
  `;
}
