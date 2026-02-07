document.addEventListener('DOMContentLoaded', () => {
    // === Elements ===
    const baseCurrencySelect = document.getElementById('base-currency');
    const targetCurrencySelect = document.getElementById('target-currency');
    const amountInput = document.getElementById('amount');
    const feeInput = document.getElementById('bank-fee');
    const dateInput = document.getElementById('transaction-date');
    const calculateBtn = document.getElementById('calculate-btn');
    const swapBtn = document.getElementById('swap-btn');
    const resultsGrid = document.getElementById('results-grid');
    const cardTemplate = document.getElementById('card-template');

    // === Constants ===
    // 模拟各卡组织相对于市场汇率的典型点差 (Spread)
    // 0 = 完美即时市场汇率
    // 正数代表加上点差后的汇率劣势（对于用外币去换本币的场景，通常是买入价和卖出价的差异）
    // 为了简化，我们假设用户持有一种货币(Base)，去消费另一种货币(Target)。
    // 银行/卡组织通常会以一个略差于中间市场的汇率结算。
    // 即：Base -> Target，你得到的 Target 会比中间市场少一点；或者用 Target 换算回 Base，你需要付出的 Base 会多一点。
    // 本工具逻辑：
    // 输入：Amount (Target Currency, 当地货币金额)
    // 银行结算扣款：Base Currency
    // 汇率公式：Base Amount = Target Amount / (Rate * (1 - Spread))  <-- 这种算法比较复杂
    // 简单模拟：Rate (Base to Target) = MarketRate * (1 - Spread)
    // 比如 1 USD = 7.0 CNY (Market). 
    // Visa 可能会给 1 USD = 6.95 CNY (Spread ~0.7%).

    // 不同卡组织的大致点差模拟 (仅供演示)
    const ORG_SPREADS = {
        'mastercard': {
            name: 'Mastercard 万事达',
            spread: 0.002,
            iconClass: 'fa-cc-mastercard',
            iconFamily: 'fab',
            className: 'card-mastercard'
        },
        'visa': {
            name: 'VISA 维萨',
            spread: 0.003,
            iconClass: 'fa-cc-visa',
            iconFamily: 'fab',
            className: 'card-visa'
        },
        'unionpay': {
            name: 'UnionPay 银联',
            spread: 0.005,
            iconClass: 'fa-credit-card', // Fallback to generic solid card
            iconFamily: 'fas',           // 'fas' for solid icons
            className: 'card-unionpay'
        },
        'amex': {
            name: 'American Express 运通',
            spread: 0.015,
            iconClass: 'fa-cc-amex',
            iconFamily: 'fab',
            className: 'card-amex'
        },
        'jcb': {
            name: 'JCB',
            spread: 0.008,
            iconClass: 'fa-cc-jcb',
            iconFamily: 'fab',
            className: 'card-jcb'
        }
    };

    // === Initialization ===
    // Set default date to today
    dateInput.valueAsDate = new Date();

    // === Event Listeners ===
    calculateBtn.addEventListener('click', fetchAndDisplayRates);

    swapBtn.addEventListener('click', () => {
        const temp = baseCurrencySelect.value;
        baseCurrencySelect.value = targetCurrencySelect.value;
        targetCurrencySelect.value = temp;
    });

    // Auto-calculate on load
    fetchAndDisplayRates();

    // === Main Logic ===

    async function fetchAndDisplayRates() {
        // ... (fetch logic remains same, skipping lines for brevity if not changing) ...
        const base = baseCurrencySelect.value;
        const target = targetCurrencySelect.value;
        const amount = parseFloat(amountInput.value);
        const feePercent = parseFloat(feeInput.value);

        if (isNaN(amount) || amount <= 0) {
            alert("请输入有效的金额");
            return;
        }

        resultsGrid.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i> 正在获取最新汇率数据...
            </div>
        `;

        try {
            const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
            const data = await response.json();

            if (data.result !== "success") {
                throw new Error("API Error");
            }

            const marketRateBaseToTarget = data.rates[target];
            renderResults(marketRateBaseToTarget, base, target, amount, feePercent);

        } catch (error) {
            console.error(error);
            resultsGrid.innerHTML = `
                <div class="loading-state" style="color: #dc2626;">
                    <i class="fas fa-exclamation-circle"></i> 获取汇率失败，请检查网络连接。
                </div>
            `;
        }
    }

    function renderResults(marketRate, base, target, amount, feePercent) {
        resultsGrid.innerHTML = '';

        Object.keys(ORG_SPREADS).forEach(orgKey => {
            const orgData = ORG_SPREADS[orgKey];
            const spreadRate = marketRate * (1 - orgData.spread);
            const rawCost = amount / spreadRate;
            const feeAmount = rawCost * (feePercent / 100);
            const finalCost = rawCost + feeAmount;

            // Clone Template
            const card = cardTemplate.content.cloneNode(true);

            // Fill Data
            const cardDiv = card.querySelector('.org-card');
            cardDiv.classList.add(orgData.className);

            card.querySelector('.org-name').textContent = orgData.name;

            // Fix Icon handling
            const iconElem = card.querySelector('.card-icon');
            iconElem.classList.add(orgData.iconFamily); // Add 'fab' or 'fas'
            iconElem.classList.add(orgData.iconClass);  // Add specific icon class

            card.querySelector('.rate-value').textContent = `1 ${base} ≈ ${spreadRate.toFixed(4)} ${target}`;
            card.querySelector('.original-amount').textContent = `${amount.toLocaleString()} ${target}`;
            card.querySelector('.fee-percent').textContent = `${feePercent}%`;
            card.querySelector('.fee-amount').textContent = `+ ${feeAmount.toFixed(2)} ${base}`;
            card.querySelector('.final-amount').textContent = `${finalCost.toFixed(2)} ${base}`;

            resultsGrid.appendChild(card);
        });
    }
});
