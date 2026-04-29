// ==================== Component: JournalView ====================
var JournalView = {
  template: '#journal-view-template',
  props: {
    entries: Array,
    people: Array,
  },
  emits: ['add', 'edit', 'delete'],
  computed: {
    sortedEntries: function() {
      var self = this;
      return [].concat(self.entries).sort(function(a, b) {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
    }
  }
};

// ==================== Component: ExpensesView ====================
var ExpensesView = {
  template: '#expenses-view-template',
  props: {
    expenses: Array,
    people: Array,
    currencies: Array,
    baseCurrency: String,
  },
  emits: ['add', 'edit', 'delete'],
  data: function() {
    return {
      filterPersonId: '__all__',
    };
  },
  computed: {
    displayExpenses: function() {
      var self = this;
      if (this.filterPersonId === '__all__') return this.expenses;
      return this.expenses.filter(function(e) { return e.personId === self.filterPersonId; });
    },
    total: function() {
      return this.displayExpenses.reduce(function(sum, e) { return sum + (parseFloat(e.amount) || 0); }, 0);
    },
    totalStr: function() {
      var mainCurrency = this.getMainCurrency();
      return mainCurrency.symbol + this.total.toFixed(2);
    },
    sortedExpenses: function() {
      var self = this;
      return [].concat(self.displayExpenses).sort(function(a, b) {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    }
  },
  methods: {
    getCategoryLabel: function(key) { return getCategoryByKey(key).label; },
    getPaymentLabel: function(key) { return getPaymentByKey(key).label; },
    getCurrencySymbol: function(code) { return getCurrencyByCode(code).symbol; },
    getPersonColor: function(personId) {
      var p = this.people.find(function(x) { return x.id === personId; });
      return p ? p.color : '#999';
    },
    getPersonName: function(personId) {
      var p = this.people.find(function(x) { return x.id === personId; });
      return p ? p.name : '未知';
    },
    getMainCurrency: function() {
      var codes = this.displayExpenses.map(function(e) { return e.currency; }).filter(Boolean);
      var freq = {};
      var max = 0, main = 'CNY';
      codes.forEach(function(c) { freq[c] = (freq[c] || 0) + 1; });
      Object.entries(freq).forEach(function(entry) {
        var c = entry[0], n = entry[1];
        if (n > max) { max = n; main = c; }
      });
      return getCurrencyByCode(main);
    },
    getBeneficiaryText: function(expense) {
      var self = this;
      var ids = expense.beneficiaryIds;
      if (!ids || ids.length === 0) return '';
      var allIds = self.people.map(function(p) { return p.id; });
      if (ids.length === allIds.length) return '';
      var names = ids.map(function(id) {
        var p = self.people.find(function(x) { return x.id === id; });
        return p ? p.name : '';
      }).filter(Boolean);
      return names.length > 0 ? names.length + '人（' + names.join('、') + '）' : '';
    },
    getBaseConversion: function(expense) {
      var baseAmount = expense.baseAmount != null ? expense.baseAmount : null;
      if (baseAmount == null || expense.currency === this.baseCurrency) return '';
      var sym = getCurrencyByCode(this.baseCurrency).symbol;
      return sym + baseAmount.toFixed(2);
    }
  }
};

// ==================== Component: PeopleView ====================
var PeopleView = {
  template: '#people-view-template',
  props: { people: Array },
  emits: ['add', 'delete'],
};

// ==================== Component: StatsView ====================
var StatsView = {
  template: '#stats-view-template',
  props: {
    expenses: Array,
    people: Array,
    currencies: Array,
    categories: Array,
    baseCurrency: String,
  },
  emits: ['set-currency-rate'],
  data: function() {
    return {
      chartInstance: null,
      selectedPersonId: '__all__',
      rateInputs: {},
    };
  },
  computed: {
    isPersonMode: function() {
      return this.selectedPersonId !== '__all__' && this.selectedPersonId;
    },
    currentPerson: function() {
      return this.people.find(function(p) { return p.id === this.selectedPersonId; }) || { name: '' };
    },
    baseSymbol: function() {
      var c = getCurrencyByCode(this.baseCurrency);
      return c ? c.symbol : '¥';
    },
    baseCode: function() {
      return this.baseCurrency || 'CNY';
    },
    foreignCurrencies: function() {
      var self = this;
      var codes = [];
      var seen = {};
      self.expenses.forEach(function(e) {
        if (e.currency && e.currency !== self.baseCurrency && !seen[e.currency]) {
          seen[e.currency] = true;
          codes.push(e.currency);
        }
      });
      return codes.map(function(code) {
        return {
          code: code,
          symbol: getCurrencyByCode(code).symbol,
          count: self.expenses.filter(function(e) { return e.currency === code; }).length,
          rateSet: self.expenses.filter(function(e) { return e.currency === code && e.exchangeRate != null; }).length,
        };
      });
    },
    unconvertedCount: function() {
      var self = this;
      return self.expenses.filter(function(e) {
        if (e.currency === self.baseCurrency) return false;
        return e.exchangeRate == null;
      }).length;
    },
    getBaseAmount: function() {
      var self = this;
      return function(e) {
        if (e.baseAmount != null) return e.baseAmount;
        if (e.exchangeRate != null) return (parseFloat(e.amount) || 0) * e.exchangeRate;
        if (e.currency === self.baseCurrency) return parseFloat(e.amount) || 0;
        return null;
      };
    },
    filteredExpenses: function() {
      var list = this.expenses;
      if (this.isPersonMode) {
        var pid = this.selectedPersonId;
        list = list.filter(function(e) { return e.personId === pid; });
      }
      return list;
    },
    displayTotal: function() {
      var get = this.getBaseAmount;
      return this.filteredExpenses.reduce(function(sum, e) {
        var amt = get(e);
        return amt != null ? sum + amt : sum;
      }, 0);
    },
    summaryTitle: function() {
      var person = this.isPersonMode ? this.currentPerson.name + ' 的' : '';
      var suffix = this.unconvertedCount > 0 ? '（有未换算的外币）' : '';
      return person + this.baseSymbol + this.baseCode + ' 支出' + suffix;
    },
    categoryStats: function() {
      var get = this.getBaseAmount;
      var map = {};
      var self = this;
      this.categories.forEach(function(c) {
        map[c.key] = { key: c.key, label: c.label, icon: c.icon, total: 0 };
      });
      this.filteredExpenses.forEach(function(e) {
        var key = e.category || 'other';
        if (!map[key]) map[key] = { key: key, label: '其他', icon: '💡', total: 0 };
        var amt = get(e);
        if (amt != null) map[key].total += amt;
      });
      var arr = Object.values(map).filter(function(x) { return x.total > 0; });
      var total = this.displayTotal;
      arr.forEach(function(item) {
        item.percent = total > 0 ? ((item.total / total) * 100).toFixed(1) : 0;
      });
      return arr.sort(function(a, b) { return b.total - a.total; });
    },
    personStats: function() {
      var map = {};
      var self = this;
      this.people.forEach(function(p) {
        map[p.id] = { personId: p.id, name: p.name, total: 0, count: 0 };
      });
      var get = this.getBaseAmount;
      this.filteredExpenses.forEach(function(e) {
        if (!map[e.personId]) {
          map[e.personId] = { personId: e.personId, name: e.personName || '未知', total: 0, count: 0 };
        }
        var amt = get(e);
        if (amt != null) map[e.personId].total += amt;
        map[e.personId].count++;
      });
      return Object.values(map).filter(function(x) { return x.count > 0; }).sort(function(a, b) { return b.total - a.total; });
    },
    chartColors: function() {
      var palette = ['#2D6A4F','#40916C','#E76F51','#E9C46A','#287271','#8A5A44','#6B705C','#CB997E','#B5838D'];
      return this.categoryStats.map(function(_, i) {
        return palette[i % palette.length];
      });
    },
    settlementBalances: function() {
      var balances = {};
      var self = this;
      this.people.forEach(function(p) {
        balances[p.id] = { personId: p.id, name: p.name, totalPaid: 0, totalShouldered: 0, net: 0 };
      });
      var get = this.getBaseAmount;
      this.filteredExpenses.forEach(function(e) {
        var amount = get(e);
        if (amount == null || amount <= 0) return;
        if (balances[e.personId]) {
          balances[e.personId].totalPaid += amount;
        }
        var beneficiaryIds = self.getExpenseBeneficiaries(e);
        var origAmount = parseFloat(e.amount) || 0;
        beneficiaryIds.forEach(function(id) {
          if (balances[id]) {
            var share;
            if (e.splitMode === 'custom' && e.shares && e.shares[id] != null) {
              var raw = parseFloat(e.shares[id]) || 0;
              share = origAmount > 0 ? raw * (amount / origAmount) : raw;
            } else {
              share = amount / Math.max(beneficiaryIds.length, 1);
            }
            balances[id].totalShouldered += share;
          }
        });
      });
      Object.values(balances).forEach(function(b) {
        b.net = b.totalPaid - b.totalShouldered;
      });
      return Object.values(balances).filter(function(b) { return Math.abs(b.net) >= 0.01; });
    },
    settlementPlan: function() {
      var balances = this.settlementBalances.map(function(b) { return Object.assign({}, b); });
      var creditors = balances.filter(function(b) { return b.net > 0.01; }).sort(function(a, b) { return b.net - a.net; });
      var debtors = balances.filter(function(b) { return b.net < -0.01; }).sort(function(a, b) { return a.net - b.net; });
      var plan = [];
      for (var di = 0; di < debtors.length; di++) {
        var debtor = debtors[di];
        var remaining = -debtor.net;
        for (var ci = 0; ci < creditors.length; ci++) {
          var creditor = creditors[ci];
          if (remaining <= 0.01) break;
          if (creditor.net <= 0.01) continue;
          var amount = Math.min(remaining, creditor.net);
          if (amount >= 0.01) {
            plan.push({ from: debtor, to: creditor, amount: amount });
            creditor.net -= amount;
            remaining -= amount;
          }
        }
      }
      return plan;
    }
  },
  watch: {
    categoryStats: {
      deep: true,
      handler: function() { this.renderChart(); }
    },
    selectedPersonId: function() {
      this.renderChart();
    }
  },
  methods: {
    getExpenseBeneficiaries: function(expense) {
      var self = this;
      if (expense.beneficiaryIds != null && expense.beneficiaryIds.length > 0) {
        return expense.beneficiaryIds.filter(function(id) { return self.people.some(function(p) { return p.id === id; }); });
      }
      // null/undefined = old data, split among all; [] = personal expense
      if (expense.beneficiaryIds == null) {
        return self.people.map(function(p) { return p.id; });
      }
      return expense.personId ? [expense.personId] : [];
    },
    applyRate: function(currencyCode) {
      var rate = parseFloat(this.rateInputs[currencyCode]);
      if (!rate || rate <= 0) return;
      this.$emit('set-currency-rate', currencyCode, rate);
    },
    renderChart: function() {
      var self = this;
      if (!self.$refs.chartCanvas) return;
      Vue.nextTick(function() {
        if (self.chartInstance) {
          self.chartInstance.destroy();
          self.chartInstance = null;
        }
        var canvas = self.$refs.chartCanvas;
        if (!canvas) return;
        var labels = self.categoryStats.map(function(c) { return c.icon + ' ' + c.label; });
        var data = self.categoryStats.map(function(c) { return c.total; });
        var colors = self.chartColors;
        if (data.length === 0) return;
        self.chartInstance = new Chart(canvas.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12 } }
            }
          }
        });
      });
    }
  },
  mounted: function() {
    this.renderChart();
  },
  unmounted: function() {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }
};

// ==================== Component: SettingsView ====================
var SettingsView = {
  template: '#settings-view-template',
  props: {
    trips: Array,
    tripCount: Number,
    entryCount: Number,
    expenseCount: Number,
    currencies: Array,
    baseCurrency: String,
    themes: Object,
    theme: String,
  },
  emits: ['export', 'import', 'share', 'clear', 'delete-trip', 'switch-trip', 'change-theme', 'change-base-currency'],
  data: function() {
    return {
      showOtherCurrencies: false,
    };
  },
  computed: {
    commonCurrencies: function() {
      return this.currencies.filter(function(c) { return isCommonCurrency(c.code); });
    },
    otherCurrencies: function() {
      return this.currencies.filter(function(c) { return !isCommonCurrency(c.code); });
    },
  },
};
