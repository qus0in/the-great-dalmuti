export function containsCode(code, codes) {
  return typeof code === 'string' && codes.includes(code);
}
export function hasName(err, names) {
  const name = err?.name ?? err?.constructor?.name ?? '';
  return names.includes(name);
}
export function hasKind(err, kind) {
  return err?.kind === kind || err?.type === kind || err?.category === kind;
}
