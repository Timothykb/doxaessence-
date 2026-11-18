export function csvCell(value) {
 const text = String(value ?? '');
 const safe = /^[\s]*[=+@\-]/.test(text) ? "'" + text : text;
 return '"' + safe.replaceAll('"','""') + '"';
}
export function searchTerm(value) {
 return value.trim().replace(/[^\p{L}\p{N}@. +_-]/gu, '').replace(/[_%]/g,'');
}
