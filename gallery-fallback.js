/* Keeps the public archive browsable even if Firebase is temporarily unavailable. */
(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function openFallbackProject(project) {
    const modal = document.querySelector('#modal');
    const body = document.querySelector('#modalBody');
    if (!modal || !body) return;
    body.innerHTML = `<div class="modal-top"><span class="tag" style="--accent:${esc(project.accent)}">${esc(project.topic)}</span><h2>${esc(project.title)}</h2><p>2026학년도 2학년 고급지구과학 · 학번 ${esc(project.studentId)}</p>${project.file ? `<a class="launch" href="${esc(project.file)}" target="_blank" rel="noopener">시뮬레이션 실행 ↗</a>` : ''}</div><div class="modal-grid"><section><h4>개발 동기 및 목적</h4><p>${project.purpose || ''}</p></section><section><h4>과학적 원리 및 수식</h4><p>${project.principle || ''}</p></section><section><h4>시뮬레이션 사용 방법</h4><p>${project.how || ''}</p></section><section><h4>과학적 한계점</h4><p>${project.limit || ''}</p></section></div><section class="community fallback-community"><h3>작품 피드백</h3><p>피드백 기능을 불러오는 중입니다. 잠시 후 페이지를 새로고침해 주세요.</p></section>`;
    modal.showModal();
    window.renderMathInElement?.(body, {delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});
  }

  function renderFallback() {
    if (window.__archiveAppReady) return;
    const cards = document.querySelector('#cards');
    const count = document.querySelector('#count');
    const data = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
    if (!cards || cards.children.length || !data.length) return;
    cards.innerHTML = data.map(project => `<article class="card" style="--accent:${esc(project.accent)}" data-id="${esc(project.id)}"><span class="project-num">STUDENT ${esc(project.studentId)}</span><span class="tag">${esc(project.topic)}</span><h3>${esc(project.title)}</h3><span class="student">학번 ${esc(project.studentId)}</span><span class="open">VIEW PROJECT →</span></article>`).join('');
    if (count) count.textContent = `${data.length}개 프로젝트`;
    cards.addEventListener('click', event => {
      if (window.__archiveAppReady) return;
      const card = event.target.closest('.card');
      if (!card) return;
      const project = data.find(item => item.id === card.dataset.id);
      if (project) openFallbackProject(project);
    });
  }

  function bindEssentialControls() {
    const modal = document.querySelector('#modal');
    const close = () => modal?.close();
    document.querySelector('#closeBtn')?.addEventListener('click', close);
    modal?.addEventListener('click', event => { if (event.target === modal) close(); });
    document.querySelector('#randomBtn')?.addEventListener('click', () => {
      if (window.__archiveAppReady) return;
      const data = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
      if (data.length) openFallbackProject(data[Math.floor(Math.random() * data.length)]);
    });
  }

  document.addEventListener('DOMContentLoaded', () => { bindEssentialControls(); window.setTimeout(renderFallback, 900); });
})();
