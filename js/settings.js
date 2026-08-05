initNavigation('settings.html');

const PRICING_DEFAULTS_STORE = 'cv_print_pricing_defaults_v1';
const SIZE_STORE = 'cv_3d_item_sizes';
const WOOD_LOW_STOCK_STORE = 'cv_wood_low_stock_threshold';
const fallbackDefaults = { filamentRate: 0.02, machineRate: 0.75, markupPercent: 100, roundTo: 0.50 };
const fallbackSizes = ['General','Small','Medium','Large','12oz','8.4oz','Coin Holder','Koozie','Plaque'];
const FILAMENT_TYPE_STORE = 'cv_filament_types';
const fallbackFilamentTypes = ['PLA','PLA+','Silk PLA','PETG','ABS','TPU','ASA'];
const $ = id => document.getElementById(id);
const money = value => '$' + Number(value || 0).toFixed(2);

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function loadDefaults() { return { ...fallbackDefaults, ...readJson(PRICING_DEFAULTS_STORE, {}) }; }
function saveDefaults(values) { saveJson(PRICING_DEFAULTS_STORE, values); }
function loadSizes() { return readJson(SIZE_STORE, fallbackSizes); }
function saveSizes(values) { saveJson(SIZE_STORE, values); }
function loadFilamentTypes() { return readJson(FILAMENT_TYPE_STORE, fallbackFilamentTypes); }
function saveFilamentTypes(values) { saveJson(FILAMENT_TYPE_STORE, values); }
function roundTo(value, step) { step = Number(step || 0.5); return step > 0 ? Math.ceil(Number(value || 0) / step) * step : Number(value || 0); }

function populatePricingForm() {
  const values = loadDefaults();
  $('defaultFilamentRate').value = values.filamentRate;
  $('defaultMachineRate').value = values.machineRate;
  $('defaultMarkupPercent').value = values.markupPercent;
  $('defaultRoundTo').value = values.roundTo;
  renderPreview();
}
function pricingFormValues() {
  return {
    filamentRate: Number($('defaultFilamentRate').value || fallbackDefaults.filamentRate),
    machineRate: Number($('defaultMachineRate').value || fallbackDefaults.machineRate),
    markupPercent: Number($('defaultMarkupPercent').value || fallbackDefaults.markupPercent),
    roundTo: Number($('defaultRoundTo').value || fallbackDefaults.roundTo)
  };
}
function renderPreview() {
  const values = pricingFormValues();
  const exampleGrams = 164.5;
  const exampleHours = 5 + 55 / 60;
  const materialCost = exampleGrams * values.filamentRate;
  const machineCost = exampleHours * values.machineRate;
  const baseCost = materialCost + machineCost;
  const suggestedRaw = baseCost * (1 + values.markupPercent / 100);
  const suggested = roundTo(suggestedRaw, values.roundTo);
  $('pricingPreview').innerHTML = `<div><span>Example</span><strong>Koozie + 12oz insert</strong></div><div><span>Material Cost</span><strong>${money(materialCost)}</strong></div><div><span>Machine Cost</span><strong>${money(machineCost)}</strong></div><div><span>Base Cost</span><strong>${money(baseCost)}</strong></div><div><span>Suggested Price</span><strong>${money(suggested)}</strong></div>`;
}
function renderSizes() {
  const sizes = loadSizes();
  $('sizeList').innerHTML = sizes.map((size, index) => `<span class="settings-pill"><span class="settings-pill-name">${size}</span><button class="settings-pill-remove" type="button" aria-label="Remove ${size}" data-remove-size="${index}">×</button></span>`).join('') || '<div class="pi-empty-soft">No sizes saved.</div>';
}
function renderFilamentTypes() {
  if (!$('filamentTypeList')) return;
  const types = loadFilamentTypes();
  $('filamentTypeList').innerHTML = types.map((type, index) => `<span class="settings-size-pill filament-type-pill"><span class="settings-pill-name">${type}</span><button class="settings-pill-remove" type="button" aria-label="Remove ${type}" data-remove-filament-type="${index}">×</button></span>`).join('') || '<div class="pi-empty-soft">No filament types saved.</div>';
}
function populateStockSettings() { $('woodLowStockThreshold').value = localStorage.getItem(WOOD_LOW_STOCK_STORE) || 5; }

document.addEventListener('input', event => { if (event.target.closest('#pricingDefaultsForm')) renderPreview(); });

document.addEventListener('click', event => {
  const removeType = event.target.closest('[data-remove-filament-type]');
  if (removeType) {
    const types = loadFilamentTypes();
    types.splice(Number(removeType.dataset.removeFilamentType), 1);
    saveFilamentTypes(types);
    renderFilamentTypes();
    return;
  }
  const remove = event.target.closest('[data-remove-size]');
  if (!remove) return;
  const sizes = loadSizes();
  sizes.splice(Number(remove.dataset.removeSize), 1);
  saveSizes(sizes);
  renderSizes();
});

$('pricingDefaultsForm').onsubmit = event => { event.preventDefault(); saveDefaults(pricingFormValues()); alert('3D print pricing defaults saved.'); };
$('resetPricingDefaults').onclick = () => { saveDefaults(fallbackDefaults); populatePricingForm(); };
$('sizeForm').onsubmit = event => {
  event.preventDefault();
  const value = $('sizeName').value.trim();
  if (!value) return;
  const sizes = loadSizes();
  if (!sizes.some(size => size.toLowerCase() === value.toLowerCase())) sizes.push(value);
  saveSizes(sizes);
  $('sizeName').value = '';
  renderSizes();
};
if ($('filamentTypeForm')) {
  $('filamentTypeForm').onsubmit = event => {
    event.preventDefault();
    const value = $('filamentTypeName').value.trim();
    if (!value) return;
    const types = loadFilamentTypes();
    if (!types.some(type => type.toLowerCase() === value.toLowerCase())) types.push(value);
    saveFilamentTypes(types);
    $('filamentTypeName').value = '';
    renderFilamentTypes();
  };
}

$('stockSettingsForm').onsubmit = event => { event.preventDefault(); localStorage.setItem(WOOD_LOW_STOCK_STORE, String(Number($('woodLowStockThreshold').value || 5))); alert('Low stock settings saved.'); };

populatePricingForm();
renderSizes();
renderFilamentTypes();
populateStockSettings();
