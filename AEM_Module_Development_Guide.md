# AEM 模組深度開發指南 (Edge Delivery Services)

本指南旨在幫助 AEM 開發者在 **Edge Delivery Services (EDS)** 與 **Universal Editor** 環境下，從零開始開發高品質、高效能的模組。

---

## 1. 核心開發哲學：Table to Block
在 AEM EDS 中，作者在編輯器中看到的內容，最終會以一個「HTML 表格 (Table)」的形式傳送到前端。
你的任務是撰寫一個 **裝飾器 (Decorator)**，將這個原始表格轉換為語義化且美觀的 HTML。

### 開發流程
1.  **定義模型 (`_*.json`)**: 設計 Universal Editor 的編輯介面。
2.  **撰寫邏輯 (`*.js`)**: 實作 `decorate` 函式。
3.  **定義樣式 (`*.css`)**: 針對模組類名編寫 CSS。

---

## 2. Dialog (Universal Editor Model) 深度解析

Dialog 的定義儲存在 `_blockname.json` 中。它是基於 **Universal Editor Schema** 的。

### 2.1 定義與模型結構
```json
{
  "definitions": [
    {
      "title": "我的模組",
      "id": "my-block",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": {
              "name": "My Block",
              "model": "my-block-model"
            }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "my-block-model",
      "fields": [ ... ]
    }
  ]
}
```

### 2.2 常用欄位類型 (`component`)
| 類型 | 代碼 | 說明 |
| :--- | :--- | :--- |
| **文字** | `text` | 單行文字。 |
| **富文本** | `richtext` | 支援加粗、連結。 |
| **影像/檔案** | `reference` | 選擇 AEM Asset。`multi: false` 為單選。 |
| **下拉選單** | `select` | 定義固定選項。 |
| **多選** | `multiselect` | 常用於選取「樣式類名」。 |
| **開關** | `boolean` | Checkbox 形式。 |
| **數字** | `number` | 限制輸入格式。 |

### 2.3 進階語法：條件邏輯 (`condition`)
支援 JSON Logic，可用於根據其他欄位的值動態顯示/隱藏欄位。
```json
{
  "component": "text",
  "name": "extraField",
  "label": "額外資訊",
  "condition": {
    "===": [{ "var": "showExtra" }, true]
  }
}
```

### 2.4 進階語法：模組化引用 (`...`)
為了保持程式碼簡潔，推薦將重複的欄位（如驗證、SEO 設定）抽離。
```json
{
  "...": "../../models/form-common/_basic-validation-fields.json#/fields"
}
```

---

## 3. 前端裝飾器 (JS Decorator) 實作

### 3.1 屬性提取 (Property Extraction)
由於 EDS 將資料輸出為表格行，JS 通常透過陣列解構來獲取值。

> [!IMPORTANT]
> **欄位順序限制**：JS 中提取 `rows` 的順序必須與 JSON Model 中 `fields` 定義的順序完全一致。

```javascript
export default function decorate(block) {
  // 將每一列的第一個 Cell 轉為一個屬性陣列
  const props = [...block.children].map((row) => row.firstElementChild);
  
  // 解構賦值 (須對應 JSON 順序)
  const [imageBox, title, description, link] = props;
  
  // 清空原始表格並重建 DOM
  block.textContent = '';
  const wrapper = document.createElement('div');
  wrapper.append(imageBox, title);
  block.append(wrapper);
}
```

### 3.2 使用 `scripts/aem.js` 工具函式
- **`createOptimizedPicture`**: 永遠使用它來載入圖片，確保 WebP 支援與懶載入。
- **`readBlockConfig`**: 當模組是自定義屬性列表（非固定順序 UI）時使用。

---

## 4. 檔案彙整機制 (Aggregation Mechanism)

本專案使用 `merge-json-cli` 進行模型彙整。理解哪些檔案是「源頭」，哪些是「產出」至關重要。

### 4.1 原始定義 (Source Files) - **請修改這些檔案**
*   `/models/_*.json`: 全域的模型、定義與過濾器模板。
*   `/blocks/*/_*.json`: 各別模組的局部定義。

### 4.2 自動產出 (Generated Files) - **請勿手動修改**
以下檔案是由 `npm run build:json` 產生的，手動修改這些檔案會在下次建構時被覆蓋：
*   `/component-definition.json`
*   `/component-models.json`
*   `/component-filters.json`

> [!TIP]
> **開發規範**：永遠修改 `models/` 或 `blocks/` 下的底線開頭檔案，然後執行 `npm run build:json` 來同步變更。

---

## 5. 限制與陷阱

1.  **Dialog 限制**: Universal Editor JSON 不支援執行複雜的 JS。所有的邏輯應盡量在前端 JS 處理。
2.  **樣式隔離**: AEM 會自動為 Block 加上類名（如 `.hero-wrapper`）。請務必在 CSS 中使用 `.hero { ... }` 進行隔離，避免全局汙染。
3.  **JSON 結構要求 (重要)**: 在本專案的建構流程中，所有 `blocks/` 下的 `_*.json` 檔案 **必須** 包含一個 `"filters": []` 欄位（即使為空）。否則會導致 `npm run build:json` 失敗。
4.  **快取問題**: 修改 JSON 模型後，可能需要重新整理 Universal Editor 或發佈頁面才能看到欄位更新。
5.  **Rich Text 巢狀**: 避免在 `richtext` 中放入另一個 Block，這會導致 DOM 解析錯誤。

---

## 6. 實戰範例：建立一個 「Info Card」 模組

為了讓你更直觀地了解開發過程，我們將建立一個簡單的 **Info Card (資訊卡片)** 模組。

### 步驟 1：建立目錄結構
在專案目錄下新增資料夾：
`/blocks/info-card/`

### 步驟 2：定義 Dialog 模型 (`_info-card.json`)
此檔案決定了作者在 Universal Editor 中看到的輸入介面。

```json
{
  "definitions": [
    {
      "title": "Info Card",
      "id": "info-card",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": {
              "name": "Info Card",
              "model": "info-card-model"
            }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "info-card-model",
      "fields": [
        { "component": "reference", "name": "image", "label": "影像" },
        { "component": "text", "name": "title", "label": "標題" },
        { "component": "richtext", "name": "description", "label": "描述文字" },
        { "component": "text", "name": "btnText", "label": "按鈕文字" },
        { "component": "aem-content", "name": "btnLink", "label": "按鈕連結" }
      ]
    }
  ],
  "filters": []
}
```

### 步驟 3：註冊模組
開啟 `models/_component-definition.json`，在 `blocks` 群組中加入：
```json
{ "...": "../blocks/info-card/_*.json#/definitions" }
```

### 步驟 4：實作裝飾器邏輯 (`info-card.js`)
JS 將處理 AEM 輸出的原始表格，並使用 `createOptimizedPicture` 進行最佳化。

```javascript
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
```

### 步驟 5：定義視覺樣式 (`info-card.css`)
使用樣式名稱空間隔離，確保不會影響頁面其他部分。

```css
.info-card {
  display: flex;
  gap: 20px;
  padding: 24px;
  border: 1px solid #ddd;
  border-radius: 12px;
}

.info-card-image img {
  width: 200px;
  height: auto;
  border-radius: 8px;
}

.info-card .button {
  display: inline-block;
  margin-top: 16px;
  background-color: #00647D;
  color: white;
  padding: 10px 20px;
  text-decoration: none;
}
```

### 步驟 6：執行建構與測試
執行以下指令產生 AEM 設定檔：
```bash
npm run build:json
```

> [!NOTE]
> **連動說明**：執行此指令後，系統會自動根據你剛才在 `models/` 與 `blocks/` 中的修改，重新產出根目錄下的 `component-definition.json`。你不需要（也不應該）手動修改根目錄下的該檔案。

現在你可以在 AEM Universal Editor 的組件面板中看到 **Info Card** 了！

---

*本指南由 Antigravity 整理，祝開發愉快！*
