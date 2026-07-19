(() => {
  const root = document.querySelector('#modalBody');
  let timer;
  let attempts = 0;

  // Normalize the unwrapped Stefan-Boltzmann equation in project 2104.
  // The source text has no math delimiters around this equation.
  function normalizeLooseEquations() {
    if (!root) return;
    const original = root.innerHTML;
    const fixes = [
      [/L=4\\pi R\^\{2\}\\sigma T\^\{4\}/g, '$$L = 4\\pi R^{2}\\sigma T^{4}$$'],
      [/L=4\(pi\)R\^2\(sigma\)T\^4/g, '$$L = 4\\pi R^2 \\sigma T^4$$'],
      [/L=4pi r\^2\*sigmaT\^4/g, '$$L = 4\\pi r^2 \\sigma T^4$$'],
      [/L=4\*pi\*R\^2 \*\(Stefan-Boltzmann constant\)\*T\^4/g, '$$L=4\\pi R^2\\sigma T^4$$'],
      [/L\/L_sun = \(M\/M_sun\)\^4/g, '$$\\frac{L}{L_\\odot}=\\left(\\frac{M}{M_\\odot}\\right)^4$$'],
      [/L\/L_sun = \(R\/R_sun\)\^2 \* \(T\/T_sun\)\^4/g,
        '$$\\frac{L}{L_\\odot}=\\left(\\frac{R}{R_\\odot}\\right)^2\\left(\\frac{T}{T_\\odot}\\right)^4$$'],
      [/d_AU = d_sun \* sqrt\(L\/L_sun\)/g, '$$d_{\\mathrm{AU}}=d_\\odot\\sqrt{\\frac{L}{L_\\odot}}$$'],
      [/d = 2\.44 \u00d7 Rp \u00d7 \(\u03c1p \/ \u03c1m\)\^\(1\/3\)/g,
        '$$d=2.44R_p\\left(\\frac{\\rho_p}{\\rho_m}\\right)^{1/3}$$'],
      [/L = 4\u03c0R\u00b2\u03c3T\u2074/g, '$$L = 4\\pi R^2 \\sigma T^4$$'],
      [/P = \u03c3\u22c5A\u22c5T4/g, '$$P = \\sigma A T^4$$'],
      [/v=Hr/g, '$$v = Hr$$'],
      [/R_H=c\/H/g, '$$R_H = \\frac{c}{H}$$'],
      [/H\(t\) = H_0 \\sqrt\{\\frac\{\\Omega_m\}\{a\(t\)\^3\} \+ \\Omega_\\Lambda\}/g,
        '$$H(t) = H_0 \\sqrt{\\frac{\\Omega_m}{a(t)^3} + \\Omega_\\Lambda}$$'],
      [/1\/S=1\/P\(\ub0b4\)-1\/P\(\uc678\)/g, '$$\\frac{1}{S}=\\left|\\frac{1}{P_{\\mathrm{in}}}-\\frac{1}{P_{\\mathrm{out}}}\\right|$$'],
      [/F=GMm\/r\^2/g, '$$F = \\frac{GMm}{r^2}$$'],
      [/I\(mu\) = I\(0\)\{1 - u\(1-mu\) - v\(1-mu\)\^2\}, mu = sqrt\(1-\(r_s\/R\)\^2\)/g,
        '$$I(\\mu)=I(0)\\left[1-u(1-\\mu)-v(1-\\mu)^2\\right],\\quad \\mu=\\sqrt{1-\\left(\\frac{r_s}{R}\\right)^2}$$'],
      [/L=4pir\^2\*sigmaT\^4/g, '$$L=4\\pi r^2\\sigma T^4$$'],
      [/lambdamax\*T=b/g, '$$\\lambda_{\\max}T=b$$'],
      [/L=4\u314e\(R\^2\)\(T\^4\)/g, '$$L = 4\\pi R^2 \\sigma T^4$$'],
      [/lambda\(Max\) = a\/T/g, '$$\\lambda_{\\max} = \\frac{a}{T}$$'],
      [/T = T\(0\) x M\^a/g, '$$T = T_0 M^a$$'],
      [/T = k\(M\/L\)/g, '$$T = k\\frac{M}{L}$$'],
      [/\(L\/L\(0\)\)=k\(M\/M\(0\)\)\^a/g, '$$\\frac{L}{L_0}=k\\left(\\frac{M}{M_0}\\right)^a$$'],
      [/r\(\u03b8\) = a\(1-e\^2\)\/\(1\+ecos\u03b8\)/g, '$$r(\\theta)=\\frac{a(1-e^2)}{1+e\\cos\\theta}$$'],
      [/v=sqrt\(GM\(\(2\/r\)-\(1\/a\)\)\)/g, '$$v=\\sqrt{GM\\left(\\frac{2}{r}-\\frac{1}{a}\\right)}$$'],
      [/T\^2\/a\^3 = const/g, '$$\\frac{T^2}{a^3}=\\mathrm{const}$$'],
      [/v=2\u03c0r\/P/g, '$$v=\\frac{2\\pi r}{P}$$'],
      [/4\u03c0\^2rm\/P=GMm\/\(R\+r\)\^2/g, '$$\\frac{4\\pi^2rm}{P^2}=\\frac{GMm}{(R+r)^2}$$'],
      [/L=M\^3\.5/g, '$$L \\propto M^{3.5}$$'],
      [/t=M\/L=M\^-2\.5/g, '$$t \\propto \\frac{M}{L} \\propto M^{-2.5}$$'],
      [/1\/s=l 1\/E-1\/P l/g, '$$\\frac{1}{S}=\\left|\\frac{1}{P_{\\oplus}}-\\frac{1}{P}\\right|$$'],
      [/L=4\\pi R\^2 \\sigma T\^4/g, '$$L = 4\\pi R^2 \\sigma T^4$$'],
      [/\\lambda_\{\\text\{max\}\} = \\frac\{2\.898 \\times 10\^6\}\{T\}/g,
        '$$\\lambda_{\\max} = \\frac{2.898 \\times 10^6}{T}$$'],
      [/M = 4\.83 - 2\.5 \\log_\{10\}\(L \/ L_\{\\odot\}\)/g,
        '$$M = 4.83 - 2.5 \\log_{10}\\left(\\frac{L}{L_\\odot}\\right)$$'],
      [/GMm\/\(r\^2\)/g, '$$F = \\frac{GMm}{r^2}$$'],
      [/\$\$F = mv\^2\/r = mrw\^2\$\$/g, '$$F = \\frac{mv^2}{r} = mr\\omega^2$$'],
      [/\$\$\(m1\+m2\) Xcm = m1x1 \+ m2x2\$\$/g,
        '$$(m_1+m_2)X_{\\mathrm{cm}}=m_1x_1+m_2x_2$$'],
      [/\$\$\(L\/L\(\ud0dc\uc591\)\) = \(M \/ M\(\ud0dc\uc591\)\)\^a\$\$/g,
        '$$\\frac{L}{L_\\odot}=\\left(\\frac{M}{M_\\odot}\\right)^a$$'],
      [/\$\$T = T\(\ud0dc\uc591\)\u00b7sqrt\(M \/ M\(\ud0dc\uc591\)\)\$\$/g,
        '$$T=T_\\odot\\sqrt{\\frac{M}{M_\\odot}}$$'],
      [/\$\$r = a\(1 - e\u00b2\) \/ \(1 \+ e\u00b7cos \u03b8\)\$\$/g,
        '$$r=\\frac{a(1-e^2)}{1+e\\cos\\theta}$$'],
      [/\$\$E = K \+ U = \(1\/2\)mv\u00b2 - GMm\/r = -GMm \/ \(2a\)\$\$/g,
        '$$E=K+U=\\frac{1}{2}mv^2-\\frac{GMm}{r}=-\\frac{GMm}{2a}$$'],
      [/\$\$v\u00b2 = GM \u00b7 \(2\/r - 1\/a\)\$\$/g,
        '$$v^2=GM\\left(\\frac{2}{r}-\\frac{1}{a}\\right)$$'],
      [/x = a\(cos E - e\)  y = bsinE/g, '$$x=a(\\cos E-e),\\quad y=b\\sin E$$'],
      [/2c = 2ae/g, '$$2c=2ae$$'],
      [/F2 = \(-2ae, 0\)/g, '$$F_2=(-2ae,0)$$'],
      [/A = \u03c0ab x delt\/T/g, '$$A=\\frac{\\pi ab\\,\\Delta t}{T}$$'],
      [/T\^2 = a\^3/g, '$$T^2=a^3$$'],
      [/\$\$v_obs = v_sys - v_rot \u00d7 sin\(i\) \u00d7 cos\(\u03b8\)\$\$/g,
        '$$v_{\\mathrm{obs}}=v_{\\mathrm{sys}}-v_{\\mathrm{rot}}\\sin(i)\\cos(\\theta)$$'],
      [/\$\$\u0394\u03bb = \u03bb0 \u00d7 \(v_obs \/ c\) \(c = 300,000 km\/s\)\$\$/g,
        '$$\\Delta\\lambda=\\lambda_0\\left(\\frac{v_{\\mathrm{obs}}}{c}\\right),\\quad c=300{,}000\\,\\mathrm{km\\,s^{-1}}$$'],
      [/V = \ub8e8\ud2b8\(GM\/r\)/g, '$$V=\\sqrt{\\frac{GM}{r}}$$'],
      [/V = \u221a\(GM\/r\)/g, '$$V=\\sqrt{\\frac{GM}{r}}$$']
    ];
    const normalized = fixes
      .reduce((html, [pattern, replacement]) => html.replace(pattern, replacement), original)
      .replace(/\$\$([^$]+)\$\$/g, (_, expression) =>
        `$$${expression.replace(/([A-Za-z])_([A-Za-z]{2,})\b/g, '$1_{$2}')}$$`
      );
    if (normalized !== original) root.innerHTML = normalized;
  }

  function render() {
    if (!root) return;
    if (!window.renderMathInElement) {
      if (attempts++ < 20) timer = setTimeout(render, 100);
      return;
    }
    attempts = 0;
    appendProjectReflection();
    normalizeLooseEquations();
    window.renderMathInElement(root, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false,
      strict: 'ignore'
    });
    requestAnimationFrame(fitDisplayMath);
  }

  // KaTeX deliberately keeps equations on one line. Scale only exceptionally
  // long display equations down to their column width rather than showing a
  // horizontal scrollbar.
  function fitDisplayMath() {
    root.querySelectorAll('.katex-display').forEach(display => {
      const formula = display.querySelector('.katex');
      if (!formula) return;
      let size = 1.42;
      formula.style.fontSize = `${size}em`;
      while (formula.getBoundingClientRect().width > display.clientWidth && size > 0.88) {
        size -= 0.06;
        formula.style.fontSize = `${size}em`;
      }
    });
  }

  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(render, 0);
  }).observe(root, { childList: true, subtree: true });

  const controlTerms = [
    ['질량', '질량'], ['반지름', '반지름'], ['온도', '온도'], ['거리', '거리'],
    ['이심률', '이심률'], ['각도', '각도'], ['속도', '속도'], ['시간', '시간'],
    ['밝기', '밝기'], ['광도', '광도'], ['파장', '파장'], ['밀도', '밀도']
  ];

  function controlBadges(project) {
    const text = `${project.how || ''} ${project.purpose || ''}`;
    const labels = controlTerms.filter(([term]) => text.includes(term)).map(([, label]) => label);
    return [...new Set(labels)].slice(0, 3);
  }

  function decorateProjectCards() {
    const holder = document.querySelector('#cards');
    if (!holder || !window.PROJECTS) return;
    holder.querySelectorAll('.card').forEach(card => {
      if (card.querySelector('.control-badges')) return;
      const project = window.PROJECTS.find(item => item.id === card.dataset.id);
      if (!project) return;
      const labels = controlBadges(project);
      const badge = document.createElement('div');
      badge.className = 'control-badges';
      badge.innerHTML = `<span>조작</span>${(labels.length ? labels : ['변인 탐색']).map(label => `<b>${label}</b>`).join('')}`;
      card.querySelector('.tag')?.after(badge);
    });
  }

  function appendProjectReflection() {
    const grid = root?.querySelector('.modal-grid');
    const community = root?.querySelector('.community');
    const identity = root?.querySelector('.modal-top p')?.textContent || '';
    const studentId = (identity.match(/\d{4}/g) || []).at(-1);
    const project = window.PROJECTS?.find(item => item.studentId === studentId);
    if (!grid || !project?.reflection || grid.querySelector('.student-reflection')) return;
    const section = document.createElement('section');
    section.className = 'student-reflection';
    section.innerHTML = '<h4>학생 소감</h4><p></p>';
    section.querySelector('p').textContent = project.reflection;
    if (community) community.before(section);
    else grid.after(section);
  }

  function buildTopGuide() {
    const hero = document.querySelector('.hero');
    const actions = hero?.querySelector('.hero-actions');
    if (!hero || !actions || hero.querySelector('.top-explore-guide')) return;
    const guide = document.createElement('aside');
    guide.className = 'top-explore-guide';
    guide.innerHTML = '<span>HOW TO EXPLORE</span><b>조작하고 · 관찰하고 · 설명해 보세요</b><p>변인을 바꾸고 결과의 변화, 과학 원리, 모델의 한계를 차례로 탐색합니다.</p>';
    actions.after(guide);
  }

  function buildHeroContext() {
    const intro = document.querySelector('.hero .intro');
    if (!intro || document.querySelector('.hero-context')) return;
    const note = document.createElement('p');
    note.className = 'hero-context';
    note.textContent = '학생들이 직접 만든 작품이므로 과학적으로 완벽하지 않을 수 있습니다. 하지만 천문학 현상을 탐구하고 이해하는 데 작은 출발점이 되기를 바랍니다. 사용해 보신 뒤 좋았던 점이나 궁금한 점은 좋아요, 질문, 피드백으로 남겨 주세요.';
    intro.after(note);
  }

  function buildLearningSection() {
    const about = document.querySelector('.about');
    if (!about || about.dataset.enhanced) return;
    about.dataset.enhanced = 'true';
    about.innerHTML = `
      <div class="learning-intro">
        <p class="eyebrow">LEARNING THROUGH MAKING</p>
        <h2>코드는 관측의<br>또 다른 도구입니다.</h2>
        <p class="learning-lead">학생들은 우주 현상을 선택하고, 변인을 직접 조작할 수 있는 시뮬레이션을 설계했습니다. 이 아카이브는 완성된 화면만이 아니라 질문에서 출발한 탐구의 기록입니다.</p>
        <blockquote>“값을 바꾸고, 변화를 관찰하고, 모델의 한계를 설명한다.”</blockquote>
      </div>
      <div class="learning-content">
        <section class="learning-panel teacher-note">
          <p class="eyebrow">TEACHER'S NOTE</p>
          <h3>수업 설계의 핵심</h3>
          <p>이 수업은 ‘조작 → 변화 관찰’이 일어나는 천문학 실험실을 만드는 활동입니다. 학생들은 과학적 원리와 물리량을 코드로 연결하고, 극단값 점검과 한계 분석을 통해 자신의 모델을 검증했습니다.</p>
          <div class="assessment-grid"><span>지구과학 이론</span><span>시뮬레이션 구현</span><span>탐구 과정 기록</span><span>산출물 소개와 한계</span></div>
        </section>
        <section class="reflection-note">
          <p class="eyebrow">STUDENT VOICES</p>
          <h3>학생의 한마디</h3>
          <div id="studentVoices"></div>
        </section>
      </div>`;
    const voiceIds = ['2102', '2103', '2104'];
    const voices = about.querySelector('#studentVoices');
    voiceIds.map(id => window.PROJECTS?.find(item => item.studentId === id)?.reflection).filter(Boolean).forEach(text => {
      const item = document.createElement('blockquote');
      item.textContent = `“${text.split(/(?<=[.!?])\s/)[0]}”`;
      voices.append(item);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('link[href^="popup-readability.css"]')) {
      const popupStyles = document.createElement('link');
      popupStyles.rel = 'stylesheet';
      popupStyles.href = 'popup-readability.css?v=20260720-3';
      document.head.append(popupStyles);
    }
    import('./anonymous-feedback.js?v=20260720-2');
    buildLearningSection();
    buildTopGuide();
    buildHeroContext();
    const cards = document.querySelector('#cards');
    if (cards) new MutationObserver(decorateProjectCards).observe(cards, { childList: true });
    decorateProjectCards();
  });
})();
