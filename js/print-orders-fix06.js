(function () {
  'use strict';

  var activeStatus = 'all';
  var cleaning = false;

  var kpiIcons = [
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v4M12 17v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8"/><circle cx="12" cy="12" r="3"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 5 5L20 6"/></svg>'
  ];

  function normalizeStatus(text) {
    return String(text || '').trim().toLowerCase().replace(/\s+/g, '_');
  }

  function fixKpiIcons() {
    document.querySelectorAll('.v7-kpi-icon').forEach(function (icon, index) {
      if (index < kpiIcons.length) icon.innerHTML = kpiIcons[index];
    });
  }

  function setupStatusButtons() {
    var buttons = Array.from(document.querySelectorAll('.v7-status-filter'));
    var statuses = ['all', 'new', 'in_process', 'completed', 'delivered', 'shipped'];
    var labels = ['All Orders', 'New', 'In Process', 'Completed', 'Delivered', 'Shipped'];

    buttons.forEach(function (button, index) {
      var status = statuses[index] || normalizeStatus(button.textContent);
      button.dataset.statusFilter = status;
      if (labels[index]) button.textContent = labels[index];
      button.classList.toggle('active', status === activeStatus);
      if (button.dataset.filterWired !== 'true') {
        button.dataset.filterWired = 'true';
        button.addEventListener('click', function () {
          activeStatus = button.dataset.statusFilter || 'all';
          buttons.forEach(function (item) {
            item.classList.toggle('active', item === button);
          });
          applyStatusFilter();
        });
      }
    });
  }

  function applyStatusFilter() {
    document.querySelectorAll('#ordersGrouped .status-group').forEach(function (group) {
      var status = group.dataset.group || normalizeStatus(group.querySelector('.status-head span')?.textContent);
      group.style.display = activeStatus === 'all' || status === activeStatus ? '' : 'none';
    });
  }

  function fixActionButtons() {
    var add = document.getElementById('addLine');
    if (add) add.textContent = '+ Add Item';

    document.querySelectorAll('[data-remove-line]').forEach(function (button) {
      button.textContent = 'X';
      button.setAttribute('aria-label', 'Delete item');
      button.setAttribute('title', 'Delete item');
      button.classList.add('ascii-delete-button');
    });

    document.querySelectorAll('[data-remove-color]').forEach(function (button) {
      button.textContent = 'x';
      button.setAttribute('aria-label', 'Remove color');
      button.setAttribute('title', 'Remove color');
      button.classList.add('ascii-color-remove');
    });
  }

  function cleanPage() {
    if (cleaning) return;
    cleaning = true;
    fixKpiIcons();
    setupStatusButtons();
    fixActionButtons();
    applyStatusFilter();
    cleaning = false;
  }

  function start() {
    cleanPage();
    var targets = [document.getElementById('ordersGrouped'), document.getElementById('lineTable')].filter(Boolean);
    targets.forEach(function (target) {
      new MutationObserver(function () {
        window.requestAnimationFrame(cleanPage);
      }).observe(target, { childList: true, subtree: true });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
