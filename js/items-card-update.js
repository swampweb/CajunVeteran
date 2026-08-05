/* CajunVeteran Website Tracker - Items card update
   Adds compact card image preview + visible Edit button.
   Safe drop-in helper: call CVItemsUpdate.renderItemsGrid(items) after loading item data.
*/
(function () {
  'use strict';

  const PLACEHOLDER_IMAGE = 'assets/images/placeholder-item.png';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function firstValue(obj, keys, fallback = '') {
    for (const key of keys) {
      if (obj && obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') {
        return obj[key];
      }
    }
    return fallback;
  }

  function getItemImage(item) {
    return firstValue(item, [
      'image_url',
      'imageUrl',
      'image',
      'item_image',
      'itemImage',
      'photo_url',
      'photoUrl',
      'thumbnail_url',
      'thumbnailUrl'
    ], PLACEHOLDER_IMAGE);
  }

  function getItemId(item) {
    return firstValue(item, ['id', 'item_id', 'itemId', 'uuid'], '');
  }

  function getStockInfo(item) {
    const stockRaw = firstValue(item, ['stock', 'qty', 'quantity', 'on_hand', 'onHand', 'current_stock', 'currentStock'], 0);
    const lowRaw = firstValue(item, ['low_stock', 'lowStock', 'low_stock_at', 'lowStockAt', 'reorder_level', 'reorderLevel', 'min_stock', 'minStock'], 0);

    const stock = Number(stockRaw) || 0;
    const low = Number(lowRaw) || 0;

    let status = 'good';
    let label = 'In Stock';

    if (stock <= 0) {
      status = 'out';
      label = 'Out of Stock';
    } else if (low > 0 && stock <= low) {
      status = 'low';
      label = 'Low Stock';
    }

    return { stock, low, status, label };
  }

  function itemCardTemplate(item) {
    const id = getItemId(item);
    const name = firstValue(item, ['name', 'item_name', 'itemName', 'title'], 'Unnamed Item');
    const sku = firstValue(item, ['sku', 'item_sku', 'part_number', 'partNumber'], '');
    const category = firstValue(item, ['category', 'type', 'item_type', 'itemType'], '');
    const location = firstValue(item, ['location', 'bin', 'shelf'], '');
    const unit = firstValue(item, ['unit', 'uom'], '');
    const imageUrl = getItemImage(item);
    const stockInfo = getStockInfo(item);

    return `
      <article class="cv-item-card" data-item-id="${escapeHtml(id)}">
        <div class="cv-item-card-top">
          <div class="cv-item-thumb-wrap">
            <img class="cv-item-thumb" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMAGE}'">
          </div>

          <div class="cv-item-main">
            <div class="cv-item-title-row">
              <h3 class="cv-item-title">${escapeHtml(name)}</h3>
            </div>
            ${sku ? `<div class="cv-item-muted">SKU: ${escapeHtml(sku)}</div>` : ''}
            ${category ? `<div class="cv-item-muted">${escapeHtml(category)}</div>` : ''}
          </div>
        </div>

        <div class="cv-item-details">
          <div class="cv-item-stat">
            <span>Stock</span>
            <strong>${escapeHtml(stockInfo.stock)}${unit ? ` ${escapeHtml(unit)}` : ''}</strong>
          </div>
          <div class="cv-item-stat">
            <span>Low Stock</span>
            <strong>${escapeHtml(stockInfo.low)}</strong>
          </div>
          ${location ? `<div class="cv-item-stat cv-item-stat-wide"><span>Location</span><strong>${escapeHtml(location)}</strong></div>` : ''}
        </div>

        <div class="cv-item-footer">
          <span class="cv-stock-pill cv-stock-${stockInfo.status}">
            <span class="cv-stock-dot"></span>${escapeHtml(stockInfo.label)}
          </span>
          <button type="button" class="cv-edit-item-btn" data-item-id="${escapeHtml(id)}">
            <i class="fas fa-edit" aria-hidden="true"></i> Edit
          </button>
        </div>
      </article>
    `;
  }

  function findItemsContainer() {
    return document.querySelector(
      '#itemsGrid, #items-grid, .items-grid, .items-list, #itemsContainer, #items-container, [data-items-grid]'
    );
  }

  function renderItemsGrid(items, container) {
    const target = container || findItemsContainer();
    if (!target) {
      console.warn('CVItemsUpdate: Items container not found. Add id="itemsGrid" to the Items grid container.');
      return;
    }

    target.classList.add('cv-items-grid');

    if (!Array.isArray(items) || items.length === 0) {
      target.innerHTML = '<div class="cv-empty-items">No items found.</div>';
      return;
    }

    target.innerHTML = items.map(itemCardTemplate).join('');
  }

  function openItemEditor(itemId) {
    if (typeof window.editItem === 'function') {
      window.editItem(itemId);
      return;
    }

    if (typeof window.openItemModal === 'function') {
      window.openItemModal(itemId);
      return;
    }

    if (typeof window.showItemModal === 'function') {
      window.showItemModal(itemId);
      return;
    }

    const modal = document.querySelector('#itemModal, #editItemModal, .item-modal');
    if (modal) {
      modal.classList.add('show', 'active', 'open');
      modal.style.display = 'block';
      modal.dataset.itemId = itemId;
      document.dispatchEvent(new CustomEvent('cv:item-edit-requested', { detail: { itemId } }));
      return;
    }

    console.warn('CVItemsUpdate: No item edit function/modal found for item:', itemId);
  }

  document.addEventListener('click', function (event) {
    const editButton = event.target.closest('.cv-edit-item-btn');
    if (!editButton) return;

    event.preventDefault();
    openItemEditor(editButton.dataset.itemId || '');
  });

  window.CVItemsUpdate = {
    renderItemsGrid,
    itemCardTemplate,
    openItemEditor,
    getItemImage,
    getStockInfo
  };
})();