import React, { useEffect, useState, useRef } from 'react';
import './AraPowerLanding.css';
import SEO from './SEO';

const AraPowerLanding: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const revealRefs = useRef<(HTMLDivElement | HTMLElement | null)[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll);
    
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.12 });

    const currentRefs = revealRefs.current;
    currentRefs.forEach(el => {
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      currentRefs.forEach(el => {
        if (el) observer.unobserve(el);
      });
    };
  }, []);

  const addToRefs = (el: HTMLDivElement | HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  };

  return (
    <div className="arapower-body">
      <SEO 
        title="AraPower — Earn. Share. Heal." 
        description="Join AraPower, Klinik Ara 24 Jam's exclusive affiliate programme. Share health services, earn commission, and help your community access quality healthcare."
        image="https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/AraPower%20Poster%20.jpg?alt=media&token=122ea2b4-d858-42c0-9a5d-4e217d3d42ea"
        url="https://klinikara24jam.hsohealthcare.com/arapower"
      />
      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] px-5 md:px-10 h-16 flex items-center justify-between bg-white/80 backdrop-blur-[20px] border-b border-[#1580c2]/10 transition-all duration-300 ${isScrolled ? 'shadow-[0_4px_32px_rgba(0,0,0,0.06)]' : ''}`}>
        <a href="#" className="font-extrabold text-xl text-[#1580c2] tracking-tighter decoration-none">AraPower</a>
        <a href="/" className="text-sm font-normal text-[#0a0f1e] opacity-70 hover:opacity-100 transition-opacity">Main Clinic Site</a>
        <div className="hidden md:flex items-center gap-8">
          <a href="#how" className="text-sm font-normal text-[#0a0f1e] opacity-70 hover:opacity-100 transition-opacity">How it works</a>
          <a href="#features" className="text-sm font-normal text-[#0a0f1e] opacity-70 hover:opacity-100 transition-opacity">Features</a>
          <a href="#tiers" className="text-sm font-normal text-[#0a0f1e] opacity-70 hover:opacity-100 transition-opacity">Tiers</a>
          <a href="#impact" className="text-sm font-normal text-[#0a0f1e] opacity-70 hover:opacity-100 transition-opacity">Impact</a>
        </div>
        <a href="https://arapower.hsohealthcare.com" className="bg-[#1580c2] text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-[#0d5a8a] hover:-translate-y-px transition-all">Join Now</a>
      </nav>

      {/* HERO */}
      <section className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center text-center px-10 pt-24 pb-20 relative overflow-hidden">
        <div className="hero-orb-1"></div>
        <div className="hero-orb-2"></div>

        <div className="inline-block text-[12px] font-medium tracking-[0.2em] uppercase text-[#1580c2] bg-[#1580c2]/15 px-4 py-1.5 rounded-full mb-7 border border-[#1580c2]/30 relative z-10">
          Klinik Ara 24 Jam · Exclusive Affiliate Programme
        </div>

        <h1 className="font-extrabold text-[52px] md:text-[96px] leading-none tracking-[-1.5px] text-white relative z-10 mb-6 font-sans">
          Earn.<br /><span className="text-[#1580c2]">Share.</span><br />Heal.
        </h1>

        <p className="text-[16px] md:text-[20px] font-light leading-relaxed text-white/60 max-w-[560px] relative z-10 mb-12">
          Turn your network into a force for community health. Share quality healthcare services and earn meaningful income — one referral at a time.
        </p>

        <div className="flex gap-4 items-center relative z-10 flex-wrap justify-center font-sans">
          <a href="https://arapower.hsohealthcare.com" className="bg-[#1580c2] text-white text-[16px] font-medium px-9 py-4 rounded-full shadow-[0_8px_32px_rgba(21,128,194,0.4)] hover:bg-[#0d5a8a] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(21,128,194,0.5)] transition-all">
            Start Earning Today
          </a>
          <a href="#how" className="text-white/70 text-[16px] font-normal px-9 py-4 rounded-full border border-white/15 hover:text-white hover:border-white/40 transition-all">
            See how it works
          </a>
        </div>

        <div className="flex gap-12 mt-18 relative z-10 border-t border-white/10 pt-12 flex-wrap justify-center font-sans">
          <div>
            <div className="text-[36px] font-bold text-white">RM0</div>
            <div className="text-[13px] text-white/45 mt-1">to join</div>
          </div>
          <div>
            <div className="text-[36px] font-bold text-white">50%</div>
            <div className="text-[13px] text-white/45 mt-1">Gold tier bonus</div>
          </div>
          <div>
            <div className="text-[36px] font-bold text-white">24/7</div>
            <div className="text-[13px] text-white/45 mt-1">Clinic availability</div>
          </div>
          <div>
            <div className="text-[36px] font-bold text-white">Real-time</div>
            <div className="text-[13px] text-white/45 mt-1">Referral tracking</div>
          </div>
        </div>

        <div className="hero-scroll absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 text-[11px] tracking-[0.15em] uppercase z-10">
          <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent"></div>
          Scroll
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#f7f9fc] py-30 px-10" id="how">
        <div className="max-w-[1100px] mx-auto">
          <div className="section-eyebrow reveal text-[#1580c2] text-[12px] font-medium tracking-[0.2em] uppercase mb-4" ref={addToRefs}>How it works</div>
          <h2 className="section-title reveal text-[36px] md:text-[60px] font-extrabold leading-[1.05] tracking-[-1.5px] mb-5 font-sans" ref={addToRefs}>Three steps.<br />Infinite impact.</h2>
          <p className="section-sub reveal text-[18px] font-light leading-relaxed text-[#0a0f1e]/55 max-w-[540px]" ref={addToRefs}>No experience needed. No upfront cost. Just share — and the system handles everything else.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 font-sans">
            <div className="step reveal bg-white rounded-[24px] p-10 border border-black/5 transition-all hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.08)] relative overflow-hidden" ref={addToRefs}>
              <span className="step-num text-[80px] font-extrabold text-[#e8f4fd] leading-none absolute top-5 right-6 select-none">01</span>
              <div className="w-13 h-13 rounded-[16px] bg-[#e8f4fd] flex items-center justify-center mb-7 relative z-10">
                <svg className="w-6 h-6 stroke-[#1580c2] fill-none stroke-2 stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3 className="text-[22px] font-bold mb-3 tracking-[-0.5px]">Register for Free</h3>
              <p className="text-[15px] font-light leading-relaxed text-[#0a0f1e]/55">Create your AraPower account in minutes. Get your unique referral link and personalised QR code instantly upon approval.</p>
            </div>

            <div className="step reveal transition-all delay-100 bg-white rounded-[24px] p-10 border border-black/5 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.08)] relative overflow-hidden" ref={addToRefs}>
              <span className="step-num text-[80px] font-extrabold text-[#e8f4fd] leading-none absolute top-5 right-6 select-none">02</span>
              <div className="w-13 h-13 rounded-[16px] bg-[#e8f4fd] flex items-center justify-center mb-7 relative z-10">
                <svg className="w-6 h-6 stroke-[#1580c2] fill-none stroke-2 stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </div>
              <h3 className="text-[22px] font-bold mb-3 tracking-[-0.5px]">Share Your Link</h3>
              <p className="text-[15px] font-light leading-relaxed text-[#0a0f1e]/55">Post your affiliate link on WhatsApp, Instagram, TikTok, or anywhere your community gathers. Every click is tracked automatically.</p>
            </div>

            <div className="step reveal transition-all delay-200 bg-white rounded-[24px] p-10 border border-black/5 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.08)] relative overflow-hidden" ref={addToRefs}>
              <span className="step-num text-[80px] font-extrabold text-[#e8f4fd] leading-none absolute top-5 right-6 select-none">03</span>
              <div className="w-13 h-13 rounded-[16px] bg-[#e8f4fd] flex items-center justify-center mb-7 relative z-10">
                <svg className="w-6 h-6 stroke-[#1580c2] fill-none stroke-2 stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              </div>
              <h3 className="text-[22px] font-bold mb-3 tracking-[-0.5px]">Earn Commission</h3>
              <p className="text-[15px] font-light leading-relaxed text-[#0a0f1e]/55">When your referral attends Klinik Ara, commission is credited to your account automatically. Withdraw directly to your bank.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-[#0a0f1e] py-30 px-10 text-white" id="features">
        <div className="max-w-[1100px] mx-auto">
          <div className="section-eyebrow reveal text-[#5bb3e8] text-[12px] font-medium tracking-[0.2em] uppercase mb-4" ref={addToRefs}>Platform features</div>
          <h2 className="section-title reveal text-[36px] md:text-[60px] font-extrabold leading-[1.05] tracking-[-1.5px] mb-5 font-sans" ref={addToRefs}>Everything you need.<br />Nothing you don't.</h2>
          <p className="section-sub reveal text-[18px] font-light leading-relaxed text-white/45 max-w-[540px]" ref={addToRefs}>A purpose-built affiliate dashboard designed for simplicity and transparency.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px mt-16 font-sans">
            <div className="feature-card reveal bg-white/5 p-12 relative overflow-hidden hover:bg-white/[0.07] transition-all" ref={addToRefs}>
              <div className="w-12 h-12 rounded-[14px] border border-[#1580c2]/30 bg-[#1580c2]/10 flex items-center justify-center mb-6">
                <svg className="w-5.5 h-5.5 stroke-[#5bb3e8] fill-none stroke-[1.8] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
              </div>
              <h3 className="text-[24px] font-bold mb-3 tracking-[-0.5px]">Live Referral Dashboard</h3>
              <p className="text-[15px] font-light leading-relaxed text-white/45 max-w-[380px]">Watch every referral move through the pipeline in real time — from booking to completion. Know exactly where your commission stands at any moment.</p>
            </div>

            <div className="feature-card reveal transition-all delay-100 bg-white/5 p-12 relative overflow-hidden hover:bg-white/[0.07]" ref={addToRefs}>
              <div className="w-12 h-12 rounded-[14px] border border-[#1580c2]/30 bg-[#1580c2]/10 flex items-center justify-center mb-6">
                <svg className="w-5.5 h-5.5 stroke-[#5bb3e8] fill-none stroke-[1.8] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <h3 className="text-[24px] font-bold mb-3 tracking-[-0.5px]">Tier Progression</h3>
              <p className="text-[15px] font-light leading-relaxed text-white/45 max-w-[380px]">Bronze, Silver, and Gold tiers reward your consistency. Earn up to 50% bonus commission at Gold tier — the more you share, the more you earn.</p>
            </div>

            <div className="feature-card reveal bg-white/5 p-12 relative overflow-hidden hover:bg-white/[0.07] transition-all" ref={addToRefs}>
              <div className="w-12 h-12 rounded-[14px] border border-[#1580c2]/30 bg-[#1580c2]/10 flex items-center justify-center mb-6">
                <svg className="w-5.5 h-5.5 stroke-[#5bb3e8] fill-none stroke-[1.8] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <h3 className="text-[24px] font-bold mb-3 tracking-[-0.5px]">Instant Notifications</h3>
              <p className="text-[15px] font-light leading-relaxed text-white/45 max-w-[380px]">Get notified the moment someone books through your link. Email and in-app alerts keep you in the loop without lifting a finger.</p>
            </div>

            <div className="feature-card reveal transition-all delay-100 bg-white/5 p-12 relative overflow-hidden hover:bg-white/[0.07]" ref={addToRefs}>
              <div className="w-12 h-12 rounded-[14px] border border-[#1580c2]/30 bg-[#1580c2]/10 flex items-center justify-center mb-6">
                <svg className="w-5.5 h-5.5 stroke-[#5bb3e8] fill-none stroke-[1.8] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h3 className="text-[24px] font-bold mb-3 tracking-[-0.5px]">Transparent Payouts</h3>
              <p className="text-[15px] font-light leading-relaxed text-white/45 max-w-[380px]">See exactly how much you've earned, what's pending approval, and what's been paid out. Every ringgit is accounted for.</p>
            </div>

            <div className="feature-card reveal bg-white/5 p-12 relative overflow-hidden hover:bg-white/[0.07] transition-all md:col-span-2" ref={addToRefs}>
              <div className="w-12 h-12 rounded-[14px] border border-[#1580c2]/30 bg-[#1580c2]/10 flex items-center justify-center mb-6">
                <svg className="w-5.5 h-5.5 stroke-[#5bb3e8] fill-none stroke-[1.8] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3 className="text-[24px] font-bold mb-3 tracking-[-0.5px]">Marketing Posters, Ready to Share</h3>
              <p className="text-[15px] font-light leading-relaxed text-white/45 max-w-[640px]">Access a gallery of professionally designed promotional posters for every clinic service. Download and share directly to WhatsApp or save to your phone — no design skills needed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TIERS */}
      <section className="bg-white py-30 px-10" id="tiers">
        <div className="max-w-[1100px] mx-auto">
          <div className="section-eyebrow reveal text-[#1580c2] text-[12px] font-medium tracking-[0.2em] uppercase mb-4" ref={addToRefs}>Reward tiers</div>
          <h2 className="section-title reveal text-[36px] md:text-[60px] font-extrabold leading-[1.05] tracking-[-1.5px] mb-5 font-sans" ref={addToRefs}>The more you give,<br />the more you gain.</h2>
          <p className="section-sub reveal text-[18px] font-light leading-relaxed text-[#0a0f1e]/55 max-w-[540px]" ref={addToRefs}>Tiers are calculated monthly. Keep referring to unlock higher bonus multipliers.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 font-sans">
            <div className="tier-card reveal bg-gradient-to-br from-[#fdf8f0] to-[#fef3e2] rounded-[24px] p-10 border border-[#b45309]/12 transition-all hover:-translate-y-2" ref={addToRefs}>
              <div className="inline-block text-[11px] font-medium tracking-[0.15em] uppercase px-3.5 py-1.5 rounded-full mb-6 bg-[#b45309]/10 text-[#b45309]">Bronze</div>
              <h3 className="text-[28px] font-extrabold tracking-tighter text-[#b45309] mb-2">Start Strong</h3>
              <p className="text-[13px] font-normal text-[#0a0f1e]/45 mb-7">0 – 5 referrals / month</p>
              <div className="text-[52px] font-extrabold tracking-[-1.5px] leading-none text-[#b45309] mb-1.5">×1.0</div>
              <div className="text-[13px] text-[#0a0f1e]/45">Base commission rate</div>
            </div>

            <div className="tier-card reveal transition-all delay-100 bg-gradient-to-br from-[#f8f9fb] to-[#eef0f5] rounded-[24px] p-10 border border-[#64748b]/15 hover:-translate-y-2" ref={addToRefs}>
              <div className="inline-block text-[11px] font-medium tracking-[0.15em] uppercase px-3.5 py-1.5 rounded-full mb-6 bg-[#64748b]/12 text-[#475569]">Silver</div>
              <h3 className="text-[28px] font-extrabold tracking-tighter text-[#475569] mb-2">Build Momentum</h3>
              <p className="text-[13px] font-normal text-[#0a0f1e]/45 mb-7">6 – 10 referrals / month</p>
              <div className="text-[52px] font-extrabold tracking-[-1.5px] leading-none text-[#475569] mb-1.5">×1.2</div>
              <div className="text-[13px] text-[#0a0f1e]/45">20% bonus on earnings</div>
            </div>

            <div className="tier-card reveal transition-all delay-200 bg-gradient-to-br from-[#fffbeb] to-[#fef9e0] rounded-[24px] p-10 border border-[#f59e0b]/20 hover:-translate-y-2 shadow-[0_8px_40px_rgba(245,158,11,0.12)] relative overflow-hidden" ref={addToRefs}>
              <div className="absolute top-6 right-6 text-[28px] opacity-50">👑</div>
              <div className="inline-block text-[11px] font-medium tracking-[0.15em] uppercase px-3.5 py-1.5 rounded-full mb-6 bg-[#f59e0b]/15 text-[#b45309]">Gold</div>
              <h3 className="text-[28px] font-extrabold tracking-tighter text-[#b45309] mb-2">Unlock Full Power</h3>
              <p className="text-[13px] font-normal text-[#0a0f1e]/45 mb-7">11+ referrals / month</p>
              <div className="text-[52px] font-extrabold tracking-[-1.5px] leading-none text-[#f59e0b] mb-1.5">×1.5</div>
              <div className="text-[13px] text-[#0a0f1e]/45">50% bonus on earnings</div>
            </div>
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section className="bg-[#1580c2] py-30 px-10 text-white" id="impact">
        <div className="max-w-[1100px] mx-auto">
          <div className="section-eyebrow reveal text-white/60 text-[12px] font-medium tracking-[0.2em] uppercase mb-4" ref={addToRefs}>Community impact</div>
          <h2 className="section-title reveal text-[36px] md:text-[60px] font-extrabold leading-[1.05] tracking-[-1.5px] mb-5 font-sans" ref={addToRefs}>Healthcare is a right,<br />not a privilege.</h2>
          <p className="section-sub reveal text-[18px] font-light leading-relaxed text-white/65 max-w-[540px]" ref={addToRefs}>Every referral you make connects a real person to the care they need. This is what social impact looks like in practice.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16 font-sans">
            <div className="impact-card reveal bg-white/10 rounded-[24px] p-10 border border-white/12 backdrop-blur-[8px] hover:bg-white/15 transition-all" ref={addToRefs}>
              <h3 className="text-[22px] font-bold mb-3 tracking-[-0.5px]">Breaking Barriers to Access</h3>
              <p className="text-[15px] font-light leading-relaxed text-white/65">Many Malaysians delay seeking medical care due to uncertainty — not knowing where to go, what it costs, or whether they'll be treated well. Your referral removes that hesitation with a trusted recommendation.</p>
            </div>

            <div className="impact-card reveal transition-all delay-100 bg-white/10 rounded-[24px] p-10 border border-white/12 backdrop-blur-[8px] hover:bg-white/15" ref={addToRefs}>
              <h3 className="text-[22px] font-bold mb-3 tracking-[-0.5px]">Early Detection Saves Lives</h3>
              <p className="text-[15px] font-light leading-relaxed text-white/65">Health screenings and diagnostics caught early make the difference between a manageable condition and a life-threatening one. Every booking you facilitate could be someone's turning point.</p>
            </div>

            <div className="impact-card reveal bg-white/10 rounded-[24px] p-10 border border-white/12 backdrop-blur-[8px] hover:bg-white/15 transition-all" ref={addToRefs}>
              <div className="text-[48px] font-extrabold tracking-[-1.5px] mb-2">24/7</div>
              <div className="text-[14px] text-white/55">Clinic availability — no one is left without care</div>
            </div>

            <div className="impact-card reveal transition-all delay-100 bg-white/10 rounded-[24px] p-10 border border-white/12 backdrop-blur-[8px] hover:bg-white/15" ref={addToRefs}>
              <h3 className="text-[22px] font-bold mb-3 tracking-[-0.5px]">Strengthening Communities</h3>
              <p className="text-[15px] font-light leading-relaxed text-white/65">A healthier community is a stronger one. When people around you have access to quality healthcare, productivity rises, families stay together, and wellbeing compounds across generations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="bg-[#f7f9fc] text-center py-24 px-10">
        <div className="max-w-[1100px] mx-auto">
          <div className="quote-mark reveal text-[120px] leading-none text-[#e8f4fd] -mb-5" ref={addToRefs}>"</div>
          <p className="quote-text reveal text-[24px] md:text-[40px] font-semibold tracking-tighter leading-[1.25] text-[#0a0f1e] max-w-[800px] mx-auto mb-8 font-sans" ref={addToRefs}>You don't need to be a doctor to improve public health. You just need to care enough to share.</p>
          <p className="quote-author reveal text-[14px] text-[#0a0f1e]/45 tracking-[0.05em]" ref={addToRefs}>— The AraPower Mission</p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0a0f1e] text-center py-36 px-10 relative overflow-hidden">
        <div className="cta-orb"></div>
        <div className="max-w-[1100px] mx-auto">
          <h2 className="reveal text-[40px] md:text-[72px] font-extrabold tracking-[-1.5px] leading-[1.05] text-white mb-5 relative z-10 font-sans" ref={addToRefs}>Ready to earn<br /><span className="text-[#1580c2]">and give back?</span></h2>
          <p className="reveal text-[18px] font-light text-white/50 mb-12 relative z-10" ref={addToRefs}>Join AraPower today. It's free, it's flexible, and it matters.</p>
          <a href="https://arapower.hsohealthcare.com" className="btn-primary reveal text-[18px] px-12 py-5 relative z-10 inline-block bg-[#1580c2] text-white font-medium rounded-full shadow-[0_8px_32px_rgba(21,128,194,0.4)] hover:bg-[#0d5a8a] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(21,128,194,0.5)] transition-all font-sans" ref={addToRefs}>Create Your Account →</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0a0f1e] border-t border-white/6 px-10 py-12 flex items-center justify-between flex-wrap gap-4 font-sans">
        <div className="font-extrabold text-[18px] text-[#1580c2]">AraPower</div>
        <div className="text-[13px] text-white/30">© 2025 Klinik Ara 24 Jam · hsohealthcare.com</div>
        <div className="flex gap-6">
          <a href="/" className="text-[13px] text-white/30 hover:text-white/60 transition-colors">Clinic Home</a>
          <a href="https://arapower.hsohealthcare.com" className="text-[13px] text-white/30 hover:text-white/60 transition-colors">Platform</a>
          <a href="mailto:support@hsohealthcare.com" className="text-[13px] text-white/30 hover:text-white/60 transition-colors">Contact</a>
        </div>
      </footer>
    </div>
  );
};

export default AraPowerLanding;
