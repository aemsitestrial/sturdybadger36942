import ProductList from '@dropins/storefront-product-discovery/containers/ProductList.js';
import { render as provider } from '@dropins/storefront-product-discovery/render.js';
import { readBlockConfig } from '../../scripts/aem.js';
import { rootLink } from '../../scripts/commerce.js';

// Initializers
import '../../scripts/initializers/search.js';

export default async function decorate(block) {
  const config = readBlockConfig(block);

  const fragment = document.createRange().createContextualFragment(`
    <div class="search__product-list">
    </div>
  `);

  const $productList = fragment.querySelector('.search__product-list');

  block.innerHTML = '';
  block.appendChild(fragment);

  // Add category url path to block for enrichment
  if (config.urlpath) {
    block.dataset.category = config.urlpath;
  }

  const categoryPathConfig = config.urlpath ? { categoryPath: config.urlpath } : {};

  return Promise.all([
    provider.render(ProductList, {
      routeProduct: (product) => rootLink(`/products/${product.urlKey}/${product.sku}`),
      ...categoryPathConfig,
      slots: {
        Header: (ctx, elem) => {
          elem.remove();
        },
        Footer: (ctx, elem) => {
          elem.remove();
        },
        ProductName: (ctx) => {
          const descr = document.createElement('a');
          descr.className = 'product-description';
          descr.innerHTML = ctx.product.shortDescription;
          descr.href = rootLink(`/products/${ctx.product.urlKey}/${ctx.product.sku}`);
          ctx.appendChild(descr);
        },
      },
    })($productList),
  ]);
}
