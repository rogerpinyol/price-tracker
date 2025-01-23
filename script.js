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
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${bySymbol.map(crypto => crypto.id).join(",")}`
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

// Initialize the chart
function initializeChart() {
  const ctx = document.getElementById("historical-chart").getContext("2d");
  historicalChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [], // Dates will go here
      datasets: [
        {
          label: "Price (USD)",
          data: [], // Prices will go here
          borderColor: "rgba(75, 192, 192, 1)",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Allow the chart to resize freely
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "Date",
          },
          ticks: {
            autoSkip: false, // Prevent automatic skipping of labels
            maxTicksLimit: 3, // Show only 3 labels (start, middle, end)
            callback: function (value, index, values) {
              // Show only the first, middle, and last labels
              if (index === 0 || index === Math.floor(values.length / 2) || index === values.length - 1) {
                return this.getLabelForValue(value); // Use the actual label value
              }
              return "";
            },
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "Price (USD)",
          },
          ticks: {
            callback: function (value) {
              return `$${value}`; // Format y-axis labels as currency
            },
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return `Price: $${context.raw}`; // Format tooltip labels as currency
            },
          },
        },
      },
    },
  });
}

// Call this function when the page loads
initializeChart();

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
  fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&ids=${cryptoId}`)
    .then(response => response.json())
    .then(data => {
      if (data.length === 0) {
        alert("Cryptocurrency not found. Please check the pair and try again.");
        return;
      }

      const crypto = data[0];
      document.getElementById("price").textContent = `$${crypto.current_price}`;
      document.getElementById("market-cap").textContent = `$${crypto.market_cap.toLocaleString()}`;
      document.getElementById("volume").textContent = `$${crypto.total_volume.toLocaleString()}`;
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
        historicalChart.update();
      })
      .catch(error => {
        console.error("Error fetching historical data:", error);
        alert("Failed to fetch historical data. Please try again.");
      });
  }