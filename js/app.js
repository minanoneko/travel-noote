// ==================== App ====================
var app = Vue.createApp({
  components: {
    JournalView: JournalView,
    ExpensesView: ExpensesView,
    PeopleView: PeopleView,
    StatsView: StatsView,
    SettingsView: SettingsView,
  },
  data: function() {
    var saved = loadData();
    return {
      trips: saved.trips,
      activeTripId: saved.activeTripId,
      entries: saved.entries,
      people: saved.people,
      expenses: saved.expenses,

      currentTab: 'journal',
      toast: { show: false, message: '' },
      dialog: { show: false, message: '', onConfirm: function() {} },

      showTripForm: false,
      editingTrip: null,
      tripForm: { name: '', startDate: '', endDate: '' },

      showEntryForm: false,
      editingEntry: null,
      entryForm: { date: '', time: '', location: '', content: '' },

      showExpenseForm: false,
      editingExpense: null,
      expenseForm: { amount: '', currency: 'CNY', category: 'dining', paymentMethod: 'alipay', personId: '', beneficiaryIds: [], date: '', note: '', splitMode: 'equal', shares: {} },

      showPersonForm: false,
      personForm: { name: '' },

      baseCurrency: loadBaseCurrency(),

      activeTheme: loadTheme(),
      themes: THEMES,

      categories: CATEGORIES,
      paymentMethods: PAYMENT_METHODS,
      currencies: CURRENCIES,

      showOtherCurrencies: false,

      showQuickPersonInput: false,
      quickPersonName: '',
    };
  },
  computed: {
    filteredEntries: function() {
      var self = this;
      return self.entries.filter(function(e) { return e.tripId === self.activeTripId; });
    },
    filteredExpenses: function() {
      var self = this;
      return self.expenses.filter(function(e) { return e.tripId === self.activeTripId; });
    },
    filteredPeople: function() {
      var self = this;
      return self.people.filter(function(p) { return p.tripId === self.activeTripId; });
    },
    sheetVisible: function() {
      return this.showTripForm || this.showEntryForm || this.showExpenseForm || this.showPersonForm;
    },
    commonCurrencies: function() {
      return this.currencies.filter(function(c) { return isCommonCurrency(c.code); });
    },
    otherCurrencies: function() {
      return this.currencies.filter(function(c) { return !isCommonCurrency(c.code); });
    },
    shareTotal: function() {
      var total = 0;
      for (var pid in this.expenseForm.shares) {
        total += parseFloat(this.expenseForm.shares[pid]) || 0;
      }
      return total;
    },
  },
  watch: {
    trips: { deep: true, handler: 'persist' },
    entries: { deep: true, handler: 'persist' },
    people: { deep: true, handler: 'persist' },
    expenses: { deep: true, handler: 'persist' },
    showTripForm: 'updateScrollLock',
    showEntryForm: 'updateScrollLock',
    showExpenseForm: 'updateScrollLock',
    showPersonForm: 'updateScrollLock',
    'dialog.show': 'updateScrollLock',
    baseCurrency: function(newVal) {
      saveBaseCurrency(newVal);
    },
  },
  methods: {
    persist: function() {
      saveData({
        trips: this.trips,
        activeTripId: this.activeTripId,
        entries: this.entries,
        people: this.people,
        expenses: this.expenses,
      });
    },
    updateScrollLock: function() {
      var locked = this.sheetVisible || this.dialog.show;
      document.body.style.overflow = locked ? 'hidden' : '';
    },
    closeSheet: function() {
      if (this.showTripForm) this.closeTripForm();
      if (this.showEntryForm) this.closeEntryForm();
      if (this.showExpenseForm) this.closeExpenseForm();
      if (this.showPersonForm) this.closePersonForm();
    },
    showToast: function(msg) {
      var self = this;
      self.toast = { show: true, message: msg };
      setTimeout(function() { self.toast.show = false; }, 2000);
    },
    confirm: function(msg, onConfirm) {
      this.dialog = { show: true, message: msg, onConfirm: onConfirm };
    },

    // ===== Trip Management =====
    deleteTrip: function(trip) {
      var self = this;
      self.confirm('确定删除旅行「' + trip.name + '」以及其下所有游记和消费记录吗？', function() {
        var tid = trip.id;
        var idx = self.trips.findIndex(function(t) { return t.id === tid; });
        if (idx > -1) self.trips.splice(idx, 1);
        for (var i = self.entries.length - 1; i >= 0; i--) {
          if (self.entries[i].tripId === tid) self.entries.splice(i, 1);
        }
        for (var i = self.people.length - 1; i >= 0; i--) {
          if (self.people[i].tripId === tid) self.people.splice(i, 1);
        }
        for (var i = self.expenses.length - 1; i >= 0; i--) {
          if (self.expenses[i].tripId === tid) self.expenses.splice(i, 1);
        }
        if (self.activeTripId === tid) {
          self.activeTripId = self.trips.length > 0 ? self.trips[0].id : null;
        }
        self.showToast('已删除');
      });
    },
    openTripForm: function(trip) {
      if (trip) {
        this.editingTrip = trip;
        this.tripForm = {
          name: trip.name,
          startDate: trip.startDate || '',
          endDate: trip.endDate || '',
        };
      } else {
        this.editingTrip = null;
        this.tripForm = { name: '', startDate: '', endDate: '' };
      }
      this.showTripForm = true;
    },
    closeTripForm: function() {
      this.showTripForm = false;
      this.editingTrip = null;
    },
    saveTrip: function() {
      if (!this.tripForm.name.trim()) {
        this.showToast('请输入旅行名称');
        return;
      }
      if (this.editingTrip) {
        Object.assign(this.editingTrip, {
          name: this.tripForm.name.trim(),
          startDate: this.tripForm.startDate,
          endDate: this.tripForm.endDate,
        });
      } else {
        var trip = {
          id: genId(),
          name: this.tripForm.name.trim(),
          startDate: this.tripForm.startDate,
          endDate: this.tripForm.endDate,
          createdAt: new Date().toISOString(),
        };
        this.trips.push(trip);
        this.activeTripId = trip.id;
      }
      this.closeTripForm();
      this.showToast(this.editingTrip ? '旅行已更新' : '旅行已创建');
    },

    // ===== Entry Management =====
    openEntryForm: function(entry) {
      if (entry) {
        this.editingEntry = entry;
        this.entryForm = {
          date: entry.date || today(),
          time: entry.time || '',
          location: entry.location || '',
          content: entry.content || '',
        };
      } else {
        this.editingEntry = null;
        this.entryForm = { date: today(), time: '', location: '', content: '' };
      }
      this.showEntryForm = true;
    },
    closeEntryForm: function() {
      this.showEntryForm = false;
      this.editingEntry = null;
    },
    saveEntry: function() {
      if (!this.entryForm.location.trim()) {
        this.showToast('请填写地点');
        return;
      }
      if (this.editingEntry) {
        Object.assign(this.editingEntry, {
          date: this.entryForm.date,
          time: this.entryForm.time,
          location: this.entryForm.location.trim(),
          content: this.entryForm.content,
        });
      } else {
        this.entries.push({
          id: genId(),
          tripId: this.activeTripId,
          date: this.entryForm.date,
          time: this.entryForm.time,
          location: this.entryForm.location.trim(),
          content: this.entryForm.content,
          createdAt: new Date().toISOString(),
        });
      }
      this.closeEntryForm();
      this.showToast('保存成功');
    },
    editEntry: function(entry) { this.openEntryForm(entry); },
    deleteEntry: function(entry) {
      var self = this;
      self.confirm('确定删除这条游记吗？', function() {
        var idx = self.entries.findIndex(function(e) { return e.id === entry.id; });
        if (idx > -1) self.entries.splice(idx, 1);
        self.showToast('已删除');
      });
    },

    // ===== Expense Management =====
    openExpenseForm: function(expense) {
      if (expense) {
        this.editingExpense = expense;
        this.expenseForm = {
          amount: expense.amount || '',
          currency: expense.currency || 'CNY',
          category: expense.category || 'dining',
          paymentMethod: expense.paymentMethod || 'alipay',
          personId: expense.personId || '',
          beneficiaryIds: expense.beneficiaryIds ? [].concat(expense.beneficiaryIds) : this.filteredPeople.map(function(p) { return p.id; }),
          date: expense.date || today(),
          note: expense.note || '',
          splitMode: expense.splitMode || 'equal',
          shares: expense.shares ? Object.assign({}, expense.shares) : {},
        };
        this.showOtherCurrencies = !isCommonCurrency(this.expenseForm.currency);
      } else {
        this.editingExpense = null;
        var firstPerson = this.filteredPeople[0];
        this.expenseForm = {
          amount: '',
          currency: 'CNY',
          category: 'dining',
          paymentMethod: 'alipay',
          personId: firstPerson ? firstPerson.id : '',
          beneficiaryIds: [],
          date: today(),
          note: '',
          splitMode: 'equal',
          shares: {},
        };
        this.showOtherCurrencies = false;
      }
      this.showExpenseForm = true;
    },
    toggleBeneficiary: function(pid) {
      var ids = this.expenseForm.beneficiaryIds;
      var idx = ids.indexOf(pid);
      if (idx > -1) {
        ids.splice(idx, 1);
        // 从自定义分摊中移除该人
        delete this.expenseForm.shares[pid];
      } else {
        ids.push(pid);
        // 自定义模式下新增的人给一个默认金额
        if (this.expenseForm.splitMode === 'custom') {
          this.expenseForm.shares[pid] = '0';
        }
      }
    },
    setSplitMode: function(mode) {
      this.expenseForm.splitMode = mode;
      if (mode === 'custom') {
        var ids = this.expenseForm.beneficiaryIds;
        var amount = parseFloat(this.expenseForm.amount) || 0;
        var share = ids.length > 0 ? (amount / ids.length).toFixed(2) : '0';
        var shares = {};
        ids.forEach(function(id) { shares[id] = share; });
        this.expenseForm.shares = shares;
      } else {
        this.expenseForm.shares = {};
      }
    },
    getPersonName: function(pid) {
      var p = this.people.find(function(x) { return x.id === pid; });
      return p ? p.name : '';
    },
    closeExpenseForm: function() {
      this.showExpenseForm = false;
      this.editingExpense = null;
      this.showOtherCurrencies = false;
      this.quickPersonName = '';
      this.showQuickPersonInput = false;
      this.expenseForm.splitMode = 'equal';
      this.expenseForm.shares = {};
    },
    addQuickPerson: function() {
      var name = this.quickPersonName.trim();
      if (!name) {
        this.showToast('请输入姓名');
        return;
      }
      var usedColors = this.filteredPeople.map(function(p) { return p.color; });
      var color = COLORS.find(function(c) { return !usedColors.includes(c); }) || COLORS[this.filteredPeople.length % COLORS.length];
      var person = {
        id: genId(),
        tripId: this.activeTripId,
        name: name,
        color: color,
        createdAt: new Date().toISOString(),
      };
      this.people.push(person);
      this.expenseForm.personId = person.id;
      this.quickPersonName = '';
      this.showQuickPersonInput = false;
      this.showToast('已添加 ' + name);
    },
    saveExpense: function() {
      var self = this;
      var amount = parseFloat(self.expenseForm.amount);
      if (isNaN(amount) || amount <= 0) {
        self.showToast('请输入有效金额');
        return;
      }
      if (self.filteredPeople.length > 0 && !self.expenseForm.personId) {
        self.showToast('请选择经手人');
        return;
      }
      var person = self.people.find(function(p) { return p.id === self.expenseForm.personId; });
      var personName = person ? person.name : '未知';

      if (this.editingExpense) {
        Object.assign(this.editingExpense, {
          amount: amount,
          currency: this.expenseForm.currency,
          category: this.expenseForm.category,
          paymentMethod: this.expenseForm.paymentMethod,
          personId: this.expenseForm.personId,
          personName: personName,
          beneficiaryIds: [].concat(this.expenseForm.beneficiaryIds),
          date: this.expenseForm.date,
          note: this.expenseForm.note,
          exchangeRate: this.editingExpense.exchangeRate,
          baseAmount: this.editingExpense.exchangeRate != null ? amount * this.editingExpense.exchangeRate : void 0,
          splitMode: this.expenseForm.splitMode,
          shares: this.expenseForm.splitMode === 'custom' ? Object.assign({}, this.expenseForm.shares) : {},
        });
      } else {
        this.expenses.push({
          id: genId(),
          tripId: this.activeTripId,
          amount: amount,
          currency: this.expenseForm.currency,
          category: this.expenseForm.category,
          paymentMethod: this.expenseForm.paymentMethod,
          personId: this.expenseForm.personId,
          personName: personName,
          beneficiaryIds: [].concat(this.expenseForm.beneficiaryIds),
          date: this.expenseForm.date,
          note: this.expenseForm.note,
          createdAt: new Date().toISOString(),
          splitMode: this.expenseForm.splitMode,
          shares: this.expenseForm.splitMode === 'custom' ? Object.assign({}, this.expenseForm.shares) : {},
        });
      }
      this.closeExpenseForm();
      this.showToast('已记录');
    },
    editExpense: function(expense) { this.openExpenseForm(expense); },
    deleteExpense: function(expense) {
      var self = this;
      self.confirm('确定删除这笔支出吗？', function() {
        var idx = self.expenses.findIndex(function(e) { return e.id === expense.id; });
        if (idx > -1) self.expenses.splice(idx, 1);
        self.showToast('已删除');
      });
    },

    // ===== Person Management =====
    openPersonForm: function() {
      this.personForm = { name: '' };
      this.showPersonForm = true;
    },
    closePersonForm: function() {
      this.showPersonForm = false;
    },
    savePerson: function() {
      if (!this.personForm.name.trim()) {
        this.showToast('请输入姓名');
        return;
      }
      var usedColors = this.filteredPeople.map(function(p) { return p.color; });
      var color = COLORS.find(function(c) { return !usedColors.includes(c); }) || COLORS[this.filteredPeople.length % COLORS.length];
      this.people.push({
        id: genId(),
        tripId: this.activeTripId,
        name: this.personForm.name.trim(),
        color: color,
        createdAt: new Date().toISOString(),
      });
      this.closePersonForm();
      this.showToast('已添加');
    },
    deletePerson: function(person) {
      var self = this;
      self.confirm('确定移除 ' + person.name + ' 吗？', function() {
        var idx = self.people.findIndex(function(p) { return p.id === person.id; });
        if (idx > -1) self.people.splice(idx, 1);
        self.showToast('已移除');
      });
    },

    // ===== Exchange Rate Batch Set =====
    setCurrencyRate: function(currencyCode, rate) {
      var self = this;
      var tripExpenses = self.expenses.filter(function(e) { return e.tripId === self.activeTripId && e.currency === currencyCode; });
      if (tripExpenses.length === 0) {
        self.showToast('没有该币种的支出');
        return;
      }
      tripExpenses.forEach(function(e) {
        e.exchangeRate = rate;
        e.baseAmount = e.amount * rate;
      });
      self.showToast('已应用汇率');
    },

    // ===== Theme =====
    onThemeChange: function(key) {
      this.activeTheme = key;
      applyTheme(key);
      saveTheme(key);
    },

    // ===== Share via URL =====
    shareData: function() {
      var self = this;
      try {
        var data = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          trips: Vue.toRaw(self.trips),
          entries: Vue.toRaw(self.entries),
          people: Vue.toRaw(self.people),
          expenses: Vue.toRaw(self.expenses),
        };
        var json = JSON.stringify(data);
        var compressed = btoa(unescape(encodeURIComponent(json)));
        var url = window.location.href.split('#')[0] + '#data=' + compressed;
        navigator.clipboard.writeText(url).then(function() {
          self.showToast('✅ 链接已复制，发送给好友即可');
        }).catch(function() {
          prompt('复制下面的链接发送给好友：', url);
        });
      } catch (e) {
        console.error('Share error:', e);
        self.showToast('数据太大，请使用导出功能');
      }
    },

    // ===== Check URL for shared data =====
    checkSharedData: function() {
      var self = this;
      try {
        var hash = window.location.hash;
        if (!hash || !hash.startsWith('#data=')) return;
        var compressed = hash.replace('#data=', '');
        var json = decodeURIComponent(escape(atob(compressed)));
        var data = JSON.parse(json);
        if (!data.trips || !data.entries || !data.people || !data.expenses) {
          self.showToast('分享数据无效');
          return;
        }
        self.confirm('检测到分享数据，是否导入？（将合并到当前数据中）', function() {
          var existingTrips = new Set(self.trips.map(function(t) { return t.id; }));
          var existingEntries = new Set(self.entries.map(function(e) { return e.id; }));
          var existingPeople = new Set(self.people.map(function(p) { return p.id; }));
          var existingExpenses = new Set(self.expenses.map(function(e) { return e.id; }));

          data.trips.forEach(function(t) { if (!existingTrips.has(t.id)) { self.trips.push(t); } });
          data.entries.forEach(function(e) { if (!existingEntries.has(e.id)) { self.entries.push(e); } });
          data.people.forEach(function(p) { if (!existingPeople.has(p.id)) { self.people.push(p); } });
          data.expenses.forEach(function(e) { if (!existingExpenses.has(e.id)) { self.expenses.push(e); } });

          history.replaceState(null, '', window.location.pathname);
          self.showToast('✅ 导入成功');
        });
      } catch (e) {
        console.error('Check shared data error:', e);
        self.showToast('分享数据解析失败');
      }
    },

    // ===== Import / Export =====
    exportData: function() {
      var self = this;
      try {
        var data = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          trips: Vue.toRaw(self.trips),
          entries: Vue.toRaw(self.entries),
          people: Vue.toRaw(self.people),
          expenses: Vue.toRaw(self.expenses),
        };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = '旅行手账备份_' + today() + '.json';
        a.click();
        URL.revokeObjectURL(url);
        self.showToast('导出成功');
      } catch (e) {
        console.error('Export error:', e);
        self.showToast('导出失败');
      }
    },
    importData: function(event) {
      var self = this;
      var file = event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var data = JSON.parse(e.target.result);
          if (!data.trips || !data.entries || !data.people || !data.expenses) {
            self.showToast('无效的数据文件');
            return;
          }
          self.confirm('导入将覆盖当前所有数据，确认？', function() {
            self.trips.splice(0, self.trips.length);
            Array.prototype.push.apply(self.trips, data.trips);
            self.entries.splice(0, self.entries.length);
            Array.prototype.push.apply(self.entries, data.entries);
            self.people.splice(0, self.people.length);
            Array.prototype.push.apply(self.people, data.people);
            self.expenses.splice(0, self.expenses.length);
            Array.prototype.push.apply(self.expenses, data.expenses);
            if (self.trips.length > 0) {
              self.activeTripId = self.trips[0].id;
            }
            self.showToast('导入成功');
          });
        } catch (err) {
          self.showToast('文件解析失败');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    },
    confirmClear: function() {
      var self = this;
      self.confirm('确定清空所有数据吗？此操作不可恢复！', function() {
        self.trips.splice(0);
        self.entries.splice(0);
        self.people.splice(0);
        self.expenses.splice(0);
        self.activeTripId = null;
        self.showToast('已清空');
      });
    },
  },
  mounted: function() {
    var self = this;
    applyTheme(self.activeTheme);
    if (self.trips.length > 0 && !self.trips.find(function(t) { return t.id === self.activeTripId; })) {
      self.activeTripId = self.trips[0].id;
    }
    self.checkSharedData();
  },
});

app.mount('#app');
