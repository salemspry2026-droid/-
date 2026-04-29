const firestore = require('firebase/firestore');
console.log(Object.keys(firestore).filter(k => k.toLowerCase().includes('persist') || k.toLowerCase().includes('offline') || k.toLowerCase().includes('indexeddb') || k.toLowerCase().includes('cache')));
