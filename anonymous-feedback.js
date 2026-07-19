import { getApps } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore, addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const app = getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
let visitor = auth.currentUser;

onAuthStateChanged(auth, user => {
  visitor = user;
  const login = document.querySelector('#authBtn');
  if (login && user?.isAnonymous) login.textContent = '관리자 로그인';
});

function addNicknameField(form) {
  if (!form || form.querySelector('[name="authorName"]')) return;
  const name = document.createElement('input');
  name.name = 'authorName';
  name.className = 'nickname-input';
  name.maxLength = 20;
  name.autocomplete = 'nickname';
  name.placeholder = '표시 이름 (선택)';
  name.setAttribute('aria-label', '표시 이름 선택 입력');

  const notice = document.createElement('p');
  notice.className = 'privacy-note';
  notice.textContent = '실명·학교·연락처 등 개인정보 대신 별명이나 닉네임을 사용해 주세요.';
  form.querySelector('textarea')?.before(name);
  form.after(notice);
}

function prepareForms() {
  addNicknameField(document.querySelector('#projectForm'));
  addNicknameField(document.querySelector('#siteForm'));
  const loginMessage = '좋아요와 방명록·질문은 로그인 없이 남길 수 있으며, 글은 교사 검토 후 공개됩니다.';
  document.querySelectorAll('.login-note').forEach(note => {
    if (note.textContent !== loginMessage) note.textContent = loginMessage;
  });
}

new MutationObserver(prepareForms).observe(document.body, { childList: true, subtree: true });
prepareForms();

document.addEventListener('submit', async event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches('#projectForm, #siteForm')) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  if (!visitor) {
    alert('방명록 작성 기능을 준비하고 있습니다. 잠시 후 다시 시도해 주세요.');
    return;
  }

  const values = new FormData(form);
  const content = String(values.get('content') || '').trim();
  const authorName = String(values.get('authorName') || '').trim().slice(0, 20) || '익명 방문자';
  if (!content) return;

  const projectForm = form.id === 'projectForm';
  const payload = {
    type: String(values.get('type')),
    content,
    status: 'pending',
    authorUid: visitor.uid,
    authorName,
    createdAt: serverTimestamp()
  };

  if (projectForm) {
    const title = document.querySelector('#modalBody .modal-top h2')?.textContent?.trim();
    payload.projectId = window.PROJECTS?.find(project => project.title === title)?.id;
  }
  if (projectForm && !payload.projectId) {
    alert('작품 정보를 확인하지 못했습니다. 창을 닫았다가 다시 열어 주세요.');
    return;
  }

  try {
    await addDoc(collection(db, projectForm ? 'feedback' : 'siteFeedback'), payload);
    form.reset();
    alert('글을 받았습니다. 교사 검토 후 공개됩니다.');
  } catch (error) {
    console.error(error);
    alert('글을 저장하지 못했습니다. 익명 로그인이 Firebase에서 활성화되어 있는지 확인해 주세요.');
  }
}, true);

const style = document.createElement('style');
style.textContent = `.community form{grid-template-columns:110px minmax(150px,190px) 1fr auto}.guestbook-wrap form{grid-template-columns:120px minmax(150px,190px) 1fr auto}.nickname-input{min-width:150px;background:#111631;border:1px solid #444c72;color:#eef0fa;padding:10px;font:12px 'Noto Sans KR'}.privacy-note{margin:2px 0 14px;color:#aeb4d7;font-size:12px;line-height:1.6}@media(max-width:850px){.community form,.guestbook-wrap form{grid-template-columns:1fr}.nickname-input{width:100%}}`;
document.head.append(style);
