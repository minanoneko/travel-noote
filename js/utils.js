// ==================== Constants ====================
var STORAGE_KEY = 'travel-journal-data';

var CATEGORIES = [
  { key: 'dining', label: '餐饮', icon: '🍽️' },
  { key: 'tickets', label: '门票', icon: '🎫' },
  { key: 'transport', label: '交通', icon: '🚌' },
  { key: 'accommodation', label: '住宿', icon: '🏨' },
  { key: 'shopping', label: '购物', icon: '🛍️' },
  { key: 'entertainment', label: '娱乐', icon: '🎮' },
  { key: 'communication', label: '通讯', icon: '📱' },
  { key: 'medical', label: '医疗', icon: '🏥' },
  { key: 'other', label: '其他', icon: '💡' },
];

var PAYMENT_METHODS = [
  { key: 'alipay', label: '支付宝', icon: '💳' },
  { key: 'wechat', label: '微信支付', icon: '💚' },
  { key: 'cash', label: '现金', icon: '💵' },
  { key: 'bank', label: '银行卡', icon: '🏦' },
  { key: 'applepay', label: 'Apple Pay', icon: '📱' },
];

var CURRENCIES = [
  { code: 'CNY', symbol: '¥' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'JPY', symbol: '¥' },
  { code: 'GBP', symbol: '£' },
  { code: 'HKD', symbol: 'HK$' },
  { code: 'THB', symbol: '฿' },
  { code: 'KRW', symbol: '₩' },
  { code: 'SGD', symbol: 'S$' },
];

var THEME_STORAGE_KEY = 'travel-journal-theme';
var THEMES = {
  green:  { name: '翡翠绿', primary: '#2D6A4F', light: '#40916C' },
  blue:   { name: '海洋蓝', primary: '#1565C0', light: '#1976D2' },
  purple: { name: '薰衣紫', primary: '#6A1B9A', light: '#7B1FA2' },
  orange: { name: '落日橙', primary: '#E65100', light: '#EF6C00' },
  pink:   { name: '玫瑰红', primary: '#C62828', light: '#D32F2F' },
  teal:   { name: '青瓷绿', primary: '#00695C', light: '#00796B' },
};

function loadTheme() {
  try {
    var saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && THEMES[saved]) return saved;
  } catch (e) {}
  return 'green';
}

function saveTheme(key) {
  try { localStorage.setItem(THEME_STORAGE_KEY, key); } catch (e) {}
}

function applyTheme(key) {
  var theme = THEMES[key];
  if (!theme) return;
  var root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primary);
  root.style.setProperty('--color-primary-light', theme.light);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.primary);
}

// ==================== Base Currency ====================
var BASE_CURRENCY_KEY = 'travel-journal-base-currency';

function loadBaseCurrency() {
  try {
    var saved = localStorage.getItem(BASE_CURRENCY_KEY);
    if (saved && CURRENCIES.some(function(c) { return c.code === saved; })) return saved;
  } catch (e) {}
  return 'CNY';
}

function saveBaseCurrency(key) {
  try { localStorage.setItem(BASE_CURRENCY_KEY, key); } catch (e) {}
}

var COMMON_CURRENCY_CODES = ['CNY', 'USD', 'EUR', 'JPY', 'THB', 'HKD'];

function isCommonCurrency(code) {
  return COMMON_CURRENCY_CODES.indexOf(code) > -1;
}

var COLORS = ['#2D6A4F','#40916C','#E76F51','#E9C46A','#287271','#8A5A44','#6B705C','#CB997E','#B5838D','#6D597A'];

// ==================== Helpers ====================
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function getCategoryByKey(key) {
  return CATEGORIES.find(function(c) { return c.key === key; }) || CATEGORIES[CATEGORIES.length - 1];
}

function getPaymentByKey(key) {
  return PAYMENT_METHODS.find(function(p) { return p.key === key; }) || PAYMENT_METHODS[0];
}

function getCurrencyByCode(code) {
  return CURRENCIES.find(function(c) { return c.code === code; }) || CURRENCIES[0];
}

// ==================== Storage ====================
function loadData() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var data = JSON.parse(raw);
      return {
        trips: data.trips || [],
        activeTripId: data.activeTripId || null,
        entries: data.entries || [],
        people: data.people || [],
        expenses: data.expenses || [],
      };
    }
  } catch (e) {
    console.error('Load data error:', e);
  }
  return { trips: [], activeTripId: null, entries: [], people: [], expenses: [] };
}

function saveData(state) {
  try {
    var raw = Vue.toRaw;
    var data = {
      trips: raw(state.trips),
      activeTripId: state.activeTripId,
      entries: raw(state.entries),
      people: raw(state.people),
      expenses: raw(state.expenses),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Save data error:', e);
    alert('⚠️ 存储空间不足，请导出数据备份后清理浏览器数据');
  }
}
