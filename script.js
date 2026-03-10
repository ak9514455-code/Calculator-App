// Simple, modular calculator logic with clear state.

const historyEl = document.getElementById("history");
const currentEl = document.getElementById("current");
const buttons = document.querySelectorAll(".btn");
const historyListEl = document.getElementById("history-list");
const darkToggleBtn = document.getElementById("dark-toggle");
const copyResultBtn = document.getElementById("copy-result");
const acChip = document.getElementById("ac-chip");
const clearHistoryBtn = document.getElementById("clear-history");
const convertTypeEl = document.getElementById("convert-type");
const convertFromEl = document.getElementById("convert-from");
const convertToEl = document.getElementById("convert-to");
const convertBtn = document.getElementById("convert-btn");
const swapUnitsBtn = document.getElementById("swap-units");
const converterKeys = document.querySelectorAll(".converter-key");

// Internal calculator state
let currentValue = "0";
let previousValue = null;
let operator = null;
let justEvaluated = false;
let angleMode = "DEG"; // DEG or RAD for trig
let convertReversed = false;

// Format numbers to avoid floating-point noise, while keeping good precision
function formatNumber(num) {
  if (!isFinite(num)) return "Error";
  // Use high precision then normalize back to a clean string
  const precise = Number(num.toPrecision(14));
  return precise.toString();
}

// Adjust font size for long numbers in the current display
function adjustFontSize() {
  const length = currentEl.textContent.replace("-", "").length;

  let size = 2.4; // rem
  if (length > 10) size = 2.1;
  if (length > 14) size = 1.8;
  if (length > 18) size = 1.5;
  if (length > 22) size = 1.3;

  currentEl.style.fontSize = size + "rem";
}

// Render the current and history values
function updateDisplay() {
  let toShow = currentValue;

  // When there is an operator but the second operand is "empty",
  // show the first operand in the main display (matches "125 +" feel).
  if (operator !== null && (currentValue === "" || currentValue === "0") && previousValue !== null) {
    toShow = previousValue;
  }

  currentEl.textContent = toShow;

  if (previousValue !== null && operator) {
    historyEl.textContent = `${previousValue} ${operator}`;
  } else {
    historyEl.textContent = "";
  }

  adjustFontSize();
}

// Add an entry to the scrollable history panel
function addHistoryEntry(a, op, b, result) {
  if (!historyListEl) return;
  const item = document.createElement("button");
  item.type = "button";
  item.className = "history-item";
  item.innerHTML = `<span class="expr">${a} ${op} ${b} =</span><span class="res">${result}</span>`;
  item.addEventListener("click", () => {
    currentValue = result;
    previousValue = null;
    operator = null;
    justEvaluated = true;
    updateDisplay();
  });
  historyListEl.prepend(item);

  const maxEntries = 50;
  while (historyListEl.children.length > maxEntries) {
    historyListEl.removeChild(historyListEl.lastChild);
  }
}

// Reset calculator to initial state
function clearAll() {
  currentValue = "0";
  previousValue = null;
  operator = null;
  justEvaluated = false;
  setActiveOperator(null);
  updateDisplay();
}

// Toggle the sign of the current number
function toggleSign() {
  if (currentValue === "0" || currentValue === "Error") return;
  if (currentValue.startsWith("-")) {
    currentValue = currentValue.slice(1);
  } else {
    currentValue = "-" + currentValue;
  }
  updateDisplay();
}

// Convert current number to percentage
function toPercent() {
  if (currentValue === "Error") return;
  const num = parseFloat(currentValue);
  if (isNaN(num)) return;
  currentValue = formatNumber(num / 100);
  justEvaluated = true;
  updateDisplay();
}

// Helper to apply a unary operation to the current value
function applyUnary(fn) {
  if (currentValue === "Error") return;
  const num = parseFloat(currentValue);
  if (isNaN(num)) return;

  const result = fn(num);

  if (result === null || result === undefined || !isFinite(result)) {
    currentValue = "Error";
  } else {
    currentValue = formatNumber(result);
  }

  justEvaluated = true;
  updateDisplay();
}

// Trigonometric helpers
function toRadians(x) {
  return angleMode === "DEG" ? (x * Math.PI) / 180 : x;
}

function sinCurrent() {
  applyUnary((n) => Math.sin(toRadians(n)));
}

function cosCurrent() {
  applyUnary((n) => Math.cos(toRadians(n)));
}

function tanCurrent() {
  applyUnary((n) => Math.tan(toRadians(n)));
}

// Simple integer check (avoids older browser issues with Number.isInteger)
function isInteger(n) {
  return typeof n === "number" && isFinite(n) && Math.floor(n) === n;
}

// Logarithmic functions
function lnCurrent() {
  applyUnary((n) => (n > 0 ? Math.log(n) : NaN));
}

function log10Current() {
  // Use Math.log10 if available, otherwise fall back
  applyUnary((n) =>
    n > 0 ? (Math.log10 ? Math.log10(n) : Math.log(n) / Math.LN10) : NaN
  );
}

// Constants: π and e
function setPi() {
  currentValue = String(Math.PI);
  justEvaluated = true;
  updateDisplay();
}

function setE() {
  currentValue = String(Math.E);
  justEvaluated = true;
  updateDisplay();
}

// Square the current number
function squareCurrent() {
  applyUnary((n) => n * n);
}

// Square root of the current number
function sqrtCurrent() {
  applyUnary((n) => (n < 0 ? NaN : Math.sqrt(n)));
}

// Reciprocal of the current number (1/x)
function inverseCurrent() {
  applyUnary((n) => (n === 0 ? NaN : 1 / n));
}

// Factorial for non-negative integers (up to 170! to avoid Infinity)
function factorialCurrent() {
  if (currentValue === "Error") return;
  const num = parseFloat(currentValue);
  if (!isInteger(num) || num < 0 || num > 170) {
    currentValue = "Error";
    justEvaluated = true;
    updateDisplay();
    return;
  }

  let result = 1;
  for (let i = 2; i <= num; i++) {
    result *= i;
  }

  if (!isFinite(result)) {
    currentValue = "Error";
  } else {
    currentValue = String(result);
  }
  justEvaluated = true;
  updateDisplay();
}

// Toggle DEG/RAD for trig functions
function toggleAngleMode() {
  angleMode = angleMode === "DEG" ? "RAD" : "DEG";
  const btn = document.querySelector('[data-action="angle-mode"]');
  if (btn) {
    btn.textContent = angleMode;
  }
}

// Handle number and decimal input
function handleNumberInput(digit) {
  if (currentValue === "Error") {
    currentValue = "0";
  }

  // Start new entry after equals if the user types a number
  if (justEvaluated && operator === null) {
    currentValue = "0";
    justEvaluated = false;
  }

  if (digit === ".") {
    // Prevent multiple decimals in the same number
    if (currentValue.includes(".")) return;
    currentValue += ".";
  } else {
    if (currentValue === "0") {
      currentValue = digit;
    } else {
      currentValue += digit;
    }
  }

  justEvaluated = false;
  updateDisplay();
}

// Perform the pending operation
function compute() {
  if (previousValue === null || operator === null) return;

  const a = parseFloat(previousValue);
  const b = parseFloat(currentValue);

  if (isNaN(a) || isNaN(b)) return;

  let result;
  switch (operator) {
    case "+":
      result = a + b;
      break;
    case "−":
      result = a - b;
      break;
    case "×":
      result = a * b;
      break;
    case "÷":
      if (b === 0) {
        result = "Error";
      } else {
        result = a / b;
      }
      break;
    case "^":
      // a raised to the power of b
      result = Math.pow(a, b);
      break;
    default:
      return;
  }

  if (result === "Error" || !isFinite(result)) {
    currentValue = "Error";
    previousValue = null;
    operator = null;
  } else {
    currentValue = formatNumber(result);
    previousValue = null;
    operator = null;
  }
}

// Highlight the active operator button
function setActiveOperator(opSymbol) {
  document.querySelectorAll(".btn.operator").forEach((btn) => {
    if (btn.dataset.operator === opSymbol && opSymbol !== null) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

// Handle operator input (+, −, ×, ÷)
function handleOperatorInput(nextOperator) {
  if (currentValue === "Error") return;

  if (previousValue === null) {
    previousValue = currentValue;
  } else if (!justEvaluated) {
    // Chain calculations if user presses operators consecutively
    compute();
    previousValue = currentValue === "Error" ? null : currentValue;
  }

  operator = nextOperator;
  justEvaluated = false;
  setActiveOperator(nextOperator);
  updateDisplay();
  currentValue = "0";
}

// Handle equals button
function handleEquals() {
  if (currentValue === "Error") return;

  if (previousValue !== null && operator !== null) {
    const a = previousValue;
    const op = operator;
    const b = currentValue;
    compute();
    setActiveOperator(null);
    historyEl.textContent = "";
    if (currentValue !== "Error") {
      addHistoryEntry(a, op, b, currentValue);
    }
    updateDisplay();
    justEvaluated = true;
  }
}

// Remove the last digit / behave like C (backspace)
function handleBackspace() {
  if (currentValue === "Error") {
    currentValue = "0";
    previousValue = null;
    operator = null;
    justEvaluated = false;
    updateDisplay();
    return;
  }

  // If we just finished a calculation and press C, treat it
  // as editing the result (backspace on the current value).
  if (justEvaluated && operator === null) {
    justEvaluated = false;
  }

  if (operator !== null) {
    // We are in the middle of an expression: previousValue op currentValue
    if (currentValue !== "" && currentValue !== "0") {
      // Remove last char from the second operand
      if (currentValue.length <= 1 || (currentValue.length === 2 && currentValue.startsWith("-"))) {
        currentValue = "";
      } else {
        currentValue = currentValue.slice(0, -1);
      }
    } else {
      // No meaningful second operand left → remove the operator
      currentValue = previousValue !== null ? previousValue : "0";
      previousValue = null;
      operator = null;
    }
  } else {
    // No operator: just backspace on the current number
    if (currentValue.length <= 1 || (currentValue.length === 2 && currentValue.startsWith("-"))) {
      currentValue = "0";
    } else {
      currentValue = currentValue.slice(0, -1);
    }
  }

  updateDisplay();
}

// Dark mode toggle
if (darkToggleBtn) {
  darkToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
  });
}

// AC chip uses full clear
if (acChip) {
  acChip.addEventListener("click", () => {
    clearAll();
  });
}

// Copy result button
if (copyResultBtn) {
  copyResultBtn.addEventListener("click", async () => {
    if (!navigator.clipboard || currentValue === "Error") return;
    try {
      await navigator.clipboard.writeText(currentValue);
      const original = copyResultBtn.textContent;
      copyResultBtn.textContent = "Copied!";
      setTimeout(() => {
        copyResultBtn.textContent = original;
      }, 1200);
    } catch (_) {
      // ignore copy errors
    }
  });
}

// Clear history
if (clearHistoryBtn && historyListEl) {
  clearHistoryBtn.addEventListener("click", () => {
    historyListEl.innerHTML = "";
  });
}

// Converter helpers
function updateConverterPlaceholders() {
  if (!convertTypeEl || !convertFromEl || !convertToEl) return;
  const type = convertTypeEl.value;
  let fromUnit = "";
  let toUnit = "";

  if (type === "length") {
    fromUnit = convertReversed ? "m" : "km";
    toUnit = convertReversed ? "km" : "m";
  } else if (type === "weight") {
    fromUnit = convertReversed ? "g" : "kg";
    toUnit = convertReversed ? "kg" : "g";
  } else if (type === "temp") {
    fromUnit = convertReversed ? "°F" : "°C";
    toUnit = convertReversed ? "°C" : "°F";
  }

  convertFromEl.placeholder = `From (${fromUnit})`;
  convertToEl.placeholder = `To (${toUnit})`;
}

function performConversion() {
  if (!convertTypeEl || !convertFromEl || !convertToEl) return;
  const type = convertTypeEl.value;
  const raw = parseFloat(convertFromEl.value);
  if (isNaN(raw)) {
    convertToEl.value = "";
    return;
  }

  let result;
  if (type === "length") {
    result = convertReversed ? raw / 1000 : raw * 1000;
  } else if (type === "weight") {
    result = convertReversed ? raw / 1000 : raw * 1000;
  } else if (type === "temp") {
    result = convertReversed ? ((raw - 32) * 5) / 9 : (raw * 9) / 5 + 32;
  }

  convertToEl.value = formatNumber(result);
}

if (swapUnitsBtn) {
  swapUnitsBtn.addEventListener("click", () => {
    convertReversed = !convertReversed;
    updateConverterPlaceholders();
    const fromVal = convertFromEl.value;
    const toVal = convertToEl.value;
    convertFromEl.value = toVal;
    convertToEl.value = fromVal;
  });
}

if (convertBtn) {
  convertBtn.addEventListener("click", performConversion);
}

if (convertTypeEl) {
  convertTypeEl.addEventListener("change", () => {
    convertReversed = false;
    convertFromEl.value = "";
    convertToEl.value = "";
    updateConverterPlaceholders();
  });
}

// Personal keypad for converter
converterKeys.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!convertFromEl) return;
    const key = btn.dataset.key;
    if (!key) return;

    if (key === "clear") {
      convertFromEl.value = "";
      convertToEl.value = "";
      return;
    }

    if (key === "back") {
      convertFromEl.value = convertFromEl.value.slice(0, -1);
      return;
    }

    if (key === "apply") {
      // Push converter "from" value into main calculator as current value
      if (convertFromEl.value !== "") {
        currentValue = convertFromEl.value;
        previousValue = null;
        operator = null;
        justEvaluated = true;
        updateDisplay();
      }
      return;
    }

    // Digits or decimal
    if (key === ".") {
      if (convertFromEl.value.includes(".")) return;
      convertFromEl.value = convertFromEl.value === "" ? "0." : convertFromEl.value + ".";
    } else {
      convertFromEl.value += key;
    }
  });
});

// Keyboard support
document.addEventListener("keydown", (event) => {
  const key = event.key;

  if (key >= "0" && key <= "9") {
    event.preventDefault();
    handleNumberInput(key);
    return;
  }

  if (key === ".") {
    event.preventDefault();
    handleNumberInput(".");
    return;
  }

  if (key === "+" || key === "-" || key === "*" || key === "/") {
    event.preventDefault();
    let opSymbol = "+";
    if (key === "+") opSymbol = "+";
    else if (key === "-") opSymbol = "−";
    else if (key === "*") opSymbol = "×";
    else if (key === "/") opSymbol = "÷";
    handleOperatorInput(opSymbol);
    return;
  }

  if (key === "Enter" || key === "=") {
    event.preventDefault();
    handleEquals();
    return;
  }

  if (key === "Escape") {
    clearAll();
    return;
  }

  if (key === "Backspace") {
    event.preventDefault();
    handleBackspace();
  }
});

// Attach event listeners to all buttons
buttons.forEach((btn) => {
  const number = btn.dataset.number;
  const op = btn.dataset.operator;
  const action = btn.dataset.action;

  btn.addEventListener("click", () => {
    if (number !== undefined) {
      handleNumberInput(number);
      return;
    }

    if (op !== undefined) {
      handleOperatorInput(op);
      return;
    }

    if (action === "clear") {
      clearAll();
    } else if (action === "backspace") {
      handleBackspace();
    } else if (action === "sign") {
      toggleSign();
    } else if (action === "percent") {
      toPercent();
    } else if (action === "sin") {
      sinCurrent();
    } else if (action === "cos") {
      cosCurrent();
    } else if (action === "tan") {
      tanCurrent();
    } else if (action === "ln") {
      lnCurrent();
    } else if (action === "log10") {
      log10Current();
    } else if (action === "pi") {
      setPi();
    } else if (action === "e") {
      setE();
    } else if (action === "square") {
      squareCurrent();
    } else if (action === "sqrt") {
      sqrtCurrent();
    } else if (action === "inverse") {
      inverseCurrent();
    } else if (action === "factorial") {
      factorialCurrent();
    } else if (action === "angle-mode") {
      toggleAngleMode();
    } else if (action === "equals") {
      handleEquals();
    }
  });
});

// Initialize display on first load
updateDisplay();

// Initialize converter UI
updateConverterPlaceholders();

