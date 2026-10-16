// 게임 화면 진입 시 로그인 세션을 확인하고 미인증 시 대기실로 이동한다.
import { requireSession } from './auth.js';

await requireSession();
