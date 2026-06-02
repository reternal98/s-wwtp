// appController.js - Connects Interface Views via Action Button Click

const INDUSTRY_DEFAULTS = {
    MUNICIPAL: { bod: 200, tss: 210, cod: 430, fog: 30, tds: 400, ph: 7.2 },
    DAIRY:     { bod: 2500, tss: 800, cod: 4500, fog: 400, tds: 1200, ph: 5.0 },
    TEXTILE:   { bod: 300, tss: 400, cod: 1200, fog: 20, tds: 6000, ph: 10.0 },
    PETROCHEM: { bod: 250, tss: 150, cod: 800, fog: 500, tds: 3000, ph: 6.8 }
};

// Instantly update text parameter placeholders when selecting an industry type template
function handleIndustryChange() {
    const selectedIndustry = document.getElementById('industryType').value;
    const defaults = INDUSTRY_DEFAULTS[selectedIndustry];
    
    if (defaults) {
        document.getElementById('bodInput').value = defaults.bod;
        document.getElementById('codInput').value = defaults.cod;
        document.getElementById('tssInput').value = defaults.tss;
        document.getElementById('tdsInput').value = defaults.tds;
        document.getElementById('phInput').value = defaults.ph;
        document.getElementById('fogInput').value = defaults.fog;
    }
}

// Main execution function completely tied to the click action event
function runDesignGeneration() {
    const goal = document.getElementById('designGoal').value;
    const industry = document.getElementById('industryType').value;
    const flow = parseFloat(document.getElementById('flowInput').value) || 0;
    
    const manualBod = parseFloat(document.getElementById('bodInput').value) || 0;
    const manualCod = parseFloat(document.getElementById('codInput').value) || 0;
    const manualTss = parseFloat(document.getElementById('tssInput').value) || 0;
    const manualTds = parseFloat(document.getElementById('tdsInput').value) || 0;
    const manualPh = parseFloat(document.getElementById('phInput').value) || 7.0;
    const manualFog = parseFloat(document.getElementById('fogInput').value) || 0;

    // Call our calculations engine script class
    const activeEngine = new WastewaterInfluent(flow, manualBod, manualTss, manualCod, industry);
    activeEngine.tds = manualTds;
    activeEngine.ph = manualPh;
    activeEngine.fog = manualFog;

    const loadings = activeEngine.getDailyMassLoadings();
    const primarySpecs = activeEngine.calculatePrimaryStages();
    const biologicalSpecs = activeEngine.calculateAerationTank(goal);

    renderPFDVisuals(manualFog, manualTds, manualCod, manualBod, manualTss, industry, goal);
    renderReportLedger(flow, manualFog, manualTds, manualCod, manualBod, manualPh, loadings, primarySpecs, biologicalSpecs);
}

function renderPFDVisuals(fog, tds, cod, bod, tss, industry, goal) {
    const container = document.getElementById('pfdContainer');
    container.innerHTML = '';

    let items = [];

    if (fog > 150) {
        items.push({title: "API Oil-Water Separator", desc: "Forced due to extreme hydro-carbon load. Drops free oils out.", type: "advanced"});
    }
    if (fog > 50) {
        items.push({title: "Dissolved Air Flotation (DAF)", desc: "Micro-bubbles lift suspended grease to prevent biomass blinding.", type: "chemical"});
    }

    items.push({title: "Mechanical Bar Screening", desc: "Removes coarse physical objects to safeguard downstream mechanics.", type: "physical"});
    
    if (tss > 300 || industry === "TEXTILE") {
        items.push({title: "Coagulation Flash Mixer", desc: "Rapid mixing (45s HRT) neutralized negative colloidal particle surface charges.", type: "chemical"});
        items.push({title: "Flocculation Chamber", desc: "Slow paddle maturation (25m HRT) binds microflocs into heavy macroflocs.", type: "chemical"});
    }

    items.push({title: "Primary Sedimentation Clarifier", desc: "Gravity settling reduces organic solids, stripping up to 60% of inbound TSS load.", type: "physical"});

    if (goal === "DISCHARGE") {
        items.push({title: "Conventional Activated Sludge (CAS)", desc: "Biological oxidation basin consuming organic mass using diffuse aeration.", type: "biological"});
        items.push({title: "Secondary Settling Clarifier", desc: "Separates suspended active biological floc from clean treated effluent water.", type: "physical"});
    } else if (goal === "REUSE") {
        items.push({title: "Membrane Bioreactor (MBR)", desc: "Combines biology with ultrafiltration membrane loops, replacing secondary clarifiers entirely.", type: "biological"});
        items.push({title: "UV Disinfection Tube", desc: "Destroys pathogen nucleic acids without raising downstream water mineral contents.", type: "chemical"});
    } else if (goal === "ZLD") {
        items.push({title: "Membrane Bioreactor (MBR)", desc: "High-efficiency biomass separation optimized for downstream desalination feeds.", type: "biological"});
        items.push({title: "Reverse Osmosis (RO) Pack", desc: "High-pressure crossflow filtration stripping away remaining salts.", type: "advanced"});
        items.push({title: "Thermal Evaporator & Crystallizer", desc: "Boils highly toxic remaining brine into dry salt cake solids. 100% water recovery.", type: "advanced"});
    }

    items.forEach((item, index) => {
        const block = document.createElement('div');
        block.className = `pfd-block ${item.type || ''}`;
        block.innerHTML = `<div class="pfd-title">${item.title}</div><div class="pfd-desc">${item.desc}</div>`;
        container.appendChild(block);

        if (index < items.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'pfd-arrow';
            arrow.innerHTML = '↓';
            container.appendChild(arrow);
        }
    });
}

function renderReportLedger(flow, fog, tds, cod, bod, ph, loadings, primary, bio) {
    const ledger = document.getElementById('resultsLedger');
    const warningContainer = document.getElementById('warningContainer');
    
    warningContainer.innerHTML = '';
    
    if (fog > 50) {
        warningContainer.innerHTML += `<div class="warning-banner">⚠️ <strong>FOG Override:</strong> High fats (${fog} mg/L) blind cell membranes. A DAF pre-stage was dynamically forced to clear lipids.</div>`;
    }
    if (tds > 5000) {
        warningContainer.innerHTML += `<div class="warning-banner">⚠️ <strong>Osmotic Hazard:</strong> Dissolved solids (${tds} mg/L) disrupt metabolic cell pressure. Requires specialized halophilic cultures.</div>`;
    }
    if (ph < 6.5 || ph > 8.5) {
        warningContainer.innerHTML += `<div class="warning-banner">⚠️ <strong>pH Warning:</strong> Target pH (${ph}) limits bacterial survival. Acid/caustic adjustment required in the EQ tank.</div>`;
    }

    ledger.innerHTML = `
        <h4>1. Mass Loading Calculations</h4>
        <ul>
            <li>Daily Treated Flow: <span class="output-highlight">${flow} m³/day</span></li>
            <li>Inbound Organic Weight: <span class="output-highlight">${Math.round(loadings.bodKgPerDay)} kg BOD/day</span></li>
            <li>Inbound Solids Mass: <span class="output-highlight">${Math.round(loadings.tssKgPerDay)} kg TSS/day</span></li>
            <li>COD/BOD Biodegradability Index: <span class="output-highlight">${(cod/bod).toFixed(1)}</span></li>
        </ul>

        <h4>2. Process Volumetric Footprints</h4>
        <ul>
            <li>Flash Coagulator Sizing: <span class="output-highlight">${primary.flashMixerM3} m³</span> (45s retention)</li>
            <li>Flocculator Sizing: <span class="output-highlight">${primary.flocculatorM3} m³</span> (25m retention)</li>
            <li>Primary Clarifier Surface Footprint: <span class="output-highlight">${primary.primaryClarifierAreaM2} m²</span></li>
            <li>Biological Reactor Footprint: <span class="output-highlight">${bio.tankVolumeM3} m³</span></li>
            <li>Hydraulic Retention Matrix: <span class="output-highlight">${bio.hrtHours} Hours</span></li>
        </ul>

        <h4>3. Chemical Dose Field Controls</h4>
        <p style="font-size: 12px; opacity:0.8; line-height:1.4; margin-top:5px;">
            Run standard lab Jar Tests using a 1-minute rapid spin at 100 RPM to evaluate charge neutralization, followed by 20 minutes slow paddle grouping at 30 RPM to lock in localized chemical scaling matrices.
        </p>
    `;
}

// Setup Event Listeners
document.getElementById('industryType').addEventListener('change', handleIndustryChange);

// The primary trigger execution point linked straight to our layout button element
document.getElementById('generateBtn').addEventListener('click', runDesignGeneration);