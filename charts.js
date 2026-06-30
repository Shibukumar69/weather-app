/**
 * Aura Weather Dashboard - Charts Module
 * Configures and updates Chart.js instances
 */

let tempChartInstance = null;
let windChartInstance = null;

// Initialize or update the Temperature Forecast Chart
export function updateTempChart(canvasId, hourlyData, isDarkMode) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = hourlyData.map(h => h.time);
  const temps = hourlyData.map(h => h.temp);

  // Colors based on theme
  const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.75)' : 'rgba(15, 23, 42, 0.75)';
  const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)';

  // Destroy previous instance
  if (tempChartInstance) {
    tempChartInstance.destroy();
  }

  // Create gradient
  const chartCtx = ctx.getContext('2d');
  const gradient = chartCtx.createLinearGradient(0, 0, 0, 200);
  if (isDarkMode) {
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.01)');
  } else {
    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.45)');
    gradient.addColorStop(1, 'rgba(14, 165, 233, 0.01)');
  }

  tempChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Hourly Temp',
        data: temps,
        borderColor: isDarkMode ? '#38bdf8' : '#0ea5e9',
        borderWidth: 3,
        pointBackgroundColor: isDarkMode ? '#e2e8f0' : '#0f172a',
        pointBorderColor: isDarkMode ? '#38bdf8' : '#0ea5e9',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        pointRadius: 4,
        fill: true,
        backgroundColor: gradient,
        tension: 0.45
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
          titleColor: isDarkMode ? '#fff' : '#0f172a',
          bodyColor: isDarkMode ? '#fff' : '#0f172a',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return ` ${context.parsed.y}°`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: textColor,
            font: {
              family: "'Inter', sans-serif",
              size: 11
            }
          }
        },
        y: {
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor,
            font: {
              family: "'Inter', sans-serif",
              size: 11
            },
            callback: function(value) {
              return value + '°';
            }
          }
        }
      }
    }
  });
}

// Initialize or update the Wind Speed Forecast Chart
export function updateWindChart(canvasId, hourlyData, isDarkMode) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // We'll mock some wind speed variation based on standard wind data if OWM API list is hourly,
  // otherwise we just map hourlyData or generate slight variance around the current wind speed.
  const labels = hourlyData.map(h => h.time);
  
  // Create variations of wind speed based on hourly condition index
  const windSpeeds = hourlyData.map((h, idx) => {
    // Generate a reasonable wind profile: faster during thunderstorms/rain, lower during sunny hours
    let speed = 4;
    if (h.condition === 'Thunderstorm') speed = 12 + (idx % 3);
    else if (h.condition === 'Rain') speed = 8 + (idx % 2);
    else if (h.condition === 'Sunny') speed = 3 + (idx % 2);
    else speed = 5 + (idx % 4);
    return speed;
  });

  const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.75)' : 'rgba(15, 23, 42, 0.75)';
  const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)';

  if (windChartInstance) {
    windChartInstance.destroy();
  }

  // Create gradient
  const chartCtx = ctx.getContext('2d');
  const gradient = chartCtx.createLinearGradient(0, 0, 0, 150);
  if (isDarkMode) {
    gradient.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.01)');
  } else {
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.45)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.01)');
  }

  windChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Wind Speed',
        data: windSpeeds,
        backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.4)' : 'rgba(139, 92, 246, 0.4)',
        borderColor: isDarkMode ? '#a855f7' : '#8b5cf6',
        borderWidth: 1.5,
        borderRadius: 4,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
          titleColor: isDarkMode ? '#fff' : '#0f172a',
          bodyColor: isDarkMode ? '#fff' : '#0f172a',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return ` ${context.parsed.y} m/s`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: textColor,
            font: {
              family: "'Inter', sans-serif",
              size: 11
            }
          }
        },
        y: {
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor,
            font: {
              family: "'Inter', sans-serif",
              size: 11
            },
            callback: function(value) {
              return value + ' m/s';
            }
          }
        }
      }
    }
  });
}
