import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore, collection, onSnapshot, updateDoc, doc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const config = { apiKey: 'AIzaSyApXaG_rT0-veZzozy3Wtns2IGHZqDOYXc', authDomain: 'bss-astronomy-2026.firebaseapp.com', projectId: 'bss-astronomy-2026', storageBucket: 'bss-astronomy-2026.firebasestorage.app', messagingSenderId: '1054853511225', appId: '1:1054853511225:web:c95e38bac3512d815b75e8' };
const app = initializeApp(config), auth = getAuth(app), db = getFirestore(app), teacherEmail = 'sjm4104@gmail.com', projects = window.PROJECTS || [];
let user = null, feedbackItems = [], siteItems = [], likeTotal = 0, stops = [], likeCounts = new Map(), searchText = '';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const projectLabel = id => { const project = projects.find(item => item.id === id); return project ? `${project.studentId} · ${project.title}` : '전체 방명록'; };
const dateLabel = value => value?.seconds ? new Date(value.seconds * 1000).toLocaleString('ko-KR') : '방금 전';
const isTeacher = () => user?.email === teacherEmail;

function refresh() {
  const items = [...feedbackItems, ...siteItems];
  $('#pendingCount').textContent = items.filter(item => item.status === 'pending').length;
  $('#publishedCount').textContent = items.filter(item => item.status === 'published').length;
  $('#likeCount').textContent = likeTotal;
  $('#siteCount').textContent = siteItems.length;
  const projectFilter = $('#projectFilter');
  if (projectFilter && projectFilter.options.length === 1) projects.forEach(project => projectFilter.add(new Option(`${project.studentId} · ${project.title}`, project.id)));
  render();
}
function showError() { $('#adminList').innerHTML = '<p class="empty-feedback">데이터를 불러오지 못했습니다. 로그인 상태와 Firestore 규칙을 확인해 주세요.</p>'; }
function listen() {
  stops.forEach(stop => stop());
  likeCounts = new Map();
  stops = [
    onSnapshot(collection(db, 'feedback'), snapshot => { feedbackItems = snapshot.docs.map(item => ({ ...item.data(), id: item.id, collection: 'feedback' })); refresh(); }, showError),
    onSnapshot(collection(db, 'siteFeedback'), snapshot => { siteItems = snapshot.docs.map(item => ({ ...item.data(), id: item.id, collection: 'siteFeedback' })); refresh(); }, showError),
    ...projects.map(project => onSnapshot(collection(db, 'projects', project.id, 'likes'), snapshot => { likeCounts.set(project.id, snapshot.size); likeTotal = [...likeCounts.values()].reduce((sum, count) => sum + count, 0); refresh(); }, () => { likeCounts.set(project.id, 0); }))
  ];
}
function render() {
  const kind = $('#kindFilter').value, status = $('#statusFilter').value, projectId = $('#projectFilter').value, sort = $('#sortFilter').value;
  const filtered = [...feedbackItems, ...siteItems].filter(item => (kind === 'all' || item.collection === kind) && (status === 'all' || item.status === status) && (projectId === 'all' || item.projectId === projectId) && `${projectLabel(item.projectId)} ${item.content} ${item.authorName || ''}`.toLowerCase().includes(searchText)).sort((a, b) => sort === 'oldest' ? (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0) : sort === 'project' ? projectLabel(a.projectId).localeCompare(projectLabel(b.projectId), 'ko') : (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  $('#adminList').innerHTML = filtered.length ? filtered.map(item => `<article class="admin-item"><span>${item.collection === 'feedback' ? '작품 피드백' : '전체 방명록'} · ${esc(item.type)} · ${item.status === 'pending' ? '검토 대기' : item.status === 'published' ? '공개됨' : '숨김'}</span><h3>${esc(projectLabel(item.projectId))}</h3><p>${esc(item.content)}</p><small>${esc(item.authorName || '익명 방문자')} · ${dateLabel(item.createdAt)}</small><div class="moderate"><button data-id="${item.id}" data-col="${item.collection}" data-status="published">이상 없음 · 공개</button><button data-id="${item.id}" data-col="${item.collection}" data-status="hidden">숨김 처리</button></div></article>`).join('') : '<p class="empty-feedback">해당하는 피드백이 없습니다.</p>';
  document.querySelectorAll('.moderate button').forEach(button => button.onclick = async () => { button.disabled = true; try { await updateDoc(doc(db, button.dataset.col, button.dataset.id), { status: button.dataset.status }); } catch (error) { alert('상태를 변경하지 못했습니다.'); button.disabled = false; } });
}
function exportCsv() {
  const rows = [['구분', '작품', '유형', '상태', '표시 이름', '내용', '등록 시각'], ...[...feedbackItems, ...siteItems].map(item => [item.collection === 'feedback' ? '작품 피드백' : '전체 방명록', projectLabel(item.projectId), item.type || '', item.status || '', item.authorName || '익명 방문자', item.content || '', dateLabel(item.createdAt)])];
  const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `bss-astronomy-feedback-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
}
async function login() { await signInWithPopup(auth, new GoogleAuthProvider()); }
$('#authBtn').onclick = () => isTeacher() ? signOut(auth) : login();
$('#kindFilter').onchange = render; $('#projectFilter').onchange = render; $('#statusFilter').onchange = render; $('#sortFilter').onchange = render; $('#adminSearch').oninput = event => { searchText = event.target.value.trim().toLowerCase(); render(); }; $('#exportCsv').onclick = exportCsv;
onAuthStateChanged(auth, currentUser => {
  if (!currentUser) { signInAnonymously(auth).catch(() => {}); return; }
  user = currentUser; $('#authBtn').textContent = isTeacher() ? `${currentUser.displayName || '교사'} · 로그아웃` : 'Google 로그인'; $('#dashboard').hidden = !isTeacher();
  $('#accessMessage').textContent = isTeacher() ? '새로 들어온 작품 피드백과 전체 방명록을 실시간으로 확인하고 공개·숨김 처리할 수 있습니다.' : '이 페이지는 sjm4104@gmail.com 교사 계정만 사용할 수 있습니다.';
  if (isTeacher()) listen(); else { stops.forEach(stop => stop()); stops = []; }
});
