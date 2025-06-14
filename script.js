let withDependents = {};
let withoutDependents = {};

async function loadBahRates(url) {
  const response = await fetch(url);
  const csvText = await response.text();

  const parsed = Papa.parse(csvText, { skipEmptyLines: true });
  const rows = parsed.data;
  const headers = rows[0];
  const cityIndex = headers.indexOf("MHA_NAME");
  const rateKeys = headers.slice(2);

  const result = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < headers.length) continue;

    const city = row[cityIndex].replace(/^"|"$/g, '');
    const rates = {};
    rateKeys.forEach((key, idx) => {
      rates[key] = row[idx + 2];
    });

    result[city] = rates;
  }

  return result;
}

function animateAmount(elementId, newValue, suffix = '') {
  const element = document.getElementById(elementId);
  const oldText = element.textContent.replace(/[^\d]/g, '');
  const start = parseInt(oldText || '0', 10);
  const end = parseInt(newValue, 10);
  const range = end - start;
  const duration = 500;
  const startTime = performance.now();

  function update(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const current = Math.round(start + range * progress);

    element.textContent = `$${current.toLocaleString()}${suffix}`;
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function populateCityList(cityData) {
  const cityList = document.getElementById('cityList');
  Object.keys(cityData).forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    cityList.appendChild(option);
  });
}

function populatePayGrades(referenceData) {
  const paygradeSelect = document.getElementById('paygrade');
  const grades = Object.keys(Object.values(referenceData)[0] || {});
  grades.forEach(grade => {
    const option = document.createElement('option');
    option.value = grade;
    option.textContent = grade.replace('0','-');
    paygradeSelect.appendChild(option);
  });
}

function prefillForm() {
  document.getElementById('zip').value = "COLUMBIA/JEFFERSON CITY, MO";
  document.getElementById('paygrade').value = "E04"; 
  document.getElementById('dependents').checked = false;

  calculateBAH();
}

function calculateBAH() {
  const city = document.getElementById('zip').value;
  const grade = document.getElementById('paygrade').value;
  const hasDependents = document.getElementById('dependents').checked;

  const dataSet = hasDependents ? withDependents : withoutDependents;
  const cityData = dataSet[city];


  if (cityData && cityData[grade]) {
    const monthly = parseInt(cityData[grade], 10);
    const annual = monthly * 12;

    animateAmount('monthlyAmt', monthly); // no suffix
    animateAmount('annualAmt', annual, ' / Year'); // with suffix
    document.getElementById('locationText').textContent = city;
    
    const depLabel = hasDependents ? "With Dependents" : "Without Dependents";
    document.getElementById('rankText').textContent = `${grade} ${depLabel} at ${city}`;
  }
}

Promise.all([
  loadBahRates('2025_BAH_Rates_with_dependents.csv'),
  loadBahRates('2025_BAH_Rates_without_dependents.csv')
]).then(([withData, withoutData]) => {
  withDependents = withData;
  withoutDependents = withoutData;

  populateCityList(withDependents);
  populatePayGrades(withDependents); 
  prefillForm();
});

['zip', 'paygrade', 'dependents'].forEach(id => {
  document.getElementById(id).addEventListener('change', calculateBAH);
});

function downloadPDF() {
  const email = document.getElementById('email').value;
  const city = document.getElementById('zip').value;
  const grade = document.getElementById('paygrade').value;
  const dependents = document.getElementById('dependents').checked;
  const monthly = document.getElementById('monthlyAmt').textContent;
  const annual = document.getElementById('annualAmt').textContent;

  const leadData = {
    email,
    city,
    grade,
    dependents,
    monthlyBAH: monthly,
    annualBAH: annual
  };

  console.log("Captured Lead:", leadData);

  const resultBox = document.getElementById('resultBox');
  const opt = {
    margin:       0.5,
    filename:     `BAH_Estimate_${city.replace(/[\s,]/g, "_")}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(resultBox).save();

}