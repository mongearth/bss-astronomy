const projects = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let activeProject = null;
let lastFocusedElement = null;
let selectedTopic = '전체';
let searchText = '';
let firebase = null;
let unsubscribeLikes = null;
let unsubscribeFeedback = null;
let unsubscribeProjectStats = null;
let unsubscribePublishedFeedback = null;
let unsubscribeSiteFeedback = null;
const projectStats = new Map();
const projectLikes = new Map();
const projectComments = new Map();
const SITE_VISIT_INTERVAL_MS = 15 * 60 * 1000;
const PROJECT_VIEW_INTERVAL_MS = 10 * 60 * 1000;
const FEEDBACK_COOLDOWN_MS = 30 * 1000;

function feedbackCooldown(scope) {
  const key = `bss-astronomy-feedback-${scope}-at`;
  const remaining = FEEDBACK_COOLDOWN_MS - (Date.now() - Number(localStorage.getItem(key) || 0));
  if (remaining > 0) return Math.ceil(remaining / 1000);
  localStorage.setItem(key, String(Date.now()));
  return 0;
}

function seoulDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = type => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function showVisitStats(data = {}) {
  const today = $('#visitDaily');
  const total = $('#visitTotal');
  if (today) today.textContent = Number(data.dailyViews || 0).toLocaleString('ko-KR');
  if (total) total.textContent = Number(data.totalViews || 0).toLocaleString('ko-KR');
}

async function trackVisit() {
  if (!firebase?.user) return;
  const key = seoulDateKey();
  const storageKey = 'bss-astronomy-site-visit-at';
  const reference = firebase.doc(firebase.db, 'siteStats', 'overview');
  const visitorReference = firebase.doc(firebase.db, 'siteVisitors', firebase.user.uid);
  try {
    const lastVisitAt = Number(localStorage.getItem(storageKey) || 0);
    if (Date.now() - lastVisitAt >= SITE_VISIT_INTERVAL_MS) {
      const result = await firebase.runTransaction(firebase.db, async transaction => {
        const visitorSnapshot = await transaction.get(visitorReference);
        const previousVisitorAt = visitorSnapshot.exists() ? visitorSnapshot.data().lastRecorded?.toMillis?.() || 0 : 0;
        if (Date.now() - previousVisitorAt < SITE_VISIT_INTERVAL_MS) return null;
        const snapshot = await transaction.get(reference);
        const previous = snapshot.exists() ? snapshot.data() : {};
        const sameDay = previous.dateKey === key;
        const next = {
          totalViews: Number(previous.totalViews || 0) + 1,
          dailyViews: sameDay ? Number(previous.dailyViews || 0) + 1 : 1,
          dateKey: key,
          updatedAt: firebase.serverTimestamp()
        };
        transaction.set(reference, next);
        transaction.set(visitorReference, { lastRecorded: firebase.serverTimestamp() });
        return next;
      });
      if (result) {
        localStorage.setItem(storageKey, String(Date.now()));
        showVisitStats(result);
      }
    } else {
      const snapshot = await firebase.getDoc(reference);
      if (snapshot.exists()) showVisitStats(snapshot.data());
    }
  } catch (error) { /* Statistics must never prevent the archive from opening. */ }
}

function visibleProjects() {
  const sort = $('#sort')?.value || 'num';
  return projects.filter(project => (selectedTopic === '전체' || project.topic === selectedTopic) && `${project.title} ${project.studentId} ${project.topic} ${project.purpose || ''} ${project.how || ''}`.toLowerCase().includes(searchText.toLowerCase())).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'ko') : sort === 'topic' ? a.topic.localeCompare(b.topic, 'ko') : a.id.localeCompare(b.id));
}

function cardMarkup(project) {
  const views = Number(projectStats.get(project.id)?.views || 0).toLocaleString('ko-KR');
  const likes = projectLikes.has(project.id) ? Number(projectLikes.get(project.id) || 0).toLocaleString('ko-KR') : '—';
  const comments = Number(projectComments.get(project.id) || 0).toLocaleString('ko-KR');
  return `<article class="card" tabindex="0" role="button" aria-label="${escapeHtml(project.title)} 작품 자세히 보기" style="--accent:${escapeHtml(project.accent)}" data-id="${escapeHtml(project.id)}"><span class="project-num">STUDENT ${escapeHtml(project.studentId)}</span><span class="tag">${escapeHtml(project.topic)}</span><h3>${escapeHtml(project.title)}</h3><span class="student">학번 ${escapeHtml(project.studentId)}</span><span class="card-stats" aria-label="작품 반응"><span>◉ ${views} 조회</span><span>♥ ${likes} 좋아요</span><span>▣ ${comments} 댓글</span></span><span class="open">VIEW PROJECT →</span></article>`;
}

function renderCards() {
  const cards = $('#cards');
  const shown = visibleProjects();
  if (!cards) return;
  cards.innerHTML = shown.map(cardMarkup).join('');
  $('#count').textContent = `${shown.length}개 프로젝트`;
  cards.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => openProject(card.dataset.id));
    card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openProject(card.dataset.id); } });
  });
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
  return `<section class="community"><div class="community-head"><div><h3>작품 피드백</h3><p>좋아요와 응원, 질문, 개선 의견은 작품을 더 깊게 탐구하는 출발점이 됩니다.</p></div><button id="likeBtn" class="like" type="button">♡ 좋아요 0</button></div><p class="login-note">표시 이름은 선택 사항입니다. 글은 교사 검토 후 공개됩니다.</p><form id="projectForm"><select name="type"><option value="guestbook">응원 · 댓글</option><option value="guestbook">개선 피드백</option><option value="question">질문</option></select><input name="authorName" maxlength="20" placeholder="표시 이름 (선택)"><textarea name="content" maxlength="1000" placeholder="작품에 관한 응원, 질문 또는 피드백을 남겨 주세요." required></textarea><button type="submit">검토 요청 보내기</button></form><div id="feedbackList"><p class="empty-feedback">피드백을 불러오는 중입니다.</p></div></section>`;
}

function openGuestbook() {
  const dialog = $('#guestbookDialog');
  const body = $('#guestbookBody');
  if (!dialog || !body) return;
  body.innerHTML = `<section class="guestbook-wrap"><p class="eyebrow">OPEN ARCHIVE</p><h2>전체 방명록</h2><p class="lead">웹사이트와 학생 작품에 대한 감상, 질문, 개선 의견을 남겨 주세요.</p><form id="siteForm"><select name="type"><option value="impression">응원 · 댓글</option><option value="suggestion">개선 피드백</option><option value="question">질문</option></select><input name="authorName" maxlength="20" placeholder="표시 이름 (선택)"><textarea name="content" maxlength="1000" placeholder="사이트 전체에 대한 의견을 남겨 주세요." required></textarea><button type="submit">검토 요청 보내기</button></form><div id="siteFeedbackList"><p class="empty-feedback">공개된 방명록을 불러오는 중입니다.</p></div></section>`;
  dialog.showModal();
  document.querySelector('#siteForm')?.addEventListener('submit', submitSiteFeedback);
  subscribeSiteFeedback();
}

async function submitSiteFeedback(event) {
  event.preventDefault();
  const values = new FormData(event.currentTarget);
  const content = String(values.get('content') || '').trim();
  if (!content) return;
  if (!firebase?.user) { alert('방명록 서비스를 연결하는 중입니다. 잠시 후 다시 시도해 주세요.'); return; }
  const remaining = feedbackCooldown('site');
  if (remaining) { alert(`잠시만 기다려 주세요. ${remaining}초 후 다시 등록할 수 있습니다.`); return; }
  try {
    await firebase.addDoc(firebase.collection(firebase.db, 'siteFeedback'), { type: values.get('type'), content, authorName: String(values.get('authorName') || '').trim() || '익명 방문자', authorUid: firebase.user.uid, status: 'pending', createdAt: firebase.serverTimestamp() });
    event.currentTarget.reset();
    alert('글을 받았습니다. 교사 검토 후 공개됩니다.');
  } catch (error) { alert('방명록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
}

function openProject(id) {
  const project = projects.find(item => item.id === id);
  if (!project) return;
  activeProject = project;
  lastFocusedElement = document.activeElement;
  const modal = $('#modal');
  const body = $('#modalBody');
  body.innerHTML = `<div class="modal-top"><span class="tag" style="--accent:${escapeHtml(project.accent)}">${escapeHtml(project.topic)}</span><h2>${escapeHtml(project.title)}</h2><p>2026학년도 2학년 고급지구과학 · 학번 ${escapeHtml(project.studentId)}</p>${project.file ? `<a class="launch" href="${escapeHtml(project.file)}" target="_blank" rel="noopener noreferrer">시뮬레이션 실행 ↗</a>` : ''}</div><div class="modal-grid"><section><h4>개발 동기 및 목적</h4><p>${project.purpose || ''}</p></section><section><h4>과학적 원리 및 수식</h4><p>${project.principle || ''}</p></section><section><h4>시뮬레이션 사용 방법</h4><p>${project.how || ''}</p></section><section><h4>과학적 한계점</h4><p>${project.limit || ''}</p></section></div>${feedbackMarkup()}`;
  modal.showModal();
  $('#closeBtn')?.focus();
  trackProjectView(project.id);
  window.renderMathInElement?.(body, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
  $('#projectForm').addEventListener('submit', submitFeedback);
  $('#likeBtn').addEventListener('click', toggleLike);
  subscribeCommunity();
}

async function trackProjectView(projectId) {
  if (!firebase?.user) return;
  const storageKey = `bss-astronomy-project-${projectId}-view-at`;
  if (Date.now() - Number(localStorage.getItem(storageKey) || 0) < PROJECT_VIEW_INTERVAL_MS) return;
  const statsReference = firebase.doc(firebase.db, 'projectStats', projectId);
  const visitorReference = firebase.doc(firebase.db, 'projectStats', projectId, 'visitors', firebase.user.uid);
  try {
    const result = await firebase.runTransaction(firebase.db, async transaction => {
      const visitorSnapshot = await transaction.get(visitorReference);
      const previousVisitorAt = visitorSnapshot.exists() ? visitorSnapshot.data().lastRecorded?.toMillis?.() || 0 : 0;
      if (Date.now() - previousVisitorAt < PROJECT_VIEW_INTERVAL_MS) return null;
      const statsSnapshot = await transaction.get(statsReference);
      const previous = statsSnapshot.exists() ? statsSnapshot.data() : {};
      const next = { views: Number(previous.views || 0) + 1, updatedAt: firebase.serverTimestamp() };
      transaction.set(statsReference, next);
      transaction.set(visitorReference, { lastRecorded: firebase.serverTimestamp() });
      return next;
    });
    if (result) {
      localStorage.setItem(storageKey, String(Date.now()));
      projectStats.set(projectId, result);
      renderCards();
    }
  } catch (error) { /* View statistics must never affect opening a work. */ }
}

function closeModal() {
  unsubscribeLikes?.();
  unsubscribeFeedback?.();
  $('#modal')?.close();
  if (lastFocusedElement && document.contains(lastFocusedElement)) lastFocusedElement.focus();
}

async function submitFeedback(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = new FormData(form);
  const content = String(fields.get('content') || '').trim();
  if (!content) return;
  if (!firebase?.user) { alert('피드백 서비스를 연결하는 중입니다. 잠시 후 다시 시도해 주세요.'); return; }
  const remaining = feedbackCooldown(`project-${activeProject.id}`);
  if (remaining) { alert(`잠시만 기다려 주세요. ${remaining}초 후 다시 등록할 수 있습니다.`); return; }
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
    projectLikes.set(activeProject.id, snapshot.size);
    renderCards();
  });
  const feedbackQuery = firebase.query(firebase.collection(firebase.db, 'feedback'), firebase.where('projectId', '==', activeProject.id), firebase.where('status', '==', 'published'));
  unsubscribeFeedback = firebase.onSnapshot(feedbackQuery, snapshot => {
    const list = $('#feedbackList');
    if (!list) return;
    const entries = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    list.innerHTML = entries.length ? entries.map(entry => `<article class="feedback"><span>${escapeHtml(entry.type === 'question' ? '질문' : '응원 · 댓글 · 피드백')}</span><p>${escapeHtml(entry.content)}</p><small>${escapeHtml(entry.authorName || '익명 방문자')}</small></article>`).join('') : '<p class="empty-feedback">아직 공개된 피드백이 없습니다. 첫 번째 응원을 남겨 보세요.</p>';
  }, () => { const list = $('#feedbackList'); if (list) list.innerHTML = '<p class="empty-feedback">피드백을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>'; });
}

function subscribeProjectMetrics() {
  if (!firebase?.user) return;
  unsubscribeProjectStats?.();
  unsubscribeProjectStats = firebase.onSnapshot(firebase.collection(firebase.db, 'projectStats'), snapshot => {
    projectStats.clear();
    snapshot.forEach(item => projectStats.set(item.id, item.data()));
    renderCards();
  });
  unsubscribePublishedFeedback?.();
  unsubscribePublishedFeedback = firebase.onSnapshot(firebase.query(firebase.collection(firebase.db, 'feedback'), firebase.where('status', '==', 'published')), snapshot => {
    projectComments.clear();
    snapshot.forEach(item => { const id = item.data().projectId; if (id) projectComments.set(id, Number(projectComments.get(id) || 0) + 1); });
    renderCards();
  });
  Promise.all(projects.map(async project => {
    try {
      const likesSnapshot = await firebase.getDocs(firebase.collection(firebase.db, 'projects', project.id, 'likes'));
      projectLikes.set(project.id, likesSnapshot.size);
    } catch (error) { projectLikes.set(project.id, 0); }
  })).then(renderCards);
}

function subscribeSiteFeedback() {
  unsubscribeSiteFeedback?.();
  if (!firebase) return;
  unsubscribeSiteFeedback = firebase.onSnapshot(firebase.query(firebase.collection(firebase.db, 'siteFeedback'), firebase.where('status', '==', 'published')), snapshot => {
    const list = $('#siteFeedbackList');
    if (!list) return;
    const entries = snapshot.docs.map(item => item.data()).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    list.innerHTML = entries.length ? entries.map(entry => `<article class="feedback"><span>${escapeHtml(entry.type === 'question' ? '질문' : entry.type === 'suggestion' ? '개선 피드백' : '응원 · 댓글')}</span><p>${escapeHtml(entry.content)}</p><small>${escapeHtml(entry.authorName || '익명 방문자')}</small></article>`).join('') : '<p class="empty-feedback">아직 공개된 방명록이 없습니다.</p>';
  });
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
      trackVisit();
      subscribeProjectMetrics();
      if (activeProject && $('#modal')?.open) {
        trackProjectView(activeProject.id);
        subscribeCommunity();
      }
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
  $('#search')?.setAttribute('aria-label', '제목, 학번, 조작 변인, 키워드 검색');
  $('#closeBtn')?.setAttribute('aria-label', '작품 창 닫기');
  $('#guestbookCloseBtn')?.setAttribute('aria-label', '전체 방명록 닫기');
  $('#search')?.addEventListener('input', event => { searchText = event.target.value; renderCards(); });
  $('#sort')?.addEventListener('change', renderCards);
  $('#randomBtn')?.addEventListener('click', () => { const pool = visibleProjects(); if (pool.length) openProject(pool[Math.floor(Math.random() * pool.length)].id); });
  $('#closeBtn')?.addEventListener('click', closeModal);
  $('#guestbookCloseBtn')?.addEventListener('click', () => { unsubscribeSiteFeedback?.(); $('#guestbookDialog')?.close(); });
  $('#modal')?.addEventListener('click', event => { if (event.target === $('#modal')) closeModal(); });
  $('#guestbookDialog')?.addEventListener('click', event => { if (event.target === $('#guestbookDialog')) { unsubscribeSiteFeedback?.(); $('#guestbookDialog').close(); } });
  $('#siteGuestbookBtn')?.addEventListener('click', openGuestbook);
  window.addEventListener('keydown', event => {
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'm') window.location.assign('admin.html');
  });
  connectFirebase();
}

boot();
