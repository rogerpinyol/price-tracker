let cryptoList = [];
let historicalChart;

// Fetch the list of all cryptocurrencies
fetch("https://api.coingecko.com/api/v3/coins/list")
  .then(response => response.json())
  .then(data => {
    cryptoList = data; // Store the list for later use
    console.log("Fetched crypto list:", cryptoList); // Debugging
  })
  .catch(error => {
    console.error("Error fetching cryptocurrency list:", error);
    alert("Failed to fetch cryptocurrency list. Please try again.");
  });

// Function to map user input (id or symbol) to the correct id
async function getCryptoId(input) {
  console.log("Input:", input); // Debugging

  // Check if the input matches an id
  const byId = cryptoList.find(crypto => crypto.id === input.toLowerCase());
  if (byId) return byId.id;

  // Check if the input matches a symbol
  const bySymbol = cryptoList.filter(crypto => crypto.symbol === input.toLowerCase());
  if (bySymbol.length === 0) return null;

  // If multiple coins share the same symbol, fetch market data to determine the most relevant one
  if (bySymbol.length > 1) {
    console.log("Multiple coins found with the same symbol:", bySymbol); // Debugging

    // Fetch market data for all coins with the same symbol
    const marketData = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${bySymbol.map(crypto => crypto.id).join(",")}&x_cg_demo_api_key=${API_KEY}`
    ).then(response => response.json());

    // Select the coin with the highest market cap
    const mostRelevantCoin = marketData.reduce((prev, current) =>
      (prev.market_cap > current.market_cap) ? prev : current
    );

    console.log("Most relevant coin:", mostRelevantCoin); // Debugging
    return mostRelevantCoin.id;
  }

  // If only one coin matches the symbol, return its id
  return bySymbol[0].id;
}

// ********************
// CHART FUNCTION START
// ********************
function initializeChart() {
  const ctx = document.getElementById("historical-chart").getContext("2d");
  
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(79, 70, 229, 0.4)');
  gradient.addColorStop(1, 'rgba(79, 70, 229, 0.1)');

  historicalChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Price (USD)",
        data: [],
        borderColor: "#4F46E5",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
        fill: true,
        backgroundColor: gradient,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          right: 15 // Reduced base padding
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (context) => `$${context.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#4F46E5',
            autoSkip: false,
            maxTicksLimit: 3,
            align: 'end', // Better label positioning
            crossAlign: 'near',
            callback: function(value, index, values) {
              if (index === 0 || 
                  index === Math.floor(values.length / 2) || 
                  index === values.length - 1) {
                return this.getLabelForValue(value);
              }
              return "";
            },
          },
          offset: true, // Add automatic offset
          afterFit: (axis) => {
            // Add null check and string validation
            if (!axis?.ticks) return;
            
            const validTicks = axis.ticks.filter(t => typeof t.label === 'string');
            if (validTicks.length === 0) return;
          
            const maxLabelWidth = Math.max(
              ...validTicks.map(t => axis.ctx.measureText(t.label).width)
            );
            axis.paddingRight = Math.min(maxLabelWidth * 0.3, 30);
          }
        },
        y: {
          grid: { color: 'rgba(199, 210, 254, 0.2)' },
          ticks: {
            color: '#4F46E5',
            callback: (value) => `$${value}`
          },
        }
      },
      elements: {
        line: {
          borderJoinStyle: 'round',
          borderCapStyle: 'round'
        }
      }
    },
  });
}



// Call this function when the page loads
initializeChart();

// ********************
// CHART FUNCTION END
// ********************


// Function to fetch current data
async function fetchData() {
  const cryptoPair = document.getElementById("crypto-pair").value.trim().toLowerCase();
  const [cryptoInput, vsCurrency] = cryptoPair.split("/");

  if (!cryptoInput || !vsCurrency) {
    alert("Please enter a valid cryptocurrency pair (e.g., btc/usd).");
    return;
  }

  // Get the correct cryptoId
  const cryptoId = await getCryptoId(cryptoInput);
  if (!cryptoId) {
    alert("Cryptocurrency not found. Please check the pair and try again.");
    return;
  }

  // Fetch current data
  fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&ids=${cryptoId}&x_cg_demo_api_key=${API_KEY}`)
    .then(response => response.json())
    .then(data => {
      if (data.length === 0) {
        alert("Cryptocurrency not found. Please check the pair and try again.");
        return;
      }

      const crypto = data[0];
      // Get asset image
      const imgElement = document.querySelector("#current-data img");
      imgElement.src = crypto.image;
      imgElement.alt = `${crypto.name} logo`;

      document.getElementById("price").textContent = `$${crypto.current_price}`;
      document.getElementById("market-cap").textContent = `$${crypto.market_cap.toLocaleString()}`;
      document.getElementById("volume").textContent = `$${crypto.total_volume.toLocaleString()}`;
      document.getElementById("current-data").style.display = "flex"; // Show current data section
      
      document.querySelector(".timeframe-buttons").style.display = "flex";
      document.querySelector(".chart-container").style.display = "block";
      document.querySelectorAll("h2").forEach(h2 => h2.style.display = "block");
    })
    .catch(error => {
      console.error("Error fetching current data:", error);
      alert("Failed to fetch current data. Please try again.");
    });

  // Fetch and display 24-hour historical data by default
  fetchHistoricalData("1d");
}

// Function to fetch historical data
async function fetchHistoricalData(timeframe) {
  const cryptoPair = document.getElementById("crypto-pair").value.trim().toLowerCase();
  const [cryptoInput, vsCurrency] = cryptoPair.split("/");

  if (!cryptoInput || !vsCurrency) {
    alert("Please enter a valid cryptocurrency pair (e.g., btc/usd).");
    return;
  }

  // Get the correct cryptoId
  const cryptoId = await getCryptoId(cryptoInput);
  if (!cryptoId) {
    alert("Cryptocurrency not found. Please check the pair and try again.");
    return;
  }
  // Calculate the number of days based on the timeframe
  let days;
  switch (timeframe) {
    case "1d":
      days = 1;
      break;
    case "7d":
      days = 7;
      break;
    case "30d":
      days = 30;
      break;
    case "1y":
      days = 365;
      break;
    case "all":
      days = "max";
      break;
    default:
      days = 1; // Default to 24 hours
  }

  // Fetch historical data
  fetch(`https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=${vsCurrency}&days=${days}`)
    .then(response => response.json())
    .then(data => {
      const prices = data.prices;

      // Extract dates and prices
      const labels = prices.map(([timestamp]) => {
        const date = new Date(timestamp);
        // Format date as YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      });
      const dataPoints = prices.map(([, price]) => price);

      // Update the chart
      historicalChart.data.labels = labels;
      historicalChart.data.datasets[0].data = dataPoints;
      historicalChart.update(); // Force chart resize
    })
    .catch(error => {
      console.error("Error fetching historical data:", error);
      alert("Failed to fetch historical data. Please try again.");
    });
}