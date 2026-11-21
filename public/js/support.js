/**
 * Kisan AI — Interface 3: Farmer Helplines & Agricultural Knowledge Base
 * Features Verified Contacts, Direct WhatsApp Advisory, Govt Subsidy Calculator,
 * Comprehensive Guides & Web Speech Accessibility Read-Aloud.
 */

window.SupportModule = (function () {
  const booksData = [
    {
      id: 'b-wheat',
      title: 'Wheat Package of Practices (ਕਣਕ ਦੀ ਕਾਸ਼ਤ / गेहूं की खेती)',
      category: 'Rabi Crops',
      badge: 'PAU Ludhiana Certified',
      summary: 'Certified seed varieties (PBW 826, DBW 187), CRI crown root irrigation, fertilizer split & stripe rust protection.',
      readTime: '4 min read',
      content: `### 1. High-Yielding Recommended Cultivars
- **PBW 826:** Outstanding yield potential (24 q/acre), highly resistant to yellow & brown rust. Recommended sowing: Oct 25 to Nov 15.
- **DBW 187 (Karan Vandana) & DBW 303:** High heat tolerance during terminal grain-filling in March.
- **HD 3086 & HD 2967:** Verified benchmarks for central/northern Punjab & Haryana plains.
- **Seed Treatment:** Treat seed with Vitavax Power (carboxin + thiram) @ 2g/kg or *Trichoderma viride* @ 4g/kg to eliminate loose smut.

### 2. Critical Irrigation Stages (CRI Timing)
- **Crown Root Initiation (CRI) Stage:** First irrigation strictly at **20 to 25 days after sowing**. If delayed, tiller development is permanently impaired.
- **Jointing Stage:** 40 to 45 days after sowing.
- **Flowering / Anthesis Stage:** 70 to 75 days.
- **Milking / Grain Filling Stage:** 90 to 95 days. Avoid irrigating on windy days to prevent crop lodging.

### 3. Fertilizer Schedule (Per Acre)
- **At Sowing:** Drill 55 kg DAP + 20 kg Muriate of Potash (MOP 60% K2O) + 10 kg Zinc Sulfate (21%).
- **First Irrigation:** Broadcast 45 kg Urea (one third total nitrogen).
- **Second Irrigation:** Broadcast 45 kg Urea. Top-dressing must conclude within 50 days of sowing.

### 4. Yellow Stripe Rust (Puccinia striiformis) Early Warning
- Inspect lower canopy during foggy mornings in Jan-Feb. Look for linear yellow powdery pustules.
- **Emergency Treatment:** Spray Propiconazole 25% EC (Tilt 25 EC) @ 200 ml in 200 litres of water per acre using a flat-fan nozzle.`
    },
    {
      id: 'b-soil',
      title: 'Soil Health Card & NPK Balance (ਮਿੱਟੀ ਸਿਹਤ ਕਾਰਡ)',
      category: 'Soil Health',
      badge: 'ICAR Benchmark',
      summary: 'Interpreting soil pH, restoring Organic Carbon (OC), resolving zinc-sulfur deficiency, and avoiding urea toxicity.',
      readTime: '4 min read',
      content: `### 1. Key Soil Parameters in North India
- **Soil pH:** Ideal range for Indo-Gangetic alluvium is **6.5 to 7.8**. Soils above pH 8.5 require gypsum application (500 kg/acre).
- **Electrical Conductivity (EC):** Normal salinity is < 0.8 dS/m.
- **Organic Carbon (OC):** Target is > 0.5%. Low OC reduces water retention and microbial activity. Incorporate green manure (*Sesbania / Dhaincha*) every 2-3 years.

### 2. Balanced NPK Ratio (4 : 2 : 1)
- Overuse of nitrogenous fertilizer (Urea) causes succulent, tender foliage that attracts aphids and blast spores.
- Always apply DAP at or before drilling seeds, never broadcast over standing wet crops.

### 3. Resolving Zinc & Micronutrient Deficiencies
- Zinc deficiency causes yellowing of leaf midrib and bronze-brown spotting 2–3 weeks after emergence.
- Apply Heptahydrate Zinc Sulfate 21% @ 10 kg/acre or Monohydrate Zinc Sulfate 33% @ 6.5 kg/acre.
- **Crucial Rule:** Never mix Zinc Sulfate directly with DAP in the same hopper; insoluble zinc phosphate precipitates.`
    },
    {
      id: 'b-paddy',
      title: 'Paddy Water Conservation & AWD Guide (ਝੋਨੇ ਵਿੱਚ ਪਾਣੀ ਬਚਾਓ)',
      category: 'Kharif Crops',
      badge: 'Water Table Protection',
      summary: 'Alternate Wetting and Drying (AWD) field tube, Tar-Vattar DSR direct seeding, and disease prevention.',
      readTime: '5 min read',
      content: `### 1. The Groundwater Crisis in Punjab & Haryana
- Flooded rice cultivation consumes ~3,500 to 5,000 litres of water per kilogram of milled rice.
- The **Alternate Wetting & Drying (AWD)** method saves up to **25–30% water** without any yield penalty.

### 2. Installing the AWD Field Water Tube (Pani Tube)
- Install a 30 cm long perforated PVC tube (10 cm diameter) 20 cm into the paddy soil.
- Irrigate only when the standing water drops **5 cm below the soil surface** in the observation tube.
- Maintain shallow standing water (2-3 cm) strictly during flowering and panicle initiation.

### 3. Tar-Vattar Direct Seeded Rice (DSR)
- Direct drill primed seed of PR-126 or other short-duration varieties in tar-vattar (good moisture) soil with a Lucky Seed Drill.
- Saves 35% pumping diesel/electricity and avoids hardpan compaction for subsequent wheat.`
    },
    {
      id: 'b-pest',
      title: 'Integrated Pest Management (IPM) & Bio-Controls',
      category: 'Pest Control',
      badge: 'Eco-Friendly Farming',
      summary: 'Pheromone traps, yellow/blue sticky cards, neem-based bio-pesticides, and pollinator safety.',
      readTime: '4 min read',
      content: `### 1. Ecological Principles of IPM
- **Economic Threshold Level (ETL):** Never apply broad-spectrum chemicals until pest population crosses economic damage thresholds.
- **Beneficial Predators:** Spiders, Ladybird beetles, and *Chrysoperla carnea* naturally consume aphids and whitefly nymphs.

### 2. Physical & Trapping Controls
- **Yellow Sticky Traps (10–12 per acre):** Traps whiteflies, aphids, and leafminers.
- **Blue Sticky Traps (8–10 per acre):** Attracts and captures thrips.
- **Pheromone Traps:** Highly effective for Pink Bollworm in cotton and Stem Borer in paddy.

### 3. Preparation of 5% Neem Seed Kernel Extract (NSKE)
- Grind 5 kg good quality neem seed kernels into fine powder.
- Soak in 10 litres of water overnight; filter through fine cloth.
- Add 100g of soap flakes as a wetting agent, dilute to 100 litres of water for field spraying.`
    },
    {
      id: 'b-mustard',
      title: 'Mustard & Raya Production Guide (ਸਰ੍ਹੋਂ / राया की खेती)',
      category: 'Rabi Crops',
      badge: 'High Oil Content',
      summary: 'Varieties (Giriraj, RCH 1, Pusa Bold), sulfur application for oil percentage, and aphid (chepa) management.',
      readTime: '4 min read',
      content: `### 1. Recommended Varieties & Sowing
- **Giriraj & RCH 1:** High yielding with 39-41% oil content.
- **Sowing Window:** October 1 to October 25 for maximum vegetative branching before winter frost.
- **Seed Rate:** 1.5 to 2.0 kg per acre. Thin seedlings 15 days after germination to maintain 12-15 cm intra-row spacing.

### 2. Fertilizer & Sulfur Requirement
- Apply 80 kg Single Super Phosphate (SSP) + 40 kg Urea at sowing.
- **Sulfur is Essential:** Apply 10 kg elemental sulfur or bentonite sulfur per acre to raise oil percentage by 2-3%.

### 3. Mustard Aphid (Lipaphis erysimi) Control
- Inspect floral twigs when temperatures rise in Feb.
- **Remedy:** Spray Thiamethoxam 25% WG @ 40g in 150 litres of water per acre during late afternoon to protect foraging honeybees.`
    },
    {
      id: 'b-schemes',
      title: 'Central & State Agricultural Schemes Manual (ਸਰਕਾਰੀ ਸਕੀਮਾਂ)',
      category: 'Govt Schemes',
      badge: 'Farmer Entitlements',
      summary: 'PM-KISAN DBT norms, PMFBY crop insurance claims, 60% Solar Pump subsidy, and CRM machinery subsidies.',
      readTime: '5 min read',
      content: `### 1. PM-KISAN Samman Nidhi
- ₹6,000 direct income support per year in 3 equal installments of ₹2,000 directly into Aadhaar-seeded bank accounts.
- **Mandatory:** Aadhaar e-KYC (biometric via CSC or face authentication via PM-KISAN App) and land record seeding.
- Toll-free helpline: **155261**.

### 2. Crop Residue Management (CRM / SMAM)
- **50% Subsidy for Individual Farmers** on Super Seeder, Happy Seeder, Paddy Straw Chopper, and Mulcher.
- **80% Subsidy for Custom Hiring Centers (CHCs)** and Farmer Producer Organizations (FPOs) up to ₹10 Lakhs.
- Apply online at **agrimachinery.nic.in**.

### 3. PM-KUSUM Solar Agricultural Pumps
- **60% Combined Subsidy** (30% Central + 30% State Govt) for standalone solar pumps (3 HP to 7.5 HP) replacing diesel generator sets. Farmer contributes 40% (or only 10% with a bank loan).`
    }
  ];

  let currentCategory = 'all';
  let searchQuery = '';

  function renderBooks() {
    const grid = document.getElementById('books-grid');
    if (!grid) return;

    const filtered = booksData.filter(b => {
      const matchCat = currentCategory === 'all' || b.category.toLowerCase() === currentCategory.toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || b.title.toLowerCase().includes(q) || b.summary.toLowerCase().includes(q) || b.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
          <p class="text-sm font-semibold">No agricultural guides match your search filter.</p>
          <button type="button" id="clear-search-btn" class="mt-2 text-xs font-bold text-green-700 hover:underline">Clear Search &amp; Show All</button>
        </div>
      `;
      document.getElementById('clear-search-btn')?.addEventListener('click', () => {
        searchQuery = '';
        currentCategory = 'all';
        const input = document.getElementById('book-search-input');
        if (input) input.value = '';
        renderBooks();
      });
      return;
    }

    grid.innerHTML = filtered.map(b => `
      <div class="agri-card p-5 flex flex-col justify-between group hover:border-emerald-400 transition-all">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">${b.category}</span>
            <span class="text-[11px] font-semibold text-slate-400">${b.readTime}</span>
          </div>
          <h4 class="text-sm font-extrabold text-slate-900 group-hover:text-emerald-800 transition">${b.title}</h4>
          <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">${b.summary}</p>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span class="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">${b.badge}</span>
          <button type="button" data-book-id="${b.id}" class="open-book-btn px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs">
            <span>📖</span><span>Read Guide</span>
          </button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.open-book-btn').forEach(btn => {
      btn.addEventListener('click', () => openBookModal(btn.dataset.bookId));
    });
  }

  function openBookModal(bookId) {
    const book = booksData.find(b => b.id === bookId);
    if (!book) return;

    const modal = document.getElementById('book-modal');
    const catEl = document.getElementById('modal-book-cat');
    const titleEl = document.getElementById('modal-book-title');
    const contentEl = document.getElementById('modal-book-content');

    if (catEl) catEl.textContent = `${book.category} • ${book.badge}`;
    if (titleEl) titleEl.textContent = book.title;

    if (contentEl) {
      const htmlContent = book.content
        .replace(/^### (.*$)/gim, '<h4 class="text-sm font-bold text-slate-900 mt-3 mb-1.5 border-b border-slate-200/60 pb-1">$1</h4>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-slate-900 font-extrabold">$1</strong>')
        .replace(/^- (.*$)/gim, '<li class="flex items-start gap-2 text-xs text-slate-700 my-1"><span class="text-emerald-700 font-bold shrink-0">•</span><span>$1</span></li>');
      contentEl.innerHTML = htmlContent;
    }

    if (modal) modal.classList.remove('hidden');

    const readBtn = document.getElementById('modal-read-aloud-btn');
    if (readBtn) {
      readBtn.onclick = () => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const cleanText = book.content.replace(/[#*\-]/g, ' ');
          const utter = new SpeechSynthesisUtterance(cleanText);
          utter.lang = 'en-IN';
          window.speechSynthesis.speak(utter);
          window.KisanApp?.showToast('Audio Narration', 'Reading agricultural guide aloud...', 'info');
        }
      };
    }
  }

  function closeBookModal() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    document.getElementById('book-modal')?.classList.add('hidden');
  }

  // Deep Official 2026 Govt Subsidies & Benefits Calculator
  function calculateSubsidy() {
    const acresInput = document.getElementById('subsidy-acres-input');
    const categorySelect = document.getElementById('subsidy-farmer-cat');
    const cropSelect = document.getElementById('subsidy-crop-season');
    const machineSelect = document.getElementById('subsidy-machinery');
    const displayBox = document.getElementById('subsidy-results-display');

    if (!displayBox) return;

    const acres = parseFloat(acresInput ? acresInput.value : 3) || 3;
    const cat = categorySelect ? categorySelect.value : 'small';
    const season = cropSelect ? cropSelect.value : 'rabi';
    const machine = machineSelect ? machineSelect.value : 'seeder';

    // 1. PM-KISAN
    const pmKisanAnnual = 6000;

    // 2. PMFBY Crop Insurance
    const sumInsuredPerAcre = 35000;
    const totalSumInsured = acres * sumInsuredPerAcre;
    const premiumRate = season === 'rabi' ? 0.015 : 0.02; // 1.5% Rabi (Wheat/Mustard), 2.0% Kharif (Paddy/Cotton)
    const farmerPremium = Math.round(totalSumInsured * premiumRate);
    const govtPremiumSubsidy = Math.round(totalSumInsured * 0.10); // Approx 10% actuarial premium paid by govt

    // 3. Machinery / Asset Subsidy
    let machineName = 'None Selected';
    let machineSubsidy = '₹0';
    let machineNote = 'Select an equipment to view scheme entitlement';

    if (machine === 'seeder') {
      machineName = 'Super Seeder / Happy Seeder';
      machineSubsidy = cat === 'large' ? '₹1,00,000 (40%)' : '₹1,15,000 (50% Subsidy)';
      machineNote = 'Under Central Crop Residue Management (CRM) Scheme';
    } else if (machine === 'solar') {
      machineName = 'PM-KUSUM Solar Agricultural Pump (5 HP)';
      machineSubsidy = '60% Combined Subsidy (~₹1,80,000)';
      machineNote = '30% Central + 30% State Govt subsidy (Farmer pays 40%)';
    } else if (machine === 'drip') {
      machineName = 'Micro-Irrigation Drip / Sprinkler';
      const dripSubPerAcre = cat === 'large' ? 22000 : 28000; // 55% for small/marginal, 45% for others
      const totalDripSub = Math.round(acres * dripSubPerAcre);
      machineSubsidy = `₹${totalDripSub.toLocaleString('en-IN')} (55% Subsidy)`;
      machineNote = 'Under PMKSY Per Drop More Crop';
    }

    // 4. Kisan Credit Card (KCC) Limit (Effective 4% interest)
    const scaleOfFinancePerAcre = 38000;
    const rawKccLimit = Math.min(300000, Math.round(acres * scaleOfFinancePerAcre));
    const kccLimitFormatted = `₹${rawKccLimit.toLocaleString('en-IN')} at 4% Interest`;

    displayBox.innerHTML = `
      <div class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <!-- Card 1: PM-KISAN DBT -->
          <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span class="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">PM-KISAN DBT</span>
            <div class="text-base font-extrabold text-emerald-950 font-mono-numbers mt-1">₹${pmKisanAnnual.toLocaleString('en-IN')} / Year</div>
            <div class="text-[11px] text-emerald-800 mt-0.5">3 installments of ₹2,000 directly via Aadhaar bank seeding.</div>
          </div>

          <!-- Card 2: PMFBY Crop Insurance -->
          <div class="p-3.5 rounded-2xl bg-blue-50 border border-blue-200">
            <span class="text-[10px] font-extrabold uppercase text-blue-800 tracking-wider">PMFBY Coverage (${season === 'rabi' ? 'Rabi 1.5%' : 'Kharif 2%'})</span>
            <div class="text-base font-extrabold text-blue-950 font-mono-numbers mt-1">₹${totalSumInsured.toLocaleString('en-IN')}</div>
            <div class="text-[11px] text-blue-800 mt-0.5">Your Premium: <strong>₹${farmerPremium.toLocaleString('en-IN')}</strong> (Govt pays ₹${govtPremiumSubsidy.toLocaleString('en-IN')})</div>
          </div>

          <!-- Card 3: Machinery Subsidy -->
          <div class="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
            <span class="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">Machinery / Pump Subsidy</span>
            <div class="text-base font-extrabold text-amber-950 font-mono-numbers mt-1">${machineSubsidy}</div>
            <div class="text-[11px] text-amber-800 mt-0.5 truncate">${machineName}: ${machineNote}</div>
          </div>

          <!-- Card 4: KCC Loan Limit -->
          <div class="p-3.5 rounded-2xl bg-purple-50 border border-purple-200">
            <span class="text-[10px] font-extrabold uppercase text-purple-800 tracking-wider">KCC Low-Interest Credit</span>
            <div class="text-base font-extrabold text-purple-950 font-mono-numbers mt-1">${kccLimitFormatted}</div>
            <div class="text-[11px] text-purple-800 mt-0.5">Scale of Finance for ${acres} Acres. 3% prompt repayment rebate.</div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-100">
          <span>Official Portal Links:</span>
          <div class="flex gap-2">
            <a href="https://pmkisan.gov.in" target="_blank" rel="noopener noreferrer" class="font-bold text-emerald-700 hover:underline">pmkisan.gov.in ↗</a>
            <span>•</span>
            <a href="https://pmfby.gov.in" target="_blank" rel="noopener noreferrer" class="font-bold text-blue-700 hover:underline">pmfby.gov.in ↗</a>
            <span>•</span>
            <a href="https://agrimachinery.nic.in" target="_blank" rel="noopener noreferrer" class="font-bold text-amber-700 hover:underline">agrimachinery.nic.in ↗</a>
          </div>
        </div>
      </div>
    `;
  }

  function init() {
    renderBooks();

    document.getElementById('book-search-input')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderBooks();
    });

    document.querySelectorAll('.book-cat-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.book-cat-filter').forEach(b => {
          b.classList.remove('bg-emerald-700', 'text-white');
          b.classList.add('bg-slate-100', 'text-slate-700');
        });
        btn.classList.remove('bg-slate-100', 'text-slate-700');
        btn.classList.add('bg-emerald-700', 'text-white');
        currentCategory = btn.dataset.category || 'all';
        renderBooks();
      });
    });

    document.getElementById('close-book-modal')?.addEventListener('click', closeBookModal);
    document.getElementById('close-book-modal-btn')?.addEventListener('click', closeBookModal);

    document.querySelectorAll('.call-trigger').forEach(el => {
      el.addEventListener('click', () => {
        const number = el.dataset.call;
        window.KisanApp?.showToast('Initiating Call', `Dialing ${number} via phone dialer...`, 'success');
      });
    });

    document.querySelectorAll('.sms-trigger').forEach(el => {
      el.addEventListener('click', () => {
        const number = el.dataset.sms;
        window.KisanApp?.showToast('Composing SMS', `Opening SMS messenger for ${number}...`, 'info');
      });
    });

    // Subsidy calculator event listeners
    document.getElementById('subsidy-acres-input')?.addEventListener('input', calculateSubsidy);
    document.getElementById('subsidy-farmer-cat')?.addEventListener('change', calculateSubsidy);
    document.getElementById('subsidy-crop-season')?.addEventListener('change', calculateSubsidy);
    document.getElementById('subsidy-machinery')?.addEventListener('change', calculateSubsidy);
    calculateSubsidy();
  }

  return {
    init,
    openBook: openBookModal,
    closeBook: closeBookModal
  };
})();
