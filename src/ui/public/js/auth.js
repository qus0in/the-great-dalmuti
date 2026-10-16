import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';

let client = null;

// 서버에서 공개 설정을 읽어 클라이언트를 만든다 (세션은 탭별로 보관)
export async function getClient() {
  if (client) {
    return client;
  }
  // eslint-disable-next-line compat/compat -- 공개 설정 조회는 fetch가 표준 (IE11은 지원 종료)
  const res = await fetch('/api/config');
  const { supabaseUrl, supabasePublishableKey } = await res.json();
  client = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { storage: window.sessionStorage },
  });
  return client;
}

// 구글 로그인 (끝나면 지금 페이지로 돌아온다)
export async function signInWithGoogle() {
  const sb = await getClient();
  await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href },
  });
}

// 로그아웃
export async function signOut() {
  const sb = await getClient();
  await sb.auth.signOut();
  syncAuthUI(null);
}

// 지금 사용자 (없으면 null)
export async function currentUser() {
  const sb = await getClient();
  const { data } = await sb.auth.getSession();
  return data.session?.user ?? null;
}

// 세션이 없으면 대기실로 돌려보낸다 (play 전용)
export async function requireSession() {
  const user = await currentUser();
  if (!user) {
    window.location.replace('/');
  }
  return user;
}

// 대기실 표시 전환 (data-auth 속성으로만 찾는다)
export function syncAuthUI(user) {
  const name = user?.user_metadata?.full_name ?? user?.email ?? '';
  for (const el of document.querySelectorAll('[data-auth="signed-in"]')) {
    el.hidden = !user;
  }
  for (const el of document.querySelectorAll('[data-auth="signed-out"]')) {
    el.hidden = Boolean(user);
  }
  for (const el of document.querySelectorAll('[data-auth="user-name"]')) {
    el.textContent = name;
  }
}

// 대기실(index.html)에 로그인 블록이 있으면 연결한다
async function initHall() {
  if (!document.querySelector('[data-auth]')) {
    return;
  }
  document
    .querySelector('[data-auth="login"]')
    ?.addEventListener('click', () => {
      signInWithGoogle();
    });
  document
    .querySelector('[data-auth="logout"]')
    ?.addEventListener('click', () => {
      signOut();
    });
  try {
    const sb = await getClient();
    const { data } = await sb.auth.getSession();
    syncAuthUI(data.session?.user ?? null);
    sb.auth.onAuthStateChange((_event, session) => {
      syncAuthUI(session?.user ?? null);
    });
  } catch {
    syncAuthUI(null);
  }
}

initHall();
