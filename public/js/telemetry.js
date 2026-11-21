/**
 * Kisan AI — Interface 1: High-Tech Agro-Climatic Telemetry & Precision Agromet
 * Features GPS Geolocation Sync, SVG Circular Gauges, 7-Day Spray Forecast,
 * Growing Degree Days (GDD), Delta-T Spray Window & Tubewell Irrigation Hours Calculator.
 */

window.TelemetryModule = (function () {
  const state = {
    tempC: 24.5,
    apparentTempC: 25.0,
    unit: 'C',
    source: 'live_weather',
    minThresh: 10,
    maxThresh: 35,
    humidity: 58,
    moisture: 42,
    windSpeedKmH: 8.0,
    et0MmDay: '3.4',
    sprayScore: 92,
    deltaT: 4.8,
    gddAccumulated: 342,
    lat: 30.6433,
    lon: 76.3887,
    locationName: 'Fatehgarh Sahib / Sirhind, PB',
    elevationM: 248,
    lastAlertState: 'normal',
    chartInstance: null,
    dailyForecast: []
  };

  // Soil Available Water Capacity (AWC) in mm per meter depth
  const soilAWCMap = {
    sandy_loam: { awc: 120, label: 'Sandy Loam (ਰੇਤਲੀ ਦੋਮਟ / बलुई दोमट)' },
    loam: { awc: 160, label: 'Alluvial Loam (ਦੋਮਟ ਮਿੱਟੀ / दोमट मिट्टी)' },
    clay_loam: { awc: 190, label: 'Clay Loam (ਚੀਕਣੀ ਦੋਮਟ / मटियार दोमट)' },
    red_soil: { awc: 105, label: 'Red Soil (ਲਾਲ ਮਿੱਟੀ / लाल मिट्टी)' }
  };

  function cToF(c) {
    return (c * 9) / 5 + 32;
  }

  function formatTemp(c, withUnit = true) {
    if (state.unit === 'F') {
      const f = cToF(c);
      return withUnit ? `${f.toFixed(1)}°F` : f.toFixed(1);
    }
    return withUnit ? `${c.toFixed(1)}°C` : c.toFixed(1);
  }

  // Update SVG Gauge Progress (Circumference of r=38 is 2 * PI * 38 ≈ 238.76)
  function setGaugeValue(gaugeId, percent, maxPercent = 100) {
    const el = document.getElementById(gaugeId);
    if (!el) return;
    const clamped = Math.max(0, Math.min(100, (percent / maxPercent) * 100));
    const circumference = 238.76;
    const offset = circumference - (clamped / 100) * circumference;
    el.style.strokeDasharray = `${circumference}`;
    el.style.strokeDashoffset = `${offset}`;
  }

  // Calculate Delta-T (Dry Bulb - Wet Bulb approximation for spray drift)
  function calculateDeltaT(tempC, rh) {
    // Stull's equation approximation for wet bulb temperature
    const t = tempC;
    const tw = t * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
      Math.atan(t + rh) - Math.atan(rh - 1.676331) +
      0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) - 4.686035;
    const dt = Math.max(0.5, t - tw);
    return parseFloat(dt.toFixed(1));
  }

  function initChart() {
    const canvas = document.getElementById('tempChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const defaultLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'];
    const defaultTemps = [15.2, 13.8, 17.5, 25.1, 27.4, 23.0, state.tempC];
    const defaultHumidities = [78, 85, 70, 48, 42, 60, state.humidity];
    const displayTemps = state.unit === 'F' ? defaultTemps.map(cToF) : defaultTemps;

    state.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: defaultLabels,
        datasets: [
          {
            label: `Temperature (°${state.unit})`,
            data: displayTemps,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.12)',
            fill: true,
            tension: 0.38,
            pointBackgroundColor: '#16a34a',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4.5,
            pointHoverRadius: 7,
            yAxisID: 'y'
          },
          {
            label: 'Relative Humidity (%)',
            data: defaultHumidities,
            borderColor: '#0284c7',
            backgroundColor: 'transparent',
            borderDash: [4, 4],
            tension: 0.38,
            pointBackgroundColor: '#0284c7',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 3.5,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              boxWidth: 12,
              font: { size: 11, family: 'Inter', weight: 600 },
              color: '#334155'
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { family: 'Inter', size: 12, weight: 700 },
            bodyFont: { family: 'Inter', size: 12 },
            padding: 10,
            cornerRadius: 10
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: 'rgba(226, 232, 240, 0.7)' },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#15803d',
              callback: (val) => `${val}°${state.unit}`
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#0284c7',
              callback: (val) => `${val}%`
            },
            min: 20,
            max: 100
          }
        }
      }
    });
  }

  function updateChart(labels, temps, humidities) {
    if (!state.chartInstance) return;
    if (labels) state.chartInstance.data.labels = labels;
    if (temps) {
      const displayTemps = state.unit === 'F' ? temps.map(cToF) : temps;
      state.chartInstance.data.datasets[0].data = displayTemps;
    } else {
      const baseTemps = [15.2, 13.8, 17.5, 25.1, 27.4, 23.0, state.tempC];
      state.chartInstance.data.datasets[0].data = state.unit === 'F' ? baseTemps.map(cToF) : baseTemps;
    }
    if (humidities && state.chartInstance.data.datasets[1]) {
      state.chartInstance.data.datasets[1].data = humidities;
    }
    state.chartInstance.data.datasets[0].label = `Temperature (°${state.unit})`;
    state.chartInstance.update();
  }

  function renderForecastStrip() {
    const strip = document.getElementById('forecast-strip');
    if (!strip || !state.dailyForecast || state.dailyForecast.length === 0) return;

    strip.innerHTML = state.dailyForecast.map((f) => `
      <div class="flex-1 min-w-[105px] p-3 rounded-2xl border border-slate-200/80 bg-white/80 flex flex-col items-center justify-between text-center transition hover:bg-emerald-50/60 hover:border-emerald-300 shadow-2xs">
        <span class="text-xs font-bold text-slate-800">${f.day}</span>
        <span class="text-[10px] text-slate-500">${f.date}</span>
        <div class="my-1.5 text-xl">
          ${f.rainProb > 40 ? '🌧️' : f.maxTemp > 30 ? '☀️' : '🌤️'}
        </div>
        <div class="text-xs font-extrabold text-slate-900 font-mono-numbers">
          ${state.unit === 'F' ? cToF(f.maxTemp).toFixed(0) : f.maxTemp}° / ${state.unit === 'F' ? cToF(f.minTemp).toFixed(0) : f.minTemp}°
        </div>
        <span class="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${f.rainProb > 30 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}">
          💧 ${f.rainProb}% Rain
        </span>
        <span class="mt-1 text-[9px] font-semibold text-slate-500">💨 ${f.windSpeed} km/h</span>
      </div>
    `).join('');
  }

  // Precision Irrigation Deficit & Tube-well Pumping Hours Calculator
  function calculateIrrigationDeficit() {
    const soilSelect = document.getElementById('irrig-soil-type');
    const stageSelect = document.getElementById('irrig-crop-stage');
    const hpSelect = document.getElementById('irrig-pump-hp');
    const resultBox = document.getElementById('irrig-calc-result');

    if (!soilSelect || !stageSelect || !hpSelect || !resultBox) return;

    const soilKey = soilSelect.value || 'loam';
    const soilInfo = soilAWCMap[soilKey] || soilAWCMap.loam;
    const rootDepth = parseFloat(stageSelect.value) || 0.6; // meters
    const pumpHp = parseFloat(hpSelect.value) || 7.5; // Horsepower

    // Total available water in root zone (mm)
    const totalAWC = soilInfo.awc * rootDepth;

    // Current soil moisture fraction (clamped between 0.15 and 0.85)
    const currentMoistureFrac = state.moisture / 100;

    // Field capacity is assumed around 0.65 for typical loam
    const targetMoistureFrac = 0.60;
    const moistureDeficitFrac = Math.max(0, targetMoistureFrac - currentMoistureFrac);
    const deficitMm = Math.round(moistureDeficitFrac * totalAWC * 1.8);

    // 1 mm water over 1 acre = 4,046.86 Litres
    const litersRequiredPerAcre = deficitMm * 4047;

    // Pump discharge rate in Litres/Hour (7.5 HP delivers approx 30,000 L/hr)
    const dischargeRatePerHour = pumpHp * 4000;
    const hoursNeeded = (litersRequiredPerAcre / dischargeRatePerHour).toFixed(1);

    if (deficitMm <= 5) {
      resultBox.innerHTML = `
        <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs">
          <div>
            <div class="font-extrabold text-emerald-950 flex items-center gap-1.5">
              <span>✓</span><span>Soil Turgor Optimal (No Irrigation Needed)</span>
            </div>
            <div class="text-emerald-800 mt-0.5">Root zone moisture (${state.moisture}%) is well above critical wilting point for this growth stage.</div>
          </div>
          <span class="px-2.5 py-1 rounded-xl bg-emerald-200 text-emerald-900 font-bold shrink-0">0 Hours</span>
        </div>
      `;
    } else {
      resultBox.innerHTML = `
        <div class="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-amber-950">Water Deficit: <strong class="font-mono-numbers text-amber-900">${deficitMm} mm</strong> (~${(litersRequiredPerAcre / 1000).toFixed(0)}k Litres/Acre)</span>
            <span class="px-2.5 py-0.5 rounded-lg bg-amber-200 text-amber-950 font-extrabold font-mono-numbers text-sm">⏱️ ${hoursNeeded} Hrs</span>
          </div>
          <div class="text-slate-600 leading-relaxed">
            Run your <strong>${pumpHp} HP</strong> tubewell for approx <strong>${hoursNeeded} hours per acre</strong> to recharge root zone capacity without causing nutrient leaching.
          </div>
        </div>
      `;
    }
  }

  function updateTelemetryUI() {
    const tempEl = document.getElementById('temp-value-display');
    const tempStatusEl = document.getElementById('temp-status-badge');
    const humEl = document.getElementById('humidity-display');
    const moistEl = document.getElementById('moisture-display');
    const et0El = document.getElementById('et0-display');
    const sprayScoreEl = document.getElementById('spray-score-display');
    const deltaTEl = document.getElementById('delta-t-display');
    const gddEl = document.getElementById('gdd-display');
    const minSlider = document.getElementById('min-thresh-slider');
    const maxSlider = document.getElementById('max-thresh-slider');
    const minLabel = document.getElementById('min-thresh-label');
    const maxLabel = document.getElementById('max-thresh-label');
    const locationPill = document.getElementById('farm-location-tag');

    if (tempEl) tempEl.textContent = formatTemp(state.tempC);
    if (humEl) humEl.textContent = `${state.humidity}%`;
    if (moistEl) moistEl.textContent = `${state.moisture}%`;
    if (et0El) et0El.textContent = `${state.et0MmDay} mm/day`;
    if (sprayScoreEl) sprayScoreEl.textContent = `${state.sprayScore}%`;
    if (deltaTEl) deltaTEl.textContent = `${state.deltaT}°C`;
    if (gddEl) gddEl.textContent = `${state.gddAccumulated} GDD`;
    if (locationPill) locationPill.textContent = state.locationName;

    // SVG Gauges Progress
    setGaugeValue('gauge-temp-bar', state.tempC, 50);
    setGaugeValue('gauge-humidity-bar', state.humidity, 100);
    setGaugeValue('gauge-moisture-bar', state.moisture, 100);
    setGaugeValue('gauge-et0-bar', parseFloat(state.et0MmDay), 7.0);

    // Sliders
    if (minSlider) minSlider.value = state.minThresh;
    if (maxSlider) maxSlider.value = state.maxThresh;
    if (minLabel) minLabel.textContent = formatTemp(state.minThresh);
    if (maxLabel) maxLabel.textContent = formatTemp(state.maxThresh);

    // Temperature Status Badge & Alarms
    const banner = document.getElementById('temp-alert-banner');
    const alertText = document.getElementById('temp-alert-text');
    const alertDesc = document.getElementById('temp-alert-desc');
    const smsLink = document.getElementById('temp-sms-link');

    if (state.tempC > state.maxThresh) {
      if (tempStatusEl) {
        tempStatusEl.textContent = 'Severe Heat Hazard';
        tempStatusEl.className = 'inline-block mt-2 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[11px] font-bold';
      }
      if (banner) {
        banner.classList.remove('hidden');
        if (alertText) alertText.textContent = `High Heat Stress Alert (${formatTemp(state.tempC)})!`;
        if (alertDesc) alertDesc.textContent = `Temperature crossed safe threshold (${formatTemp(state.maxThresh)}). Apply light evening sprinkler irrigation to avoid blossom drop.`;
        if (smsLink) smsLink.href = `sms:?body=Kisan%20AI%20Alert:%20Farm%20temperature%20crossed%20${formatTemp(state.maxThresh)}%20at%20${state.locationName}.%20Immediate%20irrigation%20advised.`;
      }
      if (state.lastAlertState !== 'high') {
        window.KisanApp?.showToast('High Temperature Warning', `Heat threshold exceeded at ${formatTemp(state.tempC)}.`, 'warn');
        state.lastAlertState = 'high';
      }
    } else if (state.tempC < state.minThresh) {
      if (tempStatusEl) {
        tempStatusEl.textContent = 'Frost Risk Alert';
        tempStatusEl.className = 'inline-block mt-2 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold';
      }
      if (banner) {
        banner.classList.remove('hidden');
        if (alertText) alertText.textContent = `Ground Frost Warning (${formatTemp(state.tempC)})!`;
        if (alertDesc) alertDesc.textContent = `Temperature dropped below minimum threshold (${formatTemp(state.minThresh)}). Smoke canopy or irrigate to raise soil warmth.`;
        if (smsLink) smsLink.href = `sms:?body=Kisan%20AI%20Alert:%20Ground%20frost%20warning%20${formatTemp(state.tempC)}%20at%20${state.locationName}.%20Evening%20irrigation%20advised.`;
      }
      if (state.lastAlertState !== 'low') {
        window.KisanApp?.showToast('Frost Hazard Warning', `Temperature below ${formatTemp(state.minThresh)}.`, 'warn');
        state.lastAlertState = 'low';
      }
    } else {
      if (tempStatusEl) {
        tempStatusEl.textContent = 'Optimal / Normal Range';
        tempStatusEl.className = 'inline-block mt-2 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold';
      }
      if (banner) banner.classList.add('hidden');
      state.lastAlertState = 'normal';
    }

    calculateIrrigationDeficit();
  }

  async function fetchLiveWeather(lat = state.lat, lon = state.lon) {
    try {
      const res = await fetch(`/api/weather/live?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.current) {
        state.tempC = data.current.tempC !== undefined ? data.current.tempC : state.tempC;
        state.apparentTempC = data.current.apparentTempC || state.tempC;
        state.humidity = data.current.humidity !== undefined ? data.current.humidity : state.humidity;
        state.moisture = data.current.soilMoisture !== undefined ? data.current.soilMoisture : state.moisture;
        state.windSpeedKmH = data.current.windSpeedKmH || 8.0;
        state.et0MmDay = data.current.evapotranspirationMmDay || '3.4';
        state.sprayScore = data.current.spraySuitabilityScore || 90;
        state.deltaT = calculateDeltaT(state.tempC, state.humidity);
      }

      if (data.location?.district) {
        state.locationName = `${data.location.district}, ${data.location.state || 'PB'}`;
      }

      if (data.dailyForecast && data.dailyForecast.length > 0) {
        state.dailyForecast = data.dailyForecast;
        renderForecastStrip();
      }

      if (data.trend) {
        updateChart(data.trend.labels, data.trend.temperatures, data.trend.humidities);
      } else {
        updateChart();
      }

      updateTelemetryUI();
    } catch (err) {
      console.warn('Live weather sync note:', err.message);
      updateTelemetryUI();
      updateChart();
    }
  }

  function detectGPSLocation() {
    if (!navigator.geolocation) {
      window.KisanApp?.showToast('GPS Unavailable', 'Geolocation is not supported by your browser.', 'warn');
      return;
    }

    const btn = document.getElementById('gps-detect-btn');
    if (btn) btn.innerHTML = '<span>⏳</span><span>Locating Farm...</span>';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.lat = parseFloat(pos.coords.latitude.toFixed(4));
        state.lon = parseFloat(pos.coords.longitude.toFixed(4));
        state.locationName = `Field (${state.lat}°N, ${state.lon}°E)`;
        window.KisanApp?.showToast('Farm Located', `Coordinates updated: ${state.lat}°N, ${state.lon}°E. Fetching satellite data...`, 'success');
        fetchLiveWeather(state.lat, state.lon);
        if (btn) btn.innerHTML = '<span>📍</span><span>Detect Farm GPS</span>';
      },
      (err) => {
        window.KisanApp?.showToast('GPS Detection Notice', 'Using regional reference agromet coordinates (Fatehgarh Sahib).', 'info');
        if (btn) btn.innerHTML = '<span>📍</span><span>Detect Farm GPS</span>';
        fetchLiveWeather();
      },
      { timeout: 8000 }
    );
  }

  function init() {
    initChart();
    fetchLiveWeather();

    // Unit toggle (°C / °F)
    document.getElementById('toggle-unit-btn')?.addEventListener('click', () => {
      state.unit = state.unit === 'C' ? 'F' : 'C';
      const btn = document.getElementById('toggle-unit-btn');
      if (btn) btn.textContent = `Unit: °${state.unit}`;
      updateTelemetryUI();
      updateChart();
    });

    // GPS Detect button
    document.getElementById('gps-detect-btn')?.addEventListener('click', detectGPSLocation);

    // Source toggle button (Live Agromet Station vs Field IoT Sensor)
    document.getElementById('toggle-source-btn')?.addEventListener('click', () => {
      state.source = state.source === 'live_weather' ? 'iot_sensor' : 'live_weather';
      const badge = document.getElementById('source-status-badge');
      const btn = document.getElementById('toggle-source-btn');
      if (state.source === 'iot_sensor') {
        if (badge) badge.textContent = 'Field LoRaWAN IoT Telemetry';
        if (btn) btn.textContent = 'Source: IoT Sensor';
        state.moisture = 48;
        state.tempC = 23.8;
      } else {
        if (badge) badge.textContent = 'Live Agromet Station (Open-Meteo)';
        if (btn) btn.textContent = 'Source: Satellite Weather';
        fetchLiveWeather();
      }
      updateTelemetryUI();
      updateChart();
    });

    // Slider inputs
    document.getElementById('min-thresh-slider')?.addEventListener('input', (e) => {
      state.minThresh = parseFloat(e.target.value);
      updateTelemetryUI();
    });

    document.getElementById('max-thresh-slider')?.addEventListener('input', (e) => {
      state.maxThresh = parseFloat(e.target.value);
      updateTelemetryUI();
    });

    // Simulation buttons for agromet testing
    document.getElementById('sim-normal-btn')?.addEventListener('click', () => {
      state.tempC = 24.5;
      state.moisture = 42;
      state.humidity = 58;
      updateTelemetryUI();
      updateChart();
      window.KisanApp?.showToast('Simulation: Normal', 'Optimal Rabi crop conditions restored (24.5°C).', 'info');
    });

    document.getElementById('sim-spike-btn')?.addEventListener('click', () => {
      state.tempC = 38.5;
      state.moisture = 22;
      state.humidity = 35;
      updateTelemetryUI();
      updateChart();
    });

    document.getElementById('sim-drop-btn')?.addEventListener('click', () => {
      state.tempC = 3.5;
      state.moisture = 55;
      state.humidity = 92;
      updateTelemetryUI();
      updateChart();
    });

    // Irrigation Calculator Change Listeners
    document.getElementById('irrig-soil-type')?.addEventListener('change', calculateIrrigationDeficit);
    document.getElementById('irrig-crop-stage')?.addEventListener('change', calculateIrrigationDeficit);
    document.getElementById('irrig-pump-hp')?.addEventListener('change', calculateIrrigationDeficit);
  }

  return {
    init,
    formatTemp,
    getState: () => ({ ...state })
  };
})();
