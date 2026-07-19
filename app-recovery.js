const projects = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let activeProject = null;
let selectedTopic = '전체';
let searchText = '';
let firebase = null;
let unsubscribeLikes = null;
let unsubscribeFeedback = null;

function visibleProjects() {
  const sort = $('#sort')?.value || 'num';
  return projects.filter(project => (selectedTopic === '전체' || project.topic === selectedTopic) && `${project.title} ${project.studentId} ${project.topic} ${project.purpose || ''} ${project.how || ''}`.toLowerCase().includes(searchText.toLowerCase())).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'ko') : sort === 'topic' ? a.topic.localeCompare(b.topic, 'ko') : a.id.localeCompare(b.id));
}

function cardMarkup(project) {
  return `<article class="card" style="--accent:${escapeHtml(project.accent)}" data-id="${escapeHtml(project.id)}"><span class="project-num">STUDENT ${escapeHtml(project.studentId)}</span><span class="tag">${escapeHtml(project.topic)}</span><h3>${escapeHtml(project.title)}</h3><span class="student">학번 ${escapeHtml(project.studentId)}</span><span class="open">VIEW PROJECT →</span></article>`;
}

function renderCards() {
  const cards = $('#cards');
  const shown = visibleProjects();
  if (!cards) return;
  cards.innerHTML = shown.map(cardMarkup).join('');
  $('#count').textContent = `${shown.length}개 프로젝트`;
  cards.querySelectorAll('.card').forEach(card => card.addEventListener('click', () => openProject(card.dataset.id)));
}

function buildFilters() {
  const filters = $('#topicFilters');
  if (!filters) return;
  const topics = ['전체', ...new Set(projects.map(project => project.topic))];
  filters.innerHTML = topics.map(topic => `<button class="${topic === selectedTopic ? 'active' : ''}" data-topic="${escapeHtml(topic)}">${escapeHtml(topic)}</button>`).join('');
  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-topic]');
    if (!button) return;
    selectedTopic = button.dataset.topic;
    buildFilters();
    renderCards();
  });
}

function feedbackMarkup() {
  return `<section class="community"><div class="community-head"><div><h3>작품 피드백</h3><p>좋아요와 응원, 질문, 개선 의견은 작품을 더 깊게 탐구하는 출발점이 됩니다.</p></div><button id="likeBtn" class="like" type="button">♡ 좋아요 0</button></div><p class="login-note">표시 이름은 선택 사항입니다. 글은 교사 검토 후 공개됩니다.</p><form id="projectFeedbackForm"><select name="type"><option value="guestbook">응원 · 댓글 · 피드백</option><option value="question">질문</option></select><input name="authorName" maxlength="20" placeholder="표시 이름 (선택)"><textarea name="content" maxlength="1000" placeholder="작품에 관한 응원, 질문 또는 피드백을 남겨 주세요." required></textarea><button type="submit">검토 요청 보내기</button></form><div id="feedbackList"><p class="empty-feedback">피드백을 불러오는 중입니다.</p></div></section>`;
}

function openProject(id) {
  const project = projects.find(item => item.id === id);
  if (!project) return;
  activeProject = project;
  const modal = $('#modal');
  const body = $('#modalBody');
  body.innerHTML = `<div class="modal-top"><span class="tag" style="--accent:${escapeHtml(project.accent)}">${escapeHtml(project.topic)}</span><h2>${escapeHtml(project.title)}</h2><p>2026학년도 2학년 고급지구과학 · 학번 ${escapeHtml(project.studentId)}</p>${project.file ? `<a class="launch" href="${escapeHtml(project.file)}" target="_blank" rel="noopener noreferrer">시뮬레이션 실행 ↗</a>` : ''}</div><div class="modal-grid"><section><h4>개발 동기 및 목적</h4><p>${project.purpose || ''}</p></section><section><h4>과학적 원리 및 수식</h4><p>${project.principle || ''}</p></section><section><h4>시뮬레이션 사용 방법</h4><p>${project.how || ''}</p></section><section><h4>과학적 한계점</h4><p>${project.limit || ''}</p></section></div>${feedbackMarkup()}`;
  modal.showModal();
  window.renderMathInElement?.(body, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
  $('#projectFeedbackForm').addEventListener('submit', submitFeedback);
  $('#likeBtn').addEventListener('click', toggleLike);
  subscribeCommunity();
}

function closeModal() {
  unsubscribeLikes?.();
  unsubscribeFeedback?.();
  $('#modal')?.close();
}

async function submitFeedback(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = new FormData(form);
  const content = String(fields.get('content') || '').trim();
  if (!content) return;
  if (!firebase?.user) { alert('피드백 서비스를 연결하는 중입니다. 잠시 후 다시 시도해 주세요.'); return; }
  try {
    await firebase.addDoc(firebase.collection(firebase.db, 'feedback'), { projectId: activeProject.id, type: fields.get('type'), content, authorName: String(fields.get('authorName') || '').trim() || '익명 방문자', authorUid: firebase.user.uid, status: 'pending', createdAt: firebase.serverTimestamp() });
    form.reset();
    alert('의견을 받았습니다. 교사 검토 후 공개됩니다.');
  } catch (error) { alert('의견을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
}

async function toggleLike() {
  if (!firebase?.user || !activeProject) { alert('좋아요 서비스를 연결하는 중입니다.'); return; }
  const reference = firebase.doc(firebase.db, 'projects', activeProject.id, 'likes', firebase.user.uid);
  const snapshot = await firebase.getDoc(reference);
  if (snapshot.exists()) await firebase.deleteDoc(reference);
  else await firebase.setDoc(reference, { projectId: activeProject.id, userId: firebase.user.uid, createdAt: firebase.serverTimestamp() });
}

function subscribeCommunity() {
  unsubscribeLikes?.();
  unsubscribeFeedback?.();
  if (!firebase?.user || !activeProject) return;
  unsubscribeLikes = firebase.onSnapshot(firebase.collection(firebase.db, 'projects', activeProject.id, 'likes'), snapshot => {
    const button = $('#likeBtn');
    if (!button) return;
    button.textContent = `♥ 좋아요 ${snapshot.size}`;
    button.classList.toggle('liked', snapshot.docs.some(item => item.id === firebase.user.uid));
  });
  const feedbackQuery = firebase.query(firebase.collection(firebase.db, 'feedback'), firebase.where('projectId', '==', activeProject.id), firebase.where('status', '==', 'published'));
  unsubscribeFeedback = firebase.onSnapshot(feedbackQuery, snapshot => {
    const list = $('#feedbackList');
    if (!list) return;
    const entries = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    list.innerHTML = entries.length ? entries.map(entry => `<article class="feedback"><span>${escapeHtml(entry.type === 'question' ? '질문' : '응원 · 댓글 · 피드백')}</span><p>${escapeHtml(entry.content)}</p><small>${escapeHtml(entry.authorName || '익명 방문자')}</small></article>`).join('') : '<p class="empty-feedback">아직 공개된 피드백이 없습니다. 첫 번째 응원을 남겨 보세요.</p>';
  }, () => { const list = $('#feedbackList'); if (list) list.innerHTML = '<p class="empty-feedback">피드백을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>'; });
}

async function connectFirebase() {
  try {
    const [{ initializeApp }, authModule, firestoreModule] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js')
    ]);
    const app = initializeApp({ apiKey: 'AIzaSyApXaG_rT0-veZzozy3Wtns2IGHZqDOYXc', authDomain: 'bss-astronomy-2026.firebaseapp.com', projectId: 'bss-astronomy-2026', storageBucket: 'bss-astronomy-2026.firebasestorage.app', messagingSenderId: '1054853511225', appId: '1:1054853511225:web:c95e38bac3512d815b75e8' });
    firebase = { ...authModule, ...firestoreModule, db: firestoreModule.getFirestore(app), auth: authModule.getAuth(app), user: null };
    authModule.onAuthStateChanged(firebase.auth, user => {
      if (!user) { authModule.signInAnonymously(firebase.auth).catch(() => {}); return; }
      firebase.user = user;
      if (activeProject && $('#modal')?.open) subscribeCommunity();
    });
  } catch (error) {
    const list = $('#feedbackList');
    if (list) list.innerHTML = '<p class="empty-feedback">피드백 서비스를 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.</p>';
  }
}

function boot() {
  window.__archiveAppReady = true;
  buildFilters();
  renderCards();
  $('#search')?.addEventListener('input', event => { searchText = event.target.value; renderCards(); });
  $('#sort')?.addEventListener('change', renderCards);
  $('#randomBtn')?.addEventListener('click', () => { const pool = visibleProjects(); if (pool.length) openProject(pool[Math.floor(Math.random() * pool.length)].id); });
  $('#closeBtn')?.addEventListener('click', closeModal);
  $('#modal')?.addEventListener('click', event => { if (event.target === $('#modal')) closeModal(); });
  connectFirebase();
}

boot();
