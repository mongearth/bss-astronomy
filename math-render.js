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
        '$$\\Delta\\lambda=\\lambda_0\\left(\\frac{v_{\\mathrm{obs}}}{c}\\right),\\quad c=300{,}000\\,\\mathrm{km\\,s^{-1}}$$']
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
    normalizeLooseEquations();
    window.renderMathInElement(root, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false,
      strict: 'ignore'
    });
  }

  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(render, 0);
  }).observe(root, { childList: true, subtree: true });
})();
