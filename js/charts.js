/**
 * Gelir - Gider Takip Grafikleri ve Finansal Analiz Motoru (Chart.js)
 */

class AnalyticsManager {
    constructor() {
        this.monthlyChart = null;
        this.expenseDonutChart = null;
        this.cumulativeChart = null;
        this.savingsRateChart = null;
        this.selectedDonutMonth = 'all';
    }

    formatCurrency(val) {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val || 0);
    }

    async updateCharts(months, expenses, incomes) {
        if (!months || months.length === 0) return;

        // Ay bazlı hesaplamalar
        const labels = months.map(m => m.name);
        const monthlyIncomes = [];
        const monthlyExpenses = [];
        const monthlyBalances = [];
        const savingsRates = [];
        const cumulativeBalances = [];

        let runningCumulative = 0;

        months.forEach(month => {
            const mId = month.id;
            
            // Toplam Gelir
            const incTotal = incomes.reduce((sum, item) => sum + (Number(item.values?.[mId]) || 0), 0);
            
            // Toplam Gider
            const expTotal = expenses.reduce((sum, item) => sum + (Number(item.values?.[mId]) || 0), 0);
            
            // Ek Gelir Akışı
            const extra = Number(month.extraIncome) || 0;
            
            // Net Bakiye
            const net = (incTotal - expTotal) + extra;
            
            // Tasarruf Oranı (%)
            const rate = incTotal > 0 ? Math.max(0, Math.round((net / incTotal) * 100)) : 0;

            runningCumulative += net;

            monthlyIncomes.push(incTotal);
            monthlyExpenses.push(expTotal);
            monthlyBalances.push(net);
            savingsRates.push(rate);
            cumulativeBalances.push(runningCumulative);
        });

        // 1. Aylık Karşılaştırma Grafiği (Gelir, Gider, Net)
        this.renderMonthlyComparison(labels, monthlyIncomes, monthlyExpenses, monthlyBalances);

        // 2. Gider Dağılım Grafiği (Donut)
        this.renderExpenseDonut(months, expenses);

        // 3. Kümülatif Bakiye / Birikim Grafiği (Trend)
        this.renderCumulativeTrend(labels, cumulativeBalances);

        // 4. Tasarruf Oranları (%) Grafiği
        this.renderSavingsRate(labels, savingsRates);

        // 5. İstatistik ve Akıllı Analiz Kartları
        this.renderInsights(months, expenses, incomes, monthlyIncomes, monthlyExpenses, monthlyBalances);
    }

    renderMonthlyComparison(labels, incomes, expenses, balances) {
        const ctx = document.getElementById('monthlyComparisonChart');
        if (!ctx) return;

        if (this.monthlyChart) {
            this.monthlyChart.destroy();
        }

        this.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Toplam Gelir',
                        data: incomes,
                        backgroundColor: 'rgba(16, 185, 129, 0.85)',
                        borderColor: 'rgb(16, 185, 129)',
                        borderWidth: 1.5,
                        borderRadius: 6,
                        order: 2
                    },
                    {
                        label: 'Toplam Gider',
                        data: expenses,
                        backgroundColor: 'rgba(239, 68, 68, 0.85)',
                        borderColor: 'rgb(239, 68, 68)',
                        borderWidth: 1.5,
                        borderRadius: 6,
                        order: 2
                    },
                    {
                        label: 'Net Bakiye (Kalan)',
                        data: balances,
                        type: 'line',
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        borderWidth: 3,
                        pointBackgroundColor: 'rgb(59, 130, 246)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        tension: 0.3,
                        fill: false,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: { family: "'Inter', sans-serif", size: 12, weight: '600' },
                            usePointStyle: true,
                            padding: 18
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${this.formatCurrency(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (val) => this.formatCurrency(val)
                        },
                        grid: { color: 'rgba(0, 0, 0, 0.06)' }
                    }
                }
            }
        });
    }

    renderExpenseDonut(months, expenses) {
        const ctx = document.getElementById('expenseDonutChart');
        if (!ctx) return;

        if (this.expenseDonutChart) {
            this.expenseDonutChart.destroy();
        }

        // Seçilen aya göre filtreleme ('all' veya spesifik ay id'si)
        const monthFilter = this.selectedDonutMonth;
        const itemTotals = [];

        expenses.forEach(exp => {
            let total = 0;
            if (monthFilter === 'all') {
                months.forEach(m => {
                    total += Number(exp.values?.[m.id]) || 0;
                });
            } else {
                total = Number(exp.values?.[monthFilter]) || 0;
            }

            if (total > 0) {
                itemTotals.push({ name: exp.name, amount: total, category: exp.category });
            }
        });

        // En yüksekten küçüğe sırala
        itemTotals.sort((a, b) => b.amount - a.amount);

        const labels = itemTotals.map(i => i.name);
        const data = itemTotals.map(i => i.amount);

        const colorPalette = [
            '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', 
            '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
            '#64748b', '#84cc16'
        ];

        this.expenseDonutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.length > 0 ? labels : ['Harcama Yok'],
                datasets: [{
                    data: data.length > 0 ? data : [1],
                    backgroundColor: data.length > 0 ? colorPalette.slice(0, data.length) : ['#e2e8f0'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: { family: "'Inter', sans-serif", size: 11 },
                            boxWidth: 14,
                            padding: 10
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                if (data.length === 0) return 'Gider kaydı yok';
                                const totalSum = data.reduce((a, b) => a + b, 0);
                                const percentage = totalSum > 0 ? ((context.raw / totalSum) * 100).toFixed(1) : 0;
                                return `${context.label}: ${this.formatCurrency(context.raw)} (%${percentage})`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderCumulativeTrend(labels, cumulativeBalances) {
        const ctx = document.getElementById('cumulativeTrendChart');
        if (!ctx) return;

        if (this.cumulativeChart) {
            this.cumulativeChart.destroy();
        }

        this.cumulativeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Kümülatif Kasa / Toplam Net Birikim',
                    data: cumulativeBalances,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#4f46e5',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { font: { family: "'Inter', sans-serif", size: 12, weight: '600' } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Toplam Birikim: ${this.formatCurrency(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (val) => this.formatCurrency(val)
                        },
                        grid: { color: 'rgba(0, 0, 0, 0.06)' }
                    }
                }
            }
        });
    }

    renderSavingsRate(labels, savingsRates) {
        const ctx = document.getElementById('savingsRateChart');
        if (!ctx) return;

        if (this.savingsRateChart) {
            this.savingsRateChart.destroy();
        }

        this.savingsRateChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tasarruf Oranı (%)',
                    data: savingsRates,
                    backgroundColor: savingsRates.map(r => r >= 50 ? 'rgba(16, 185, 129, 0.85)' : (r >= 20 ? 'rgba(59, 130, 246, 0.85)' : 'rgba(245, 158, 11, 0.85)')),
                    borderRadius: 6,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Tasarruf Oranı: %${context.parsed.y}`
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (val) => `%${val}`
                        },
                        grid: { color: 'rgba(0, 0, 0, 0.06)' }
                    }
                }
            }
        });
    }

    renderInsights(months, expenses, incomes, monthlyIncomes, monthlyExpenses, monthlyBalances) {
        const totalIncome = monthlyIncomes.reduce((a, b) => a + b, 0);
        const totalExpense = monthlyExpenses.reduce((a, b) => a + b, 0);
        const totalNet = monthlyBalances.reduce((a, b) => a + b, 0);
        const avgExpense = months.length > 0 ? Math.round(totalExpense / months.length) : 0;
        const avgIncome = months.length > 0 ? Math.round(totalIncome / months.length) : 0;
        const overallSavingsRate = totalIncome > 0 ? Math.round((totalNet / totalIncome) * 100) : 0;

        // En yüksek gider kalemi bulma
        let maxExpenseItem = { name: '-', total: 0 };
        expenses.forEach(e => {
            let sum = 0;
            months.forEach(m => sum += Number(e.values?.[m.id]) || 0);
            if (sum > maxExpenseItem.total) {
                maxExpenseItem = { name: e.name, total: sum };
            }
        });

        // En yüksek giderli ay
        let maxExpenseMonth = { name: '-', amount: 0 };
        monthlyExpenses.forEach((exp, idx) => {
            if (exp > maxExpenseMonth.amount) {
                maxExpenseMonth = { name: months[idx].name, amount: exp };
            }
        });

        // HTML alanlarını güncelle
        const elTotalNet = document.getElementById('kpiTotalNet');
        const elTotalIncome = document.getElementById('kpiTotalIncome');
        const elTotalExpense = document.getElementById('kpiTotalExpense');
        const elSavingsRate = document.getElementById('kpiSavingsRate');
        
        if (elTotalNet) elTotalNet.textContent = this.formatCurrency(totalNet);
        if (elTotalIncome) elTotalIncome.textContent = this.formatCurrency(totalIncome);
        if (elTotalExpense) elTotalExpense.textContent = this.formatCurrency(totalExpense);
        if (elSavingsRate) elSavingsRate.textContent = `%${overallSavingsRate}`;

        // Analiz Kartları
        const elAvgMonthlyExp = document.getElementById('insightAvgExpense');
        const elAvgMonthlyInc = document.getElementById('insightAvgIncome');
        const elTopExpenseItem = document.getElementById('insightTopExpense');
        const elTopExpenseMonth = document.getElementById('insightTopMonth');

        if (elAvgMonthlyExp) elAvgMonthlyExp.textContent = this.formatCurrency(avgExpense);
        if (elAvgMonthlyInc) elAvgMonthlyInc.textContent = this.formatCurrency(avgIncome);
        if (elTopExpenseItem) elTopExpenseItem.textContent = `${maxExpenseItem.name} (${this.formatCurrency(maxExpenseItem.total)})`;
        if (elTopExpenseMonth) elTopExpenseMonth.textContent = `${maxExpenseMonth.name} (${this.formatCurrency(maxExpenseMonth.amount)})`;
    }
}

window.analyticsManager = new AnalyticsManager();
