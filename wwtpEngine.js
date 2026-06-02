// wwtpEngine.js - The Core Engineering & Math Brain of our WWTP Designer

// 1. Intelligent Default Database (Metcalf & Eddy Source Benchmarks)
const INDUSTRY_DEFAULTS = {
    MUNICIPAL: { name: "Municipal Sewage", bod: 200, tss: 210, cod: 430, fog: 30, tds: 400, ph: 7.2 },
    DAIRY:     { name: "Dairy & Food Processing", bod: 2500, tss: 800, cod: 4500, fog: 400, tds: 1200, ph: 5.0 },
    TEXTILE:   { name: "Textile & Dyeing Industry", bod: 300, tss: 400, cod: 1200, fog: 20, tds: 6000, ph: 10.0 },
    PETROCHEM: { name: "Refinery & Petrochemical", bod: 250, tss: 150, cod: 800, fog: 500, tds: 3000, ph: 6.8 }
};

// 2. Target Effluent Quality Rules based on Design Objectives
const DESIGN_GOALS = {
    DISCHARGE: { name: "Environmental Discharge", targetBOD: 20, targetTSS: 20 },
    REUSE:     { name: "Industrial/Irrigation Reuse", targetBOD: 5, targetTSS: 5 },
    ZLD:       { name: "Zero Liquid Discharge", targetBOD: 0, targetTSS: 0, requiresThermal: true }
};

// 3. The Calculator Engine Class
class WastewaterInfluent {
    constructor(flow, bod, tss, cod, industryType) {
        this.flow = flow; // m³ per day
        this.industryType = industryType;
        
        // Use user input if provided, otherwise fall back to our Intelligent Facts Database
        const defaults = INDUSTRY_DEFAULTS[industryType] || INDUSTRY_DEFAULTS.MUNICIPAL;
        this.bod = bod || defaults.bod;
        this.tss = tss || defaults.tss;
        this.cod = cod || defaults.cod;
        this.fog = defaults.fog; // Pulling profile facts for experience layer
        this.tds = defaults.tds;
        this.ph = defaults.ph;
    }

    // Calculate total daily pollution weight in kilograms (Mass Loadings)
    getDailyMassLoadings() {
        return {
            bodKgPerDay: (this.flow * this.bod) / 1000,
            tssKgPerDay: (this.flow * this.tss) / 1000,
            codKgPerDay: (this.flow * this.cod) / 1000
        };
    }

    // Preliminary & Primary Sizing Calculations
    calculatePrimaryStages() {
        // Flash Mixer (Coagulation): 45 seconds Hydraulic Retention Time (HRT)
        const flashMixerVolumeM3 = (this.flow / 24 / 3600) * 45; 
        
        // Flocculation Tank: 25 minutes HRT for gentle macrofloc growth
        const flocTankVolumeM3 = (this.flow / 24 / 60) * 25;

        // Primary Clarifier: Sized on Surface Overflow Rate (SOR) of 35 m³/m²·day
        const clarifierAreaM2 = this.flow / 35;

        return {
            flashMixerM3: Math.round(flashMixerVolumeM3 * 100) / 100,
            flocculatorM3: Math.round(flocTankVolumeM3 * 10) / 10,
            primaryClarifierAreaM2: Math.round(clarifierAreaM2 * 10) / 10
        };
    }

    // Secondary Biological Basin Calculations (Metcalf & Eddy Equations)
    calculateAerationTank(goalKey) {
        const selectedGoal = DESIGN_GOALS[goalKey] || DESIGN_GOALS.DISCHARGE;

        // Kinetic Constants
        const SRT = 10;       // Sludge Age (days)
        const Y = 0.6;        // Yield Coefficient
        const b = 0.06;       // Decay Coefficient
        const MLVSS = 2500;   // Biomass concentration (mg/L)

        const effluentBOD = selectedGoal.targetBOD;

        // Metcalf & Eddy Formula: Volume = (Flow * SRT * Y * (InfluentBOD - EffluentBOD)) / (MLVSS * (1 + b*SRT))
        const numerator = this.flow * SRT * Y * (this.bod - effluentBOD);
        const denominator = MLVSS * (1 + (b * SRT));
        const requiredVolume = numerator / denominator;

        // Calculate HRT in hours
        const hrtHours = (requiredVolume / this.flow) * 24;

        return {
            tankVolumeM3: Math.round(requiredVolume),
            hrtHours: Math.round(hrtHours * 10) / 10,
            mlvssMgl: MLVSS
        };
    }
}