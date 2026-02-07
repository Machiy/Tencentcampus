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
        const base = baseCurrencySelect.value;
        const target = targetCurrencySelect.value;
        const amount = parseFloat(amountInput.value);
        const feePercent = parseFloat(feeInput.value);
        const dateStr = dateInput.value; // YYYY-MM-DD

        if (isNaN(amount) || amount <= 0) {
            alert("请输入有效的金额");
            return;
        }

        resultsGrid.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i> 正在获取最新汇率数据...<br>
                <span style="font-size: 0.9rem; opacity: 0.8">(尝试连接本地代理获取官网数据)</span>
            </div>
        `;

        try {
            // 1. Fetch Market Rate (Base for fallback/others)
            const marketPromise = fetch(`https://open.er-api.com/v6/latest/${base}`)
                .then(r => r.json())
                .catch(() => null);

            // 2. Fetch Real Rates from Local Proxy (Visa/Master)
            // Use AbortController for timeout if server is not running
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

            const proxyUrl = `http://localhost:8000/api/rates?base=${base}&target=${target}&amount=${amount}&date=${dateStr}`;
            const realRatesPromise = fetch(proxyUrl, { signal: controller.signal })
                .then(r => r.json())
                .catch(() => null);

            const [marketData, realRates] = await Promise.all([marketPromise, realRatesPromise]);
            clearTimeout(timeoutId);

            if (!marketData || marketData.result !== "success") {
                throw new Error("无法获取基础市场汇率");
            }

            const marketRateBaseToTarget = marketData.rates[target];

            renderResults(marketRateBaseToTarget, realRates, base, target, amount, feePercent);

        } catch (error) {
            console.error(error);
            resultsGrid.innerHTML = `
                <div class="loading-state" style="color: #dc2626;">
                    <i class="fas fa-exclamation-circle"></i> 获取汇率失败，请检查网络连接。<br>
                    若需获取真实官网数据，请确保已运行 server.py
                </div>
            `;
        }
    }

    function renderResults(marketRate, realRates, base, target, amount, feePercent) {
        resultsGrid.innerHTML = '';

        Object.keys(ORG_SPREADS).forEach(orgKey => {
            const orgData = ORG_SPREADS[orgKey];
            let rate, finalAmountRaw, isReal = false;

            // Check if we have real data for this org
            if (realRates && realRates[orgKey] && realRates[orgKey].rate) {
                // Real Data Found
                rate = realRates[orgKey].rate;
                // Cost in Base = Amount (Target) / Rate (Base->Target) ? 
                // Wait, API returns 'rate' as conversion rate or amount?
                // Our server returns: rate = (Base Amount / Target Amount) or proper rate.
                // Let's check server.py logic: 
                // Visa: rate = conversionAmountValue (Base) / amount (Target).
                // So Rate is "Price of 1 Target in Base". 
                // But our UI displays "1 Base = X Target".
                // So DisplayRate = 1 / (Base/Target) = Target/Base.

                // Calculation:
                // Raw Cost (Base) is explicitly returned by server as 'amount' or derived.
                if (realRates[orgKey].amount) {
                    finalAmountRaw = realRates[orgKey].amount;
                    // Derived rate for display: 1 Base = (Amount Target / Final Base) Target
                    rate = amount / finalAmountRaw;
                } else {
                    // Fallback if only rate provided
                    // rate from server is cost-rate? Let's assume server returns "Base per Target".
                    finalAmountRaw = amount * realRates[orgKey].rate;
                    rate = 1 / realRates[orgKey].rate;
                }
                isReal = true;
            } else {
                // Simulation Fallback
                // Market Rate is 1 Base = X Target.
                // Spread Rate = Market * (1 - Spread).
                rate = marketRate * (1 - orgData.spread);
                // Cost (Base) = Amount (Target) / Rate (Base->Target)
                finalAmountRaw = amount / rate;
                isReal = false;
            }

            // Apply Bank Fee
            const feeAmount = finalAmountRaw * (feePercent / 100);
            const finalCost = finalAmountRaw + feeAmount;

            // Clone Template
            const card = cardTemplate.content.cloneNode(true);
            const cardDiv = card.querySelector('.org-card');
            cardDiv.classList.add(orgData.className);

            // Org Name & Tag
            const nameContainer = card.querySelector('.org-name');
            nameContainer.innerHTML = `${orgData.name} ${isReal ? '<span class="badge real">官网</span>' : '<span class="badge sim">预估</span>'}`;

            // Icons
            const iconElem = card.querySelector('.card-icon');
            iconElem.classList.add(orgData.iconFamily, orgData.iconClass);

            // Rate Display
            card.querySelector('.rate-value').textContent = `1 ${base} ≈ ${rate.toFixed(4)} ${target}`;

            // Numbers
            card.querySelector('.original-amount').textContent = `${amount.toLocaleString()} ${target}`;
            card.querySelector('.fee-percent').textContent = `${feePercent}%`;
            card.querySelector('.fee-amount').textContent = `+ ${feeAmount.toFixed(2)} ${base}`;
            card.querySelector('.final-amount').textContent = `${finalCost.toFixed(2)} ${base}`;

            resultsGrid.appendChild(card);
        });
    }
});
