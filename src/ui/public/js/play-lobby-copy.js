export const COPY_SUCCESS = '링크를 복사했어요.';
export const COPY_FALLBACK = '링크를 선택했어요. 직접 복사해 주세요.';

function selectFallback(doc, linkNode) {
  if (typeof linkNode.select === 'function') linkNode.select();
  else if (doc.createRange && doc.getSelection) {
    const range = doc.createRange();
    range.selectNodeContents(linkNode);
    doc.getSelection().removeAllRanges();
    doc.getSelection().addRange(range);
  } else if (typeof linkNode.focus === 'function') linkNode.focus();
}

export async function copyInviteLink(doc, linkNode, link) {
  const view = doc.defaultView ?? globalThis;
  try {
    await view.navigator.clipboard.writeText(link);
    return COPY_SUCCESS;
  } catch {
    selectFallback(doc, linkNode);
    return COPY_FALLBACK;
  }
}
