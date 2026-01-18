const vakifbankTanisma = require('./banks/vakifbank-tanisma');
const odeabank = require('./banks/odeabank');

console.log('VakıfBank Tanışma script sample:');
console.log(vakifbankTanisma.script.substring(0, 500));
console.log('\n\nOdeabank script sample:');
console.log(odeabank.script.substring(0, 500));

// Check the JSON structure they create
console.log('\n\n=== Checking JSON structure ===');
console.log('VakıfBank creates headers from tableRows (amount ranges)');
console.log('VakıfBank creates rows from durationHeaders with rates mapped from tableRows');
console.log('\nThis means:');
console.log('- headers = [{label: "1000-5000 TL", minAmount: 1000, maxAmount: 5000}, ...]');
console.log('- rows = [{label: "32 Gün", minDays: 32, maxDays: 32, rates: [rate1, rate2, ...]}, ...]');
console.log('- rates[i] corresponds to headers[i]');
