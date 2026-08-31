/**
 * Gelir - Gider Takip Ana Uygulama Mantığı (Controller & View)
 */

class BudgetApp {
    constructor() {
        this.months = [];
        this.expenses = [];
        this.incomes = [];
        this.activeTab = 'gridTab';
        this.selectedDetailMonth = null;
    }

    async init() {
        try {
            await window.budgetDB.init();
            this.bindEvents();
            await this.loadAndRenderAll();
        } catch (error) {
            console.error("Uygulama başlatma hatası:", error);
            this.showToast("Uygulama başlatılırken hata oluştu: " + error, "error");
        }
    }

    async loadAndRenderAll() {
        this.months = await window.budgetDB.getAllMonths();
        this.expenses = await window.budgetDB.getAllExpenses();
        this.incomes = await window.budgetDB.getAllIncomes();

        if (this.months.length > 0 && !this.selectedDetailMonth) {
            this.selectedDetailMonth = this.months[0].id;
        }

        this.renderMatrixTable();
        this.populateMonthDropdowns();
        this.renderMonthlyDetailView();
        
        // Grafikleri ve İstatistikleri Güncelle
        if (window.analyticsManager) {
            window.analyticsManager.updateCharts(this.months, this.expenses, this.incomes);
        }
    }

    formatMoney(val) {
        if (val === undefined || val === null || isNaN(val)) return '0 ₺';
        return Number(val).toLocaleString('tr-TR') + ' ₺';
    }

    // --- TABLO (MATRİS) GÖRÜNÜMÜ RENDER ---
    renderMatrixTable() {
        const table = document.getElementById('matrixTable');
        if (!table) return;

        const months = this.months;
        const expenses = this.expenses;
        const incomes = this.incomes;

        // Toplamları saklayacak nesneler
        const expMonthlyTotals = {};
        const incMonthlyTotals = {};
        months.forEach(m => {
            expMonthlyTotals[m.id] = 0;
            incMonthlyTotals[m.id] = 0;
        });

        // 1. Table Header (THEAD)
        let theadHtml = `
            <thead>
                <tr>
                    <th class="col-item-name">
                        <div class="th-title-flex">
                            <span>KALEMLER / AYLAR</span>
                        </div>
                    </th>
        `;
        months.forEach(m => {
            theadHtml += `
                <th class="col-month-val text-right">
                    <div class="month-header-cell">
                        <span class="month-title" onclick="app.promptEditMonth('${m.id}', '${m.name}')" title="Adı değiştirmek için tıklayın">${m.name}</span>
                        <button class="btn-del-month" onclick="app.confirmDeleteMonth('${m.id}', '${m.name}')" title="Bu ayı sil">×</button>
                    </div>
                </th>
            `;
        });
        theadHtml += `
                <th class="col-total text-right">TOPLAM</th>
                <th class="col-actions text-center">İŞLEM</th>
            </tr>
        </thead>
        `;

        // 2. Table Body (TBODY)
        let tbodyHtml = '<tbody>';

        // --- GİDERLER BÖLÜMÜ ---
        tbodyHtml += `
            <tr class="section-header-row exp-section">
                <td colspan="${months.length + 3}">
                    <div class="section-badge-flex">
                        <span class="badge-tag badge-danger">GİDERLER / KART ÖDEMELERİ</span>
                        <button class="btn-add-inline" onclick="app.openAddItemModal('expense')">+ Yeni Gider Ekle</button>
                    </div>
                </td>
            </tr>
        `;

        expenses.forEach(exp => {
            let rowTotal = 0;
            tbodyHtml += `
                <tr class="data-row exp-row" data-id="${exp.id}">
                    <td class="cell-name">
                        <span class="item-name-text" onclick="app.promptEditItemName('expense', '${exp.id}', '${exp.name}')" title="İsmi düzenle">${exp.name}</span>
                        <span class="item-category-tag">${exp.category || 'Gider'}</span>
                    </td>
            `;

            months.forEach(m => {
                const val = Number(exp.values?.[m.id]) || 0;
                rowTotal += val;
                expMonthlyTotals[m.id] += val;
                tbodyHtml += `
                    <td class="cell-val text-right editable-cell" onclick="app.makeCellEditable(this, 'expense', '${exp.id}', '${m.id}', ${val})">
                        ${val > 0 ? Number(val).toLocaleString('tr-TR') : '<span class="zero-val">0</span>'}
                    </td>
                `;
            });

            tbodyHtml += `
                    <td class="cell-row-total text-right font-bold">${Number(rowTotal).toLocaleString('tr-TR')} ₺</td>
                    <td class="cell-actions text-center">
                        <button class="btn-icon-del" onclick="app.confirmDeleteItem('expense', '${exp.id}', '${exp.name}')" title="Sil">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </td>
                </tr>
            `;
        });

        // TOPLAM GİDER SATIRI
        let grandTotalExp = 0;
        tbodyHtml += `
            <tr class="summary-highlight-row exp-total-row">
                <td class="font-bold">TOPLAM GİDER</td>
        `;
        months.forEach(m => {
            const sum = expMonthlyTotals[m.id];
            grandTotalExp += sum;
            tbodyHtml += `<td class="text-right font-bold text-danger">${Number(sum).toLocaleString('tr-TR')} ₺</td>`;
        });
        tbodyHtml += `
                <td class="text-right font-bold text-danger">${Number(grandTotalExp).toLocaleString('tr-TR')} ₺</td>
                <td></td>
            </tr>
        `;

        // --- GELİRLER BÖLÜMÜ ---
        tbodyHtml += `
            <tr class="section-spacer-row"><td colspan="${months.length + 3}"></td></tr>
            <tr class="section-header-row inc-section">
                <td colspan="${months.length + 3}">
                    <div class="section-badge-flex">
                        <span class="badge-tag badge-success">GELİRLER</span>
                        <button class="btn-add-inline" onclick="app.openAddItemModal('income')">+ Yeni Gelir Ekle</button>
                    </div>
                </td>
            </tr>
        `;

        incomes.forEach(inc => {
            let rowTotal = 0;
            tbodyHtml += `
                <tr class="data-row inc-row" data-id="${inc.id}">
                    <td class="cell-name">
                        <span class="item-name-text" onclick="app.promptEditItemName('income', '${inc.id}', '${inc.name}')" title="İsmi düzenle">${inc.name}</span>
                        <span class="item-category-tag inc-tag">${inc.category || 'Gelir'}</span>
                    </td>
            `;

            months.forEach(m => {
                const val = Number(inc.values?.[m.id]) || 0;
                rowTotal += val;
                incMonthlyTotals[m.id] += val;
                tbodyHtml += `
                    <td class="cell-val text-right editable-cell" onclick="app.makeCellEditable(this, 'income', '${inc.id}', '${m.id}', ${val})">
                        ${val > 0 ? Number(val).toLocaleString('tr-TR') : '<span class="zero-val">0</span>'}
                    </td>
                `;
            });

            tbodyHtml += `
                    <td class="cell-row-total text-right font-bold">${Number(rowTotal).toLocaleString('tr-TR')} ₺</td>
                    <td class="cell-actions text-center">
                        <button class="btn-icon-del" onclick="app.confirmDeleteItem('income', '${inc.id}', '${inc.name}')" title="Sil">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </td>
                </tr>
            `;
        });

        // TOPLAM GELİR SATIRI
        let grandTotalInc = 0;
        tbodyHtml += `
            <tr class="summary-highlight-row inc-total-row">
                <td class="font-bold">TOPLAM GELİR</td>
        `;
        months.forEach(m => {
            const sum = incMonthlyTotals[m.id];
            grandTotalInc += sum;
            tbodyHtml += `<td class="text-right font-bold text-success">${Number(sum).toLocaleString('tr-TR')} ₺</td>`;
        });
        tbodyHtml += `
                <td class="text-right font-bold text-success">${Number(grandTotalInc).toLocaleString('tr-TR')} ₺</td>
                <td></td>
            </tr>
        `;

        // --- ÖZET / BAKİYE BÖLÜMÜ ---
        tbodyHtml += `
            <tr class="section-spacer-row"><td colspan="${months.length + 3}"></td></tr>
            <tr class="section-header-row summary-section">
                <td colspan="${months.length + 3}">
                    <span class="badge-tag badge-primary">ÖZET / BAKİYE</span>
                </td>
            </tr>
        `;

        // Satır: Toplam Gelir
        tbodyHtml += `<tr><td class="font-semibold text-muted-dark">Toplam Gelir</td>`;
        months.forEach(m => {
            tbodyHtml += `<td class="text-right">${Number(incMonthlyTotals[m.id]).toLocaleString('tr-TR')} ₺</td>`;
        });
        tbodyHtml += `<td class="text-right font-semibold">${Number(grandTotalInc).toLocaleString('tr-TR')} ₺</td><td></td></tr>`;

        // Satır: Toplam Gider
        tbodyHtml += `<tr><td class="font-semibold text-muted-dark">Toplam Gider</td>`;
        months.forEach(m => {
            tbodyHtml += `<td class="text-right">${Number(expMonthlyTotals[m.id]).toLocaleString('tr-TR')} ₺</td>`;
        });
        tbodyHtml += `<td class="text-right font-semibold">${Number(grandTotalExp).toLocaleString('tr-TR')} ₺</td><td></td></tr>`;

        // Satır: Fark (Gelir - Gider)
        let totalDiff = 0;
        tbodyHtml += `<tr class="row-diff"><td class="font-semibold">Fark (Gelir - Gider)</td>`;
        months.forEach(m => {
            const diff = incMonthlyTotals[m.id] - expMonthlyTotals[m.id];
            totalDiff += diff;
            const diffClass = diff >= 0 ? 'text-success' : 'text-danger';
            tbodyHtml += `<td class="text-right font-semibold ${diffClass}">${Number(diff).toLocaleString('tr-TR')} ₺</td>`;
        });
        tbodyHtml += `<td class="text-right font-bold ${totalDiff >= 0 ? 'text-success' : 'text-danger'}">${Number(totalDiff).toLocaleString('tr-TR')} ₺</td><td></td></tr>`;

        // Satır: Ek / Sonraki Gelir Akışı
        let totalExtra = 0;
        tbodyHtml += `<tr><td class="font-semibold">Ek / Sonraki Gelir Akışı <span class="help-hint">(Tıklayıp düzenleyin)</span></td>`;
        months.forEach(m => {
            const extra = Number(m.extraIncome) || 0;
            totalExtra += extra;
            tbodyHtml += `
                <td class="text-right editable-cell" onclick="app.makeExtraIncomeEditable(this, '${m.id}', ${extra})">
                    ${extra !== 0 ? Number(extra).toLocaleString('tr-TR') : '<span class="zero-val">0</span>'}
                </td>
            `;
        });
        tbodyHtml += `<td class="text-right font-semibold">${Number(totalExtra).toLocaleString('tr-TR')} ₺</td><td></td></tr>`;

        // Satır: Net Bakiye
        let totalNet = 0;
        tbodyHtml += `<tr class="net-balance-row"><td class="font-extrabold text-primary">Net Bakiye</td>`;
        months.forEach(m => {
            const net = (incMonthlyTotals[m.id] - expMonthlyTotals[m.id]) + (Number(m.extraIncome) || 0);
            totalNet += net;
            const netClass = net >= 0 ? 'text-primary' : 'text-danger';
            tbodyHtml += `<td class="text-right font-extrabold ${netClass}">${Number(net).toLocaleString('tr-TR')} ₺</td>`;
        });
        tbodyHtml += `<td class="text-right font-extrabold ${totalNet >= 0 ? 'text-primary' : 'text-danger'}">${Number(totalNet).toLocaleString('tr-TR')} ₺</td><td></td></tr>`;

        tbodyHtml += '</tbody>';

        table.innerHTML = theadHtml + tbodyHtml;
    }

    // --- HÜCRE İÇİ HIZLI DÜZENLEME (INLINE EDITING) ---
    makeCellEditable(tdElement, type, itemId, monthId, currentVal) {
        if (tdElement.querySelector('input')) return;

        const originalText = tdElement.innerHTML;
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'inline-cell-input';
        input.value = currentVal === 0 ? '' : currentVal;
        input.placeholder = '0';

        tdElement.innerHTML = '';
        tdElement.appendChild(input);
        input.focus();
        input.select();

        let isSaved = false;

        const saveValue = async () => {
            if (isSaved) return;
            isSaved = true;

            const newVal = parseFloat(input.value) || 0;
            try {
                if (type === 'expense') {
                    await window.budgetDB.updateExpenseValue(itemId, monthId, newVal);
                } else {
                    await window.budgetDB.updateIncomeValue(itemId, monthId, newVal);
                }
                await this.loadAndRenderAll();
                this.showToast('Değer güncellendi', 'info');
            } catch (err) {
                console.error("Hücre kaydedilemedi:", err);
                tdElement.innerHTML = originalText;
                this.showToast('Kaydedilemedi!', 'error');
            }
        };

        input.addEventListener('blur', saveValue);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            } else if (e.key === 'Escape') {
                isSaved = true;
                tdElement.innerHTML = originalText;
            }
        });
    }

    makeExtraIncomeEditable(tdElement, monthId, currentVal) {
        if (tdElement.querySelector('input')) return;

        const originalText = tdElement.innerHTML;
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'inline-cell-input';
        input.value = currentVal === 0 ? '' : currentVal;
        input.placeholder = '0';

        tdElement.innerHTML = '';
        tdElement.appendChild(input);
        input.focus();
        input.select();

        let isSaved = false;
        const saveValue = async () => {
            if (isSaved) return;
            isSaved = true;

            const newVal = parseFloat(input.value) || 0;
            try {
                const month = this.months.find(m => m.id === monthId);
                if (month) {
                    month.extraIncome = newVal;
                    await window.budgetDB.updateMonth(month);
                    await this.loadAndRenderAll();
                    this.showToast('Ek gelir akışı güncellendi', 'info');
                }
            } catch (err) {
                tdElement.innerHTML = originalText;
                this.showToast('Hata oluştu!', 'error');
            }
        };

        input.addEventListener('blur', saveValue);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            else if (e.key === 'Escape') {
                isSaved = true;
                tdElement.innerHTML = originalText;
            }
        });
    }

    // --- MODAL & FORM İŞLEMLERİ ---
    openAddItemModal(type = 'expense') {
        const modal = document.getElementById('addItemModal');
        const title = document.getElementById('addItemModalTitle');
        const typeInput = document.getElementById('addItemType');
        const nameInput = document.getElementById('addItemName');
        const catInput = document.getElementById('addItemCategory');
        const initialValInput = document.getElementById('addItemInitialVal');

        if (!modal) return;

        typeInput.value = type;
        nameInput.value = '';
        initialValInput.value = '';

        if (type === 'expense') {
            title.textContent = 'Yeni Gider / Kart Kalemi Ekle';
            catInput.innerHTML = `
                <option value="Kredi Kartı">Kredi Kartı</option>
                <option value="Kira / Konut">Kira / Konut</option>
                <option value="Fatura / Aidat">Fatura / Aidat</option>
                <option value="Kredi / Borç">Kredi / Borç</option>
                <option value="Market / Yaşam">Market / Yaşam</option>
                <option value="Ulaşım / Araç">Ulaşım / Araç</option>
                <option value="Diğer">Diğer Gider</option>
            `;
        } else {
            title.textContent = 'Yeni Gelir Kalemi Ekle';
            catInput.innerHTML = `
                <option value="Maaş">Maaş</option>
                <option value="Ek Gelir">Ek Gelir</option>
                <option value="Kira Geliri">Kira Geliri</option>
                <option value="Yatırım / Faiz">Yatırım / Faiz</option>
                <option value="Prim / İkramiye">Prim / İkramiye</option>
                <option value="Diğer">Diğer Gelir</option>
            `;
        }

        modal.classList.add('active');
        setTimeout(() => nameInput.focus(), 100);
    }

    closeAddItemModal() {
        const modal = document.getElementById('addItemModal');
        if (modal) modal.classList.remove('active');
    }

    async handleAddItemSubmit(e) {
        e.preventDefault();
        const type = document.getElementById('addItemType').value;
        const name = document.getElementById('addItemName').value.trim();
        const category = document.getElementById('addItemCategory').value;
        const initialVal = parseFloat(document.getElementById('addItemInitialVal').value) || 0;
        const applyToAll = document.getElementById('addItemApplyAll').checked;

        if (!name) {
            this.showToast('Lütfen kalem adını giriniz.', 'warning');
            return;
        }

        try {
            let newItem;
            if (type === 'expense') {
                newItem = await window.budgetDB.addExpenseItem(name, category);
            } else {
                newItem = await window.budgetDB.addIncomeItem(name, category);
            }

            // Tutar atanacaksa
            if (initialVal > 0 && newItem) {
                if (applyToAll) {
                    for (const m of this.months) {
                        if (type === 'expense') {
                            await window.budgetDB.updateExpenseValue(newItem.id, m.id, initialVal);
                        } else {
                            await window.budgetDB.updateIncomeValue(newItem.id, m.id, initialVal);
                        }
                    }
                } else if (this.months.length > 0) {
                    const firstMonthId = this.months[0].id;
                    if (type === 'expense') {
                        await window.budgetDB.updateExpenseValue(newItem.id, firstMonthId, initialVal);
                    } else {
                        await window.budgetDB.updateIncomeValue(newItem.id, firstMonthId, initialVal);
                    }
                }
            }

            this.closeAddItemModal();
            await this.loadAndRenderAll();
            this.showToast(`${name} başarıyla eklendi!`, 'success');
        } catch (err) {
            console.error("Kalem eklenemedi:", err);
            this.showToast('Hata: ' + err, 'error');
        }
    }

    // --- AY İŞLEMLERİ ---
    openAddMonthModal() {
        const modal = document.getElementById('addMonthModal');
        const input = document.getElementById('newMonthName');
        if (!modal) return;
        
        // Önerilen ay adını bul
        const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        const existingNames = this.months.map(m => m.name.toLowerCase());
        const nextMonth = monthNames.find(m => !existingNames.includes(m.toLowerCase())) || 'Yeni Ay';
        
        input.value = nextMonth;
        modal.classList.add('active');
        setTimeout(() => input.focus(), 100);
    }

    closeAddMonthModal() {
        const modal = document.getElementById('addMonthModal');
        if (modal) modal.classList.remove('active');
    }

    async handleAddMonthSubmit(e) {
        e.preventDefault();
        const input = document.getElementById('newMonthName');
        const name = input.value.trim();
        if (!name) return;

        try {
            await window.budgetDB.addMonth(name);
            this.closeAddMonthModal();
            await this.loadAndRenderAll();
            this.showToast(`${name} ayı tabloya eklendi!`, 'success');
        } catch (err) {
            this.showToast('Ay eklenemedi: ' + err, 'error');
        }
    }

    async promptEditMonth(monthId, currentName) {
        const newName = prompt('Ay adını güncelleyin:', currentName);
        if (newName && newName.trim() && newName.trim() !== currentName) {
            const month = this.months.find(m => m.id === monthId);
            if (month) {
                month.name = newName.trim();
                await window.budgetDB.updateMonth(month);
                await this.loadAndRenderAll();
                this.showToast('Ay adı güncellendi', 'success');
            }
        }
    }

    async confirmDeleteMonth(monthId, monthName) {
        if (this.months.length <= 1) {
            this.showToast('En az bir ay kalmalıdır. Son ayı silemezsiniz.', 'warning');
            return;
        }

        if (confirm(`"${monthName}" ayını ve bu aya ait kayıtları silmek istediğinizden emin misiniz?`)) {
            await window.budgetDB.deleteMonth(monthId);
            await this.loadAndRenderAll();
            this.showToast(`${monthName} silindi.`, 'info');
        }
    }

    // --- KALEM ADI VE SİLME ---
    async promptEditItemName(type, itemId, currentName) {
        const newName = prompt('Kalem adını düzenleyin:', currentName);
        if (newName && newName.trim() && newName.trim() !== currentName) {
            if (type === 'expense') {
                const item = this.expenses.find(e => e.id === itemId);
                if (item) {
                    item.name = newName.trim();
                    await window.budgetDB.updateExpenseItem(item);
                }
            } else {
                const item = this.incomes.find(i => i.id === itemId);
                if (item) {
                    item.name = newName.trim();
                    await window.budgetDB.updateIncomeItem(item);
                }
            }
            await this.loadAndRenderAll();
            this.showToast('Kalem adı güncellendi', 'success');
        }
    }

    async confirmDeleteItem(type, itemId, itemName) {
        if (confirm(`"${itemName}" kaydını silmek istediğinizden emin misiniz?`)) {
            if (type === 'expense') {
                await window.budgetDB.deleteExpenseItem(itemId);
            } else {
                await window.budgetDB.deleteIncomeItem(itemId);
            }
            await this.loadAndRenderAll();
            this.showToast(`${itemName} silindi.`, 'info');
        }
    }

    // --- AYLIK DETAY GÖRÜNÜMÜ ---
    populateMonthDropdowns() {
        const detailSelect = document.getElementById('detailMonthSelect');
        const donutSelect = document.getElementById('donutMonthSelect');

        if (detailSelect) {
            detailSelect.innerHTML = this.months.map(m => `
                <option value="${m.id}" ${m.id === this.selectedDetailMonth ? 'selected' : ''}>${m.name}</option>
            `).join('');
        }

        if (donutSelect) {
            donutSelect.innerHTML = `
                <option value="all">Tüm Aylar Toplamı</option>
                ${this.months.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
            `;
        }
    }

    renderMonthlyDetailView() {
        const container = document.getElementById('monthlyDetailContent');
        if (!container) return;

        const currentMonth = this.months.find(m => m.id === this.selectedDetailMonth) || this.months[0];
        if (!currentMonth) {
            container.innerHTML = '<p class="text-muted">Kayıtlı ay bulunamadı.</p>';
            return;
        }

        const mId = currentMonth.id;

        // Gelirler
        const monthIncomes = this.incomes.map(inc => ({
            name: inc.name,
            category: inc.category,
            amount: Number(inc.values?.[mId]) || 0
        })).filter(i => i.amount > 0);

        // Giderler
        const monthExpenses = this.expenses.map(exp => ({
            name: exp.name,
            category: exp.category,
            amount: Number(exp.values?.[mId]) || 0
        })).filter(e => e.amount > 0);

        const totalInc = monthIncomes.reduce((s, i) => s + i.amount, 0);
        const totalExp = monthExpenses.reduce((s, e) => s + e.amount, 0);
        const extraInc = Number(currentMonth.extraIncome) || 0;
        const netBal = (totalInc - totalExp) + extraInc;

        let html = `
            <div class="month-detail-grid">
                <!-- Sol Kart: Gelirler -->
                <div class="card detail-card border-green">
                    <div class="card-header">
                        <h3>🟢 ${currentMonth.name} Gelirleri</h3>
                        <span class="badge-tag badge-success">${this.formatMoney(totalInc)}</span>
                    </div>
                    <div class="detail-list">
                        ${monthIncomes.length > 0 ? monthIncomes.map(item => `
                            <div class="detail-item-row">
                                <div class="detail-item-info">
                                    <strong>${item.name}</strong>
                                    <span class="text-muted text-sm">${item.category}</span>
                                </div>
                                <span class="font-bold text-success">${this.formatMoney(item.amount)}</span>
                            </div>
                        `).join('') : '<p class="text-muted text-sm">Bu ay için gelir kaydı girilmemiş.</p>'}
                    </div>
                </div>

                <!-- Sağ Kart: Giderler -->
                <div class="card detail-card border-red">
                    <div class="card-header">
                        <h3>🔴 ${currentMonth.name} Giderleri & Kartlar</h3>
                        <span class="badge-tag badge-danger">${this.formatMoney(totalExp)}</span>
                    </div>
                    <div class="detail-list">
                        ${monthExpenses.length > 0 ? monthExpenses.map(item => `
                            <div class="detail-item-row">
                                <div class="detail-item-info">
                                    <strong>${item.name}</strong>
                                    <span class="text-muted text-sm">${item.category}</span>
                                </div>
                                <span class="font-bold text-danger">${this.formatMoney(item.amount)}</span>
                            </div>
                        `).join('') : '<p class="text-muted text-sm">Bu ay için gider kaydı girilmemiş.</p>'}
                    </div>
                </div>
            </div>

            <!-- Alt Özet Çubuğu -->
            <div class="month-summary-bar">
                <div class="summary-metric">
                    <span class="metric-label">Toplam Gelir</span>
                    <span class="metric-val text-success">${this.formatMoney(totalInc)}</span>
                </div>
                <div class="summary-metric">
                    <span class="metric-label">Toplam Gider</span>
                    <span class="metric-val text-danger">${this.formatMoney(totalExp)}</span>
                </div>
                <div class="summary-metric">
                    <span class="metric-label">Fark</span>
                    <span class="metric-val">${this.formatMoney(totalInc - totalExp)}</span>
                </div>
                ${extraInc !== 0 ? `
                <div class="summary-metric">
                    <span class="metric-label">Ek Gelir Akışı</span>
                    <span class="metric-val text-info">${this.formatMoney(extraInc)}</span>
                </div>` : ''}
                <div class="summary-metric highlight">
                    <span class="metric-label">Kalan Net Bakiye</span>
                    <span class="metric-val font-extrabold ${netBal >= 0 ? 'text-primary' : 'text-danger'}">${this.formatMoney(netBal)}</span>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // --- TAB GEÇİŞLERİ ---
    switchTab(tabId) {
        this.activeTab = tabId;
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        document.querySelectorAll('.tab-content').forEach(section => {
            section.classList.toggle('active', section.id === tabId);
        });

        // Tab değiştiğinde grafikleri yeniden boyutlandır
        if (tabId === 'analyticsTab' && window.analyticsManager) {
            window.analyticsManager.updateCharts(this.months, this.expenses, this.incomes);
        }
    }

    // --- BİLDİRİM (TOAST) ---
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
        toast.innerHTML = `<span class="toast-icon">${icon}</span> <span class="toast-text">${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // --- EVENT LISTENERS ---
    bindEvents() {
        // Tab Butonları
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // Ay Ekleme Formu
        const addMonthForm = document.getElementById('addMonthForm');
        if (addMonthForm) {
            addMonthForm.addEventListener('submit', (e) => this.handleAddMonthSubmit(e));
        }

        // Kalem Ekleme Formu
        const addItemForm = document.getElementById('addItemForm');
        if (addItemForm) {
            addItemForm.addEventListener('submit', (e) => this.handleAddItemSubmit(e));
        }

        // Aylık Detay Seçimi
        const detailMonthSelect = document.getElementById('detailMonthSelect');
        if (detailMonthSelect) {
            detailMonthSelect.addEventListener('change', (e) => {
                this.selectedDetailMonth = e.target.value;
                this.renderMonthlyDetailView();
            });
        }

        // Donut Grafiği Ay Filtresi
        const donutMonthSelect = document.getElementById('donutMonthSelect');
        if (donutMonthSelect) {
            donutMonthSelect.addEventListener('change', (e) => {
                window.analyticsManager.selectedDonutMonth = e.target.value;
                window.analyticsManager.renderExpenseDonut(this.months, this.expenses);
            });
        }

        // JSON Yedek İndir / Yükle
        const btnExportJSON = document.getElementById('btnExportJSON');
        if (btnExportJSON) {
            btnExportJSON.addEventListener('click', () => window.exportManager.exportToJSON());
        }

        const importFileInput = document.getElementById('importFileInput');
        if (importFileInput) {
            importFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await window.exportManager.importFromJSON(file);
                    importFileInput.value = '';
                }
            });
        }

        // CSV İndir
        const btnExportCSV = document.getElementById('btnExportCSV');
        if (btnExportCSV) {
            btnExportCSV.addEventListener('click', () => window.exportManager.exportToCSV());
        }

        // Varsayılana Sıfırla
        const btnResetDB = document.getElementById('btnResetDB');
        if (btnResetDB) {
            btnResetDB.addEventListener('click', async () => {
                if (confirm("DİKKAT: Tüm veriler sıfırlanıp ilk fotoğraftaki varsayılan tablolara döndürülecektir. Onaylıyor musunuz?")) {
                    await window.budgetDB.resetToDefault();
                    await this.loadAndRenderAll();
                    this.showToast('Veriler varsayılana sıfırlandı!', 'info');
                }
            });
        }
    }
}

// Uygulama başlatıcı
window.app = new BudgetApp();
document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
