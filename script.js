const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

$('#ano').textContent = new Date().getFullYear();

// Navegação: fundo ao rolar, barra de progresso e menu no celular
const nav = $('#nav');
const progress = $('#progresso');
const onScroll = () => {
	const max = document.documentElement.scrollHeight - innerHeight;
	nav.classList.toggle('scrolled', scrollY > 10);
	progress.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
};
let scrollQueued = false;
addEventListener('scroll', () => {
	if (scrollQueued) return;
	scrollQueued = true;
	requestAnimationFrame(() => { onScroll(); scrollQueued = false; });
}, {passive: true});
onScroll();

const toggle = $('.nav-toggle');
const menu = $('#menu');
const setMenu = (open) => {
	toggle.setAttribute('aria-expanded', open);
	toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
	menu.classList.toggle('open', open);
	nav.classList.toggle('menu-open', open);
};
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
$$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); toggle.focus(); }
});

// Entrada ao rolar e contagem dos números
const countUp = (el) => {
	const target = Number(el.dataset.count);
	if (reduced || target === 0) return;
	const start = performance.now();
	const tick = (now) => {
		const t = Math.min(1, (now - start) / 1600);
		el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
		if (t < 1) requestAnimationFrame(tick);
	};
	el.textContent = '0';
	requestAnimationFrame(tick);
};
const revealer = new IntersectionObserver((entries) => {
	entries.filter((e) => e.isIntersecting).forEach((entry, i) => {
		entry.target.style.transitionDelay = `${i * 70}ms`;
		entry.target.classList.add('visible');
		$$('[data-count]', entry.target).forEach(countUp);
		revealer.unobserve(entry.target);
	});
}, {threshold: 0.15, rootMargin: '0px 0px -40px 0px'});
$$('.reveal').forEach((el) => revealer.observe(el));

// Rede de pontos da abertura
(() => {
	const canvas = $('#rede');
	const hero = $('.hero');
	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	let w = 0, h = 0, nodes = [], pulses = [], running = false, last = 0;
	const LINK = 190;

	const build = () => {
		const dpr = Math.min(devicePixelRatio || 1, 2);
		w = hero.clientWidth; h = hero.clientHeight;
		canvas.width = w * dpr; canvas.height = h * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		const count = Math.max(16, Math.min(46, Math.round((w * h) / 30000)));
		nodes = Array.from({length: count}, (_, i) => ({
			x: Math.random() * w, y: Math.random() * h,
			vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
			r: i % 7 === 0 ? 4.5 : 1.4 + Math.random() * 1.6,
		}));
		pulses = [];
	};

	// Menos contraste atrás do texto central
	const fade = (x, y) => {
		const dx = (x - w / 2) / (w * 0.32), dy = (y - h * 0.32) / (h * 0.3);
		return Math.min(1, 0.3 + Math.sqrt(dx * dx + dy * dy) * 0.7);
	};

	const draw = (dt) => {
		ctx.clearRect(0, 0, w, h);
		for (const n of nodes) {
			n.x += n.vx * dt; n.y += n.vy * dt;
			if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
			if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
		}
		const edges = [];
		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				const a = nodes[i], b = nodes[j];
				const d = Math.hypot(a.x - b.x, a.y - b.y);
				if (d > LINK) continue;
				edges.push([a, b]);
				const alpha = (1 - d / LINK) * 0.26 * fade((a.x + b.x) / 2, (a.y + b.y) / 2);
				ctx.strokeStyle = `rgba(255, 120, 60, ${alpha})`;
				ctx.lineWidth = 1;
				ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
			}
		}
		for (const n of nodes) {
			const f = fade(n.x, n.y);
			if (n.r > 4) {
				ctx.fillStyle = `rgba(255, 90, 31, ${0.16 * f})`;
				ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 2.6, 0, Math.PI * 2); ctx.fill();
			}
			ctx.fillStyle = n.r > 4 ? `rgba(255, 110, 50, ${0.95 * f})` : `rgba(243, 236, 221, ${0.4 * f})`;
			ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
		}
		// Sinais viajando pelas ligações
		if (edges.length && pulses.length < 7 && Math.random() < 0.05 * dt) {
			const [a, b] = edges[Math.floor(Math.random() * edges.length)];
			pulses.push({a, b, t: 0});
		}
		pulses = pulses.filter((p) => (p.t += 0.012 * dt) < 1);
		for (const p of pulses) {
			const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
			const alpha = Math.sin(p.t * Math.PI);
			ctx.fillStyle = `rgba(255, 146, 89, ${alpha})`;
			ctx.shadowColor = 'rgba(255, 90, 31, 0.9)'; ctx.shadowBlur = 10;
			ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
			ctx.shadowBlur = 0;
		}
	};

	const loop = (now) => {
		if (!running) return;
		const dt = Math.min(3, (now - last) / 16.67 || 1);
		last = now;
		draw(dt);
		requestAnimationFrame(loop);
	};
	const start = () => {
		if (running || reduced) return;
		running = true; last = performance.now();
		requestAnimationFrame(loop);
	};

	build();
	draw(0);
	new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); else running = false; }).observe(hero);
	document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else start(); });
	let resizeTimer;
	addEventListener('resize', () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => { build(); draw(0); }, 150);
	});
})();

// Vitrine de sistemas: passo a passo com a tela ao lado
(() => {
	const STEPS = [
		['Antes de qualquer tela, entendemos como o trabalho acontece hoje e onde ele trava.', 'Gargalos encontrados'],
		['Você navega pelo protótipo e aprova cada tela antes de uma linha de código.', 'Protótipo aprovado'],
		['Planilhas e sistemas antigos entram no sistema novo, sem digitar tudo de novo.', 'Dados migrados'],
		['Sua operação inteira em um lugar, com permissões, histórico e relatórios.', 'Sistema no ar'],
	];
	const grid = $('#sistemas .show-grid');
	const tabs = $$('.steps [role="tab"]');
	const views = $$('.view');
	const note = $('#passo-texto');
	const path = $('#conector path');
	const device = $('.device');
	let current = 0, timer = null, visible = false, paused = false;

	const connect = () => {
		if (!path || getComputedStyle($('#conector')).display === 'none') return;
		const g = grid.getBoundingClientRect();
		const dot = $('span', tabs[current]).getBoundingClientRect();
		const dev = device.getBoundingClientRect();
		const x1 = dot.right - g.left + 6, y1 = dot.top + dot.height / 2 - g.top;
		const x2 = dev.left - g.left + 4, y2 = dev.top + dev.height * 0.42 - g.top;
		const dx = Math.max(40, (x2 - x1) * 0.5);
		path.setAttribute('d', `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
	};

	const select = (i, focus = false) => {
		current = i;
		tabs.forEach((tab, k) => {
			tab.setAttribute('aria-selected', k === i);
			tab.tabIndex = k === i ? 0 : -1;
		});
		views.forEach((v) => v.classList.toggle('active', Number(v.dataset.view) === i));
		note.setAttribute('aria-labelledby', tabs[i].id);
		$('#passo-desc').textContent = STEPS[i][0];
		$('#passo-status').textContent = STEPS[i][1];
		note.classList.remove('swap'); void note.offsetWidth; note.classList.add('swap');
		$('#passo-n').textContent = String(i + 1).padStart(2, '0');
		$('#passo-barra').style.width = `${(i + 1) * 25}%`;
		if (focus) tabs[i].focus();
		connect();
	};

	const schedule = () => {
		clearInterval(timer);
		if (reduced || !visible || paused) return;
		timer = setInterval(() => select((current + 1) % tabs.length), 4800);
	};

	tabs.forEach((tab, i) => {
		tab.addEventListener('click', () => { select(i); schedule(); });
		tab.addEventListener('keydown', (e) => {
			const step = {ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1}[e.key];
			if (!step) return;
			e.preventDefault();
			select((i + step + tabs.length) % tabs.length, true);
			schedule();
		});
	});
	grid.addEventListener('pointerenter', () => { paused = true; schedule(); });
	grid.addEventListener('pointerleave', () => { paused = false; schedule(); });
	grid.addEventListener('focusin', () => { paused = true; schedule(); });
	grid.addEventListener('focusout', () => { paused = false; schedule(); });
	new IntersectionObserver(([e]) => {
		visible = e.isIntersecting;
		schedule();
		if (visible) setTimeout(connect, 800);
	}, {threshold: 0.35}).observe(grid);
	device.addEventListener('transitionend', connect);
	addEventListener('resize', connect);
	select(0);
})();

// Conectar ferramentas
(() => {
	const box = $('#conectar');
	const tools = $$('.tools button', box);
	const pick = $('.connect-pick', box);
	const done = $('.connect-done', box);
	const go = $('#conectar-btn');
	const hint = $('#conectar-dica');
	const hub = $('#hub');
	const result = $('#conectar-resultado');
	const NS = 'http://www.w3.org/2000/svg';

	const update = () => {
		const any = tools.some((t) => t.getAttribute('aria-pressed') === 'true');
		hint.hidden = any;
	};
	tools.forEach((t) => t.addEventListener('click', () => {
		t.setAttribute('aria-pressed', t.getAttribute('aria-pressed') !== 'true');
		update();
	}));

	const el = (name, attrs, parent) => {
		const node = document.createElementNS(NS, name);
		for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
		parent.appendChild(node);
		return node;
	};
	const list = (names) => names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1)}` : names[0];

	go.addEventListener('click', () => {
		const names = tools.filter((t) => t.getAttribute('aria-pressed') === 'true').map((t) => t.dataset.tool);
		if (!names.length) { hint.hidden = false; return; }
		hub.replaceChildren();
		const cx = 160, cy = 110;
		const points = names.map((_, i) => {
			const a = -Math.PI / 2 + (i / names.length) * Math.PI * 2 + (names.length === 2 ? Math.PI / 2 : 0);
			return [cx + Math.cos(a) * 118, cy + Math.sin(a) * 78];
		});
		points.forEach(([x, y]) => el('line', {x1: x, y1: y, x2: cx, y2: cy}, hub));
		const core = el('g', {class: 'hub-core'}, hub);
		el('circle', {cx, cy, r: 30}, core);
		el('use', {href: '#simbolo', x: cx - 16, y: cy - 16, width: 32, height: 32}, core);
		names.forEach((name, i) => {
			const [x, y] = points[i];
			const g = el('g', {class: 'hub-node', style: `animation-delay:${i * 90}ms`}, hub);
			const width = Math.max(64, name.length * 6.6 + 22);
			el('rect', {x: x - width / 2, y: y - 14, width, height: 28, rx: 9}, g);
			const text = el('text', {x, y: y + 4, 'text-anchor': 'middle'}, g);
			text.textContent = name;
		});
		result.textContent = names.length > 1
			? `${list(names)} conversando entre si. Sem copiar e colar.`
			: `Seu sistema recebendo os dados de: ${names[0]}. Sem copiar e colar.`;
		pick.hidden = true;
		done.hidden = false;
		$('#conectar-voltar').focus();
	});

	$('#conectar-voltar').addEventListener('click', () => {
		done.hidden = true;
		pick.hidden = false;
		tools[0].focus();
	});
})();

// Simulador de horas devolvidas
(() => {
	const people = $('#sim-pessoas');
	const hours = $('#sim-horas');
	const fmt = (n) => n.toLocaleString('pt-BR', {maximumFractionDigits: 1});
	const fill = (input) => {
		const p = ((input.value - input.min) / (input.max - input.min)) * 100;
		input.style.setProperty('--p', `${p}%`);
	};
	const run = () => {
		const total = Math.round(people.value * hours.value * 4.33);
		const saved = Math.round(total / 2);
		const rest = total - saved;
		$('#sim-pessoas-v').textContent = people.value;
		$('#sim-horas-v').textContent = `${hours.value} h`;
		$('#sim-ganho').textContent = fmt(saved);
		const days = saved / 8;
		$('#sim-dias').textContent = `≈ ${fmt(days < 10 ? Math.round(days * 10) / 10 : Math.round(days))} dias de trabalho`;
		$('#sim-total').textContent = `${fmt(total)} h`;
		$('#sim-total-2').textContent = `${fmt(total)} h`;
		$('#sim-resto').textContent = `${fmt(rest)} h`;
		$('#sim-resto-barra').style.width = `${(rest / total) * 100}%`;
		fill(people); fill(hours);
	};
	people.addEventListener('input', run);
	hours.addEventListener('input', run);
	run();
})();
