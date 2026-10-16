document.documentElement.classList.add('js');
const $ = (s) => document.querySelector(s);
const nav = $('#nav');
const onScroll = () => nav.classList.toggle('scrolled', scrollY > 10);
addEventListener('scroll', onScroll, { passive: true }); onScroll();

const burger = $('#burger'), links = $('#links');
burger.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});
links.addEventListener('click', (e) => { if (e.target.closest('a')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); } });

const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200); };
const copyBtn = $('#copy');
copyBtn.addEventListener('click', async () => {
  const text = $('#ca').textContent.trim();
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; }
  catch { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch {} ta.remove(); }
  copyBtn.querySelector('.copy-txt').textContent = ok ? 'Copied' : 'Copy failed';
  copyBtn.classList.toggle('copied', ok);
  toast(ok ? 'Placeholder address copied. Real CA is TBA.' : 'Could not copy');
  setTimeout(() => { copyBtn.querySelector('.copy-txt').textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 1800);
});

// one FAQ open at a time
document.querySelectorAll('.faq details').forEach((d) => d.addEventListener('toggle', () => {
  if (d.open) document.querySelectorAll('.faq details').forEach((o) => { if (o !== d) o.open = false; });
}));

// scroll reveals with stagger
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach((el) => {
  const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
  el.style.transitionDelay = `${Math.min(sibs.indexOf(el), 4) * 80}ms`;
  io.observe(el);
});

// respect reduced motion for the hero video
const v = document.querySelector('.hero-video');
if (matchMedia('(prefers-reduced-motion: reduce)').matches) { v.removeAttribute('autoplay'); v.pause(); }

// watch section video
const clip = document.getElementById('clip'), vsound = document.getElementById('vsound'), vplay = document.getElementById('vplay');
const syncSound = () => {
  const on = !clip.muted && clip.volume > 0;
  vsound.setAttribute('aria-pressed', on);
  vsound.querySelector('.ico').textContent = on ? '🔊' : '🔇';
  vsound.querySelector('.txt').textContent = on ? 'Mute' : 'Unmute';
};
const syncPlay = () => { vplay.hidden = !clip.paused; };
vsound.addEventListener('click', () => {
  clip.muted = !clip.muted;
  if (!clip.muted && clip.volume === 0) clip.volume = 1;
  if (clip.paused) clip.play().catch(() => {});
  syncSound();
});
vplay.addEventListener('click', () => clip.play().catch(() => {}));
clip.addEventListener('volumechange', syncSound);
['play', 'pause', 'playing'].forEach((ev) => clip.addEventListener(ev, syncPlay));
const tryAutoplay = () => clip.play().then(syncPlay).catch(() => { vplay.hidden = false; });
if (matchMedia('(prefers-reduced-motion: reduce)').matches) { clip.pause(); vplay.hidden = false; }
else tryAutoplay();
// pause when off-screen to save CPU, resume when visible (unless user paused)
let userPaused = false;
clip.addEventListener('pause', () => { if (document.visibilityState === 'visible' && clip._vis) userPaused = true; });
clip.addEventListener('play', () => { userPaused = false; });
new IntersectionObserver(([e]) => {
  clip._vis = e.isIntersecting;
  if (e.isIntersecting) { if (!userPaused && !matchMedia('(prefers-reduced-motion: reduce)').matches) clip.play().catch(() => { vplay.hidden = false; }); }
  else if (!clip.paused) { clip._autoPause = true; clip.pause(); userPaused = false; }
}, { threshold: 0.25 }).observe(clip);
syncSound();
