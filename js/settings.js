initNavigation('settings.html');

const PRICING_DEFAULTS_STORE = 'cv_print_pricing_defaults_v1';
const fallbackDefaults = { filamentRate: 0.02, machineRate: 0.75, markupPercent: 100, roundTo: 0.50 };
const $ = id => document.getElementById(id);
const money = value => '$' + Number(value || 0).toFixed(2);

function loadDefaults() {
  try { return { ...fallbackDefaults, ...JSON.parse(localStorage.getItem(PRICING_DEFAULTS_STORE) || '{}') }; }
  catch { return fallbackDefaults; }
}
function saveDefaults(values) {
  localStorage.setItem(PRICING_DEFAULTS_STORE, JSON.stringify(values));
}
function roundTo(value, step) {
  step = Number(step || 0.5);
  return step > 0 ? Math.ceil(Number(value || 0) / step) * step : Number(value || 0);
}
function populateForm() {
  const values = loadDefaults();
  $('defaultFilamentRate').value = values.filamentRate;
  $('defaultMachineRate').value = values.machineRate;
  $('defaultMarkupPercent').value = values.markupPercent;
  $('defaultRoundTo').value = values.roundTo;
  renderPreview();
}
function formValues() {
  return {
    filamentRate: Number($('defaultFilamentRate').value || fallbackDefaults.filamentRate),
    machineRate: Number($('defaultMachineRate').value || fallbackDefaults.machineRate),
    markupPercent: Number($('defaultMarkupPercent').value || fallbackDefaults.markupPercent),
    roundTo: Number($('defaultRoundTo').value || fallbackDefaults.roundTo)
  };
}
function renderPreview() {
  const values = formValues();
  const exampleGrams = 164.5;
  const exampleHours = 5 + 55 / 60;
  const materialCost = exampleGrams * values.filamentRate;
  const machineCost = exampleHours * values.machineRate;
  const baseCost = materialCost + machineCost;
  const suggestedRaw = baseCost * (1 + values.markupPercent / 100);
  const suggested = roundTo(suggestedRaw, values.roundTo);
  $('pricingPreview').innerHTML = `
    <div><span>Example</span><strong>Koozie holder + 12oz insert</strong></div>
    <div><span>Material Cost</span><strong>${money(materialCost)}</strong></div>
    <div><span>Machine Cost</span><strong>${money(machineCost)}</strong></div>
    <div><span>Base Cost</span><strong>${money(baseCost)}</strong></div>
    <div><span>Suggested Price</span><strong>${money(suggested)}</strong></div>`;
}

document.addEventListener('input', event => {
  if (event.target.closest('#pricingDefaultsForm')) renderPreview();
});

$('pricingDefaultsForm').onsubmit = event => {
  event.preventDefault();
  saveDefaults(formValues());
  alert('3D print pricing defaults saved.');
};

$('resetPricingDefaults').onclick = () => {
  saveDefaults(fallbackDefaults);
  populateForm();
};

populateForm();
