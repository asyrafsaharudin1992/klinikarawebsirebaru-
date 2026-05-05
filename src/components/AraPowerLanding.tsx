import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './AraPowerLanding.css';
import SEO from './SEO';

// ── App screenshot paths — replace with your actual Firebase URLs ─────────────
const SCREENS = {
  dashboard:   'https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/screenshot%20aRAPOWER%2FWhatsApp%20Image%202026-05-05%20at%2018.04.55%20(1).jpeg?alt=media&token=9e72e373-5e83-4d52-b609-d2a25fbb0139',
  promotions:  'https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/screenshot%20aRAPOWER%2FWhatsApp%20Image%202026-05-05%20at%2018.04.53.jpeg?alt=media&token=7b45e9f3-ccee-4f3f-bf0f-97a80afbaca3',
  performance: 'https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/screenshot%20aRAPOWER%2FWhatsApp%20Image%202026-05-05%20at%2018.04.54%20(1).jpeg?alt=media&token=61f70191-fd90-4752-b7f5-b134ec44b3bc',
  referrals:   'https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/screenshot%20aRAPOWER%2FWhatsApp%20Image%202026-05-05%20at%2018.04.54.jpeg?alt=media&token=6a6288cf-0024-4dd5-97d0-8959ebdde880',
  welcome:     'https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/screenshot%20aRAPOWER%2FWhatsApp%20Image%202026-05-05%20at%2018.04.55%20(3).jpeg?alt=media&token=1e2a6472-4c64-43fe-80ba-c1736348796c',
};

// ── iPhone Frame Component ────────────────────────────────────────────────────
const IPhoneFrame: React.FC<{
  src: string;
  alt: string;
  tilt?: 'left' | 'right' | 'none';
  shadow?: boolean;
}> = ({ src, alt, tilt = 'none', shadow = true }) => {
  const rotation =
    tilt === 'left'  ? 'rotate(-4deg)' :
    tilt === 'right' ? 'rotate(4deg)'  : 'none';

  return (
    <div style={{
      position: 'relative',
      width: '260px',
      flexShrink: 0,
      transform: rotation,
      transition: 'transform 0.4s ease',
    }}>
      {/* Phone body */}
      <div style={{
        position: 'relative',
        borderRadius: '44px',
        background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #222 100%)',
        padding: '12px',
        boxShadow: shadow
          ? '0 60px 120px rgba(0,0,0,0.25), 0 20px 40px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
          : 'none',
      }}>
        {/* Side buttons */}
        <div style={{ position: 'absolute', left: '-3px', top: '100px', width: '3px', height: '34px', background: '#333', borderRadius: '2px 0 0 2px' }} />
        <div style={{ position: 'absolute', left: '-3px', top: '144px', width: '3px', height: '60px', background: '#333', borderRadius: '2px 0 0 2px' }} />
        <div style={{ position: 'absolute', left: '-3px', top: '214px', width: '3px', height: '60px', background: '#333', borderRadius: '2px 0 0 2px' }} />
        <div style={{ position: 'absolute', right: '-3px', top: '160px', width: '3px', height: '80px', background: '#333', borderRadius: '0 2px 2px 0' }} />

        {/* Screen */}
        <div style={{
          borderRadius: '34px',
          overflow: 'hidden',
          background: '#000',
          aspectRatio: '390/844',
          position: 'relative',
        }}>
          <img
            src={src}
            alt={alt}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const AraPowerLanding: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const revealRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);

    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    revealRefs.current.forEach(el => { if (el) observer.observe(el); });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      revealRefs.current.forEach(el => { if (el) observer.unobserve(el); });
    };
  }, []);

  const r = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  };

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", background: '#fff', color: '#1d1d1f', overflowX: 'hidden' }}>
      <SEO
        title="AraPower — Earn. Share. Heal."
        description="Program affiliate eksklusif Klinik Ara 24 Jam. Kongsi perkhidmatan kesihatan, rujuk pesakit, dan terima komisen terus ke akaun bank anda."
        image="https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/og-image.jpg?alt=media&token=e809aad6-d203-440b-a016-c2a417626e9c"
        url="https://klinikara24jam.hsohealthcare.com/arapower"
      />

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '52px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        background: isScrolled ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0)',
        backdropFilter: isScrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: isScrolled ? '1px solid rgba(0,0,0,0.08)' : '1px solid transparent',
        transition: 'all 0.4s ease',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/">
            <img
              src="https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/lOGO%20ARA%20dark%20blue%20(1).png?alt=media&token=e9c445db-4f1d-4858-9673-e3a9a94b0590"
              alt="Klinik Ara"
              style={{ height: '28px', objectFit: 'contain' }}
            />
          </Link>
        </div>

        {/* Nav links — hidden on mobile */}
        <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }} className="ap-nav-links">
          {['Features', 'Tiers', 'Community'].map(label => (
            <a key={label} href={`#${label.toLowerCase()}`} style={{
              fontSize: '14px', color: '#1d1d1f', textDecoration: 'none', opacity: 0.75,
              transition: 'opacity 0.2s',
            }}>{label}</a>
          ))}
        </div>

        <a href="https://arapower.hsohealthcare.com" style={{
          fontSize: '14px', fontWeight: 500,
          background: '#1580c2', color: '#fff',
          padding: '8px 20px', borderRadius: '980px',
          textDecoration: 'none', transition: 'all 0.2s',
        }}>
          Join Now
        </a>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f5f5f7 0%, #fff 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '100px 24px 60px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Eyebrow */}
        <div ref={r} className="reveal" style={{
          display: 'inline-block',
          fontSize: '14px', fontWeight: 500, letterSpacing: '0.02em',
          color: '#1580c2', marginBottom: '16px',
        }}>
          Klinik Ara 24 Jam · Program Affiliate Eksklusif
        </div>

        {/* Headline */}
        <h1 ref={r} className="reveal" style={{
          fontSize: 'clamp(48px, 8vw, 88px)',
          fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.05,
          color: '#1d1d1f', margin: '0 0 20px', maxWidth: '800px',
        }}>
          Kongsi.<br />
          <span style={{ color: '#1580c2' }}>Bantu.</span><br />
          Jana Pendapatan.
        </h1>

        {/* Sub */}
        <p ref={r} className="reveal" style={{
          fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 300,
          color: '#6e6e73', lineHeight: 1.6, maxWidth: '540px', margin: '0 0 40px',
        }}>
          Setiap kali anda mencadangkan Klinik Ara kepada rakan, anda menerima komisen automatik. Percuma untuk disertai.
        </p>

        {/* CTAs */}
        <div ref={r} className="reveal" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '72px' }}>
          <a href="https://arapower.hsohealthcare.com" style={{
            fontSize: '17px', fontWeight: 500,
            background: '#1580c2', color: '#fff',
            padding: '16px 36px', borderRadius: '980px',
            textDecoration: 'none',
            boxShadow: '0 8px 32px rgba(21,128,194,0.3)',
          }}>
            Daftar Percuma
          </a>
          <a href="#features" style={{
            fontSize: '17px', fontWeight: 500,
            color: '#1580c2', border: '1px solid rgba(21,128,194,0.3)',
            padding: '16px 36px', borderRadius: '980px',
            textDecoration: 'none',
          }}>
            Ketahui lebih lanjut
          </a>
        </div>

        {/* Hero phones */}
        <div ref={r} className="reveal" style={{
          display: 'flex', gap: '24px', alignItems: 'flex-end',
          justifyContent: 'center', flexWrap: 'wrap',
        }}>
          <IPhoneFrame src={SCREENS.welcome}     alt="Welcome screen"   tilt="left" />
          <IPhoneFrame src={SCREENS.dashboard}   alt="Dashboard screen" tilt="none" />
          <IPhoneFrame src={SCREENS.promotions}  alt="Promotions"       tilt="right" />
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ──────────────────────────────────────────── */}
      <section style={{ background: '#f5f5f7', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '64px', flexWrap: 'wrap' }}>
          {[
            { num: 'RM0',       label: 'Kos untuk daftar' },
            { num: '24/7',      label: 'Klinik tersedia' },
            { num: 'Automatik', label: 'Kredit komisen' },
            { num: 'Terus',     label: 'Bank transfer' },
          ].map(({ num, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em' }}>{num}</div>
              <div style={{ fontSize: '13px', color: '#6e6e73', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURE ALTERNATING SECTIONS ───────────────────────────────── */}

      {/* Section 1 — Dashboard */}
      <section id="features" style={{ background: '#fff', padding: 'clamp(80px, 10vw, 130px) 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '80px', flexWrap: 'wrap' }}>
          {/* Phone */}
          <div ref={r} className="reveal" style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
            <IPhoneFrame src={SCREENS.dashboard} alt="Dashboard" tilt="right" />
          </div>
          {/* Text */}
          <div ref={r} className="reveal" style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1580c2', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '14px' }}>
              Dashboard Peribadi
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.08, color: '#1d1d1f', margin: '0 0 20px' }}>
              Pantau semua dalam satu skrin.
            </h2>
            <p style={{ fontSize: '17px', fontWeight: 300, color: '#6e6e73', lineHeight: 1.7, margin: '0 0 28px' }}>
              Dashboard anda menunjukkan tier semasa, jumlah pendapatan, bilangan rujukan berjaya, dan lebih banyak lagi — dikemaskini secara masa nyata.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                '🏆 Tier Bronze, Silver & Gold dengan bonus komisen',
                '💰 Jumlah pendapatan seumur hidup',
                '📊 Kempen aktif dengan kadar penukaran',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: '#1d1d1f', fontWeight: 400 }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — Promotions */}
      <section style={{ background: '#f5f5f7', padding: 'clamp(80px, 10vw, 130px) 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '80px', flexWrap: 'wrap-reverse' }}>
          {/* Text */}
          <div ref={r} className="reveal" style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1580c2', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '14px' }}>
              Kempen & Promosi
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.08, color: '#1d1d1f', margin: '0 0 20px' }}>
              Poster profesional, siap untuk dikongsi.
            </h2>
            <p style={{ fontSize: '17px', fontWeight: 300, color: '#6e6e73', lineHeight: 1.7, margin: '0 0 28px' }}>
              Setiap servis klinik dilengkapi poster pemasaran yang cantik. Muat turun dan kongsikan terus ke WhatsApp, Instagram atau mana-mana platform anda.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                '🖼️ Galeri poster untuk setiap servis',
                '📱 Kongsi terus ke WhatsApp',
                '🔗 Pautan rujukan tersematkan automatik',
              ].map(item => (
                <div key={item} style={{ fontSize: '15px', color: '#1d1d1f', fontWeight: 400 }}>{item}</div>
              ))}
            </div>
          </div>
          {/* Phone */}
          <div ref={r} className="reveal" style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
            <IPhoneFrame src={SCREENS.promotions} alt="Promotions" tilt="left" />
          </div>
        </div>
      </section>

      {/* Section 3 — Performance */}
      <section style={{ background: '#fff', padding: 'clamp(80px, 10vw, 130px) 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '80px', flexWrap: 'wrap' }}>
          {/* Phone */}
          <div ref={r} className="reveal" style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
            <IPhoneFrame src={SCREENS.performance} alt="Performance Analytics" tilt="right" />
          </div>
          {/* Text */}
          <div ref={r} className="reveal" style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1580c2', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '14px' }}>
              Analitik Prestasi
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.08, color: '#1d1d1f', margin: '0 0 20px' }}>
              Tahu betul-betul mana yang berkesan.
            </h2>
            <p style={{ fontSize: '17px', fontWeight: 300, color: '#6e6e73', lineHeight: 1.7, margin: '0 0 28px' }}>
              Jejak berapa klik, berapa rujukan berjaya, dan kadar penukaran setiap kempen anda. Data masa nyata membantu anda fokus pada yang paling menguntungkan.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                '📈 Kadar penukaran per kempen',
                '🎯 Pencapaian & lencana ganjaran',
                '🔴 Data langsung, sentiasa terkini',
              ].map(item => (
                <div key={item} style={{ fontSize: '15px', color: '#1d1d1f', fontWeight: 400 }}>{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 — Referrals */}
      <section style={{ background: '#f5f5f7', padding: 'clamp(80px, 10vw, 130px) 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '80px', flexWrap: 'wrap-reverse' }}>
          {/* Text */}
          <div ref={r} className="reveal" style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1580c2', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '14px' }}>
              Jejak Rujukan
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.08, color: '#1d1d1f', margin: '0 0 20px' }}>
              Setiap pesakit, setiap ringgit — tercatat.
            </h2>
            <p style={{ fontSize: '17px', fontWeight: 300, color: '#6e6e73', lineHeight: 1.7, margin: '0 0 28px' }}>
              Ikuti status setiap rujukan dari pendaftaran hingga selesai rawatan. Komisen dikreditkan secara automatik apabila pesakit tamat sesi.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                '✅ Status dikemaskini secara masa nyata',
                '🔒 Data pesakit dilindungi sepenuhnya',
                '💳 Komisen terus ke akaun bank anda',
              ].map(item => (
                <div key={item} style={{ fontSize: '15px', color: '#1d1d1f', fontWeight: 400 }}>{item}</div>
              ))}
            </div>
          </div>
          {/* Phone */}
          <div ref={r} className="reveal" style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
            <IPhoneFrame src={SCREENS.referrals} alt="Referral tracking" tilt="left" />
          </div>
        </div>
      </section>

      {/* ── TIERS SECTION ───────────────────────────────────────────────── */}
      <section id="tiers" style={{ background: '#fff', padding: 'clamp(80px, 10vw, 130px) 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div ref={r} className="reveal" style={{ fontSize: '13px', fontWeight: 600, color: '#1580c2', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '14px' }}>
            Sistem Tier
          </div>
          <h2 ref={r} className="reveal" style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.08, color: '#1d1d1f', margin: '0 0 16px' }}>
            Semakin aktif, semakin tinggi ganjaran.
          </h2>
          <p ref={r} className="reveal" style={{ fontSize: '17px', fontWeight: 300, color: '#6e6e73', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 64px' }}>
            Tier dikira semula setiap bulan. Kekal aktif untuk kekalkan bonus komisen anda.
          </p>

          <div ref={r} className="reveal" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {[
              { tier: 'Bronze',  mult: '×1.0',  color: '#b45309', bg: 'linear-gradient(135deg, #fdf8f0, #fef3e2)', border: '#fde68a' },
              { tier: 'Silver',  mult: '×1.2',  color: '#475569', bg: 'linear-gradient(135deg, #f8f9fb, #eef0f5)', border: '#e2e8f0' },
              { tier: 'Gold',     mult: '×1.5',  color: '#b45309', bg: 'linear-gradient(135deg, #fffbeb, #fef9e0)', border: '#fde68a', crown: true },
            ].map(({ tier, mult, color, bg, border, crown }) => (
              <div key={tier} style={{
                background: bg, borderRadius: '24px',
                border: `1px solid ${border}`,
                padding: '40px 32px', textAlign: 'left',
                transition: 'transform 0.3s',
                position: 'relative',
              }}>
                {crown && <div style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '24px', opacity: 0.5 }}>👑</div>}
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color, opacity: 0.7, marginBottom: '12px' }}>{tier}</div>
                <div style={{ fontSize: '48px', fontWeight: 800, color, letterSpacing: '-2px', lineHeight: 1, marginBottom: '6px' }}>{mult}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMUNITY / STORY ───────────────────────────────────────────── */}
      <section id="community" style={{ background: '#f5f5f7', padding: 'clamp(80px, 10vw, 130px) 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <div ref={r} className="reveal" style={{ fontSize: '13px', fontWeight: 600, color: '#1580c2', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '14px' }}>
            Pernah alami ini?
          </div>
          <h2 ref={r} className="reveal" style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: '#1d1d1f', margin: '0 0 48px' }}>
            Anda sudah pun mencadangkan klinik kepada rakan. Biar ia memberi manfaat kepada anda juga.
          </h2>

          {/* Chat */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left', marginBottom: '48px' }}>
            {[
              { who: 'Kawan', emoji: '👩', align: 'left',  text: '"Eh, ada tak klinik yang bagus untuk buat medical check-up? Yang boleh dipercayai..."' },
              { who: 'Anda',  emoji: '🙋', align: 'right', text: '"Ada! Klinik Ara 24 Jam. Best, buka 24 jam, ada semua servis!"', blue: true },
              { who: 'Kawan', emoji: '👩', align: 'left',  text: '"Wah, terima kasih! Nanti aku pergi! 🙏"' },
            ].map(({ who, emoji, align, text, blue }) => (
              <div key={who + text} style={{ display: 'flex', flexDirection: align === 'right' ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: blue ? '#1580c2' : '#e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{emoji}</div>
                <div style={{
                  background: blue ? '#1580c2' : '#e5e5ea',
                  color: blue ? '#fff' : '#1d1d1f',
                  borderRadius: align === 'right' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '12px 16px',
                  fontSize: '15px', fontWeight: 300, lineHeight: 1.5,
                  maxWidth: '72%',
                }}>
                  {text}
                </div>
              </div>
            ))}
          </div>

          <div ref={r} className="reveal" style={{
            background: '#fff', borderRadius: '20px', padding: '32px',
            border: '1px solid rgba(0,0,0,0.06)',
          }}>
            <p style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', fontWeight: 400, color: '#1d1d1f', lineHeight: 1.6, margin: 0 }}>
              Buat benda yang sama —{' '}
              <strong style={{ color: '#1580c2' }}>dan dapatkan ganjaran</strong>{' '}
              dengan AraPower. Kami kongsi rezeki bersama anda. 🤝
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section style={{
        background: '#1580c2',
        padding: 'clamp(80px, 10vw, 130px) 24px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 ref={r} className="reveal" style={{
            fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 700,
            letterSpacing: '-0.025em', lineHeight: 1.05,
            color: '#fff', margin: '0 0 16px',
          }}>
            Sertai AraPower hari ini.
          </h2>
          <p ref={r} className="reveal" style={{ fontSize: '17px', fontWeight: 300, color: 'rgba(255,255,255,0.75)', margin: '0 0 40px' }}>
            Percuma. Fleksibel. Bermakna.
          </p>
          <a ref={r} className="reveal" href="https://arapower.hsohealthcare.com" style={{
            display: 'inline-block',
            fontSize: '17px', fontWeight: 500,
            background: '#fff', color: '#1580c2',
            padding: '18px 48px', borderRadius: '980px',
            textDecoration: 'none',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            Daftar Sekarang →
          </a>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{
        background: '#f5f5f7', borderTop: '1px solid rgba(0,0,0,0.08)',
        padding: '32px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px',
      }}>
        <img
          src="https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/lOGO%20ARA%20dark%20blue%20(1).png?alt=media&token=e9c445db-4f1d-4858-9673-e3a9a94b0590"
          alt="Klinik Ara" style={{ height: '24px', objectFit: 'contain' }}
        />
        <p style={{ fontSize: '13px', color: '#6e6e73', margin: 0 }}>© 2025 Klinik Ara 24 Jam · hsohealthcare.com</p>
        <div style={{ display: 'flex', gap: '20px' }}>
          {['Platform', 'Contact'].map(l => (
            <a key={l} href={l === 'Platform' ? 'https://arapower.hsohealthcare.com' : 'mailto:support@hsohealthcare.com'}
              style={{ fontSize: '13px', color: '#6e6e73', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>

      {/* Mobile nav styles */}
      <style>{`
        @media (max-width: 768px) {
          .ap-nav-links { display: none !important; }
        }
        .reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .reveal.visible { opacity: 1; transform: none; }
      `}</style>
    </div>
  );
};

export default AraPowerLanding;