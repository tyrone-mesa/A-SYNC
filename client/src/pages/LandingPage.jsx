import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import {
  Briefcase,
  Users,
  Zap,
  CheckCircle,
  GraduationCap,
  Rocket,
  ArrowRight,
  MapPin,
  ExternalLink,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const HERO_AUDIO_PREF_KEY = "asiatechsync_hero_audio_unmuted";
const INTRO_DURATION = 9.2;
const INTRO_CONTENT_REVEAL_DELAY = 7.85;

const openPartnerSignup = () => {
  window.dispatchEvent(new CustomEvent("asiatech:partner-signup"));
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1.1, ease: "easeOut" } },
};

const heroContent = {
  hidden: {},
  visible: { transition: { delayChildren: 0.25, staggerChildren: 0.12 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const FEATURES = [
  {
    number: "01",
    icon: Users,
    title: "Create Your Profile",
    description: "Build your professional profile and upload your resume.",
    color: "#1E5D46",
  },
  {
    number: "02",
    icon: Briefcase,
    title: "Discover Opportunities",
    description: "Explore OJT, internship, and employment opportunities.",
    color: "#1E5D46",
  },
  {
    number: "03",
    icon: Zap,
    title: "Connect & Apply",
    description: "Apply to opportunities and connect with potential employers.",
    color: "#1E5D46",
  },
];

const OPPORTUNITIES = [
  {
    icon: GraduationCap,
    title: "OJT",
    description: "Gain real-world experience.",
  },
  {
    icon: Briefcase,
    title: "Internships",
    description: "Develop your skills in a professional environment.",
  },
  {
    icon: Rocket,
    title: "Employment",
    description: "Take your next step toward your career.",
  },
];

const PARTNER_BENEFITS = [
  ["Reach Talent", "Connect directly with ASIATECH students."],
  [
    "Build Future Professionals",
    "Give students meaningful industry experience.",
  ],
  [
    "Simplify Recruitment",
    "Post opportunities and manage applicants through one platform.",
  ],
  [
    "Build a Stronger Partnership",
    "Strengthen the connection between education and industry.",
  ],
];

const ABOUT_SLIDES = [
  {
    image: "/system-logo/A-Sync-Logo.png",
    alt: "A-Sync official logo",
    name: "Connecting ASIATECH Students to the Industry",
    role: "AsiatechSync connects students with meaningful industry opportunities.",
  },
  {
    image: "/system-logo/Igot.png",
    alt: "Romel S. Igot Jr.",
    name: "Romel S. Igot Jr.",
    role: "Front-end development and integration",
  },
  {
    image: "/system-logo/Olivera.png",
    alt: "Leonor Olivera",
    name: "Leonor Olivera",
    role: "Back-end development and API integration",
  },
  {
    image: "/system-logo/Mesa.png",
    alt: "Tyrone James Rafael A. Mesa",
    name: "Tyrone James Rafael A. Mesa",
    role: "Documentation and system development support",
  },
];

const LandingPage = ({ intro = false, onIntroComplete }) => {
  const { user } = useAuth();
  const heroVideoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isIntroRevealed, setIsIntroRevealed] = useState(!intro);
  const [hasIntroAnimation, setHasIntroAnimation] = useState(false);
  const [isSoundPressed, setIsSoundPressed] = useState(false);
  const [concern, setConcern] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [concernStatus, setConcernStatus] = useState("");
  const [concernBusy, setConcernBusy] = useState(false);
  const [concernConsent, setConcernConsent] = useState(false);
  const [aboutSlide, setAboutSlide] = useState(0);
  const [aboutDirection, setAboutDirection] = useState(1);
  const [featureSlide, setFeatureSlide] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (!intro || !isVideoReady) return undefined;

    if (prefersReducedMotion) {
      setIsIntroRevealed(true);
      onIntroComplete();
      return undefined;
    }

    setHasIntroAnimation(true);
    const revealTimeout = window.setTimeout(
      () => setIsIntroRevealed(true),
      INTRO_CONTENT_REVEAL_DELAY * 1000,
    );
    const completeTimeout = window.setTimeout(
      onIntroComplete,
      INTRO_DURATION * 1000,
    );
    return () => {
      window.clearTimeout(revealTimeout);
      window.clearTimeout(completeTimeout);
    };
  }, [intro, isVideoReady, onIntroComplete, prefersReducedMotion]);

  const submitConcern = async (event) => {
    event.preventDefault();
    if (!concernConsent) {
      setConcernStatus("Please confirm you agree to the Privacy Policy first.");
      return;
    }
    setConcernBusy(true);
    setConcernStatus("");
    try {
      const { data } = await api.post("/contact/concerns", {
        name: user?.fullName || concern.name,
        email: user?.email || concern.email,
        message: concern.message,
      });
      setConcern({ name: "", email: "", message: "" });
      setConcernConsent(false);
      setConcernStatus(data.message);
      window.setTimeout(() => setConcernStatus(""), 5000);
    } catch (error) {
      setConcernStatus(
        error.response?.data?.message || "Unable to send your concern.",
      );
    } finally {
      setConcernBusy(false);
    }
  };

  const toggleSound = () => {
    const video = heroVideoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    if (!nextMuted) {
      video.volume = 0.85;
      video.play().catch(() => {});
    }
    setIsMuted(nextMuted);
    try {
      window.localStorage.setItem(
        HERO_AUDIO_PREF_KEY,
        nextMuted ? "false" : "true",
      );
    } catch (e) {
      // localStorage unavailable (e.g. private mode) — safe to ignore
    }
  };

  React.useEffect(() => {
    const video = heroVideoRef.current;
    if (!video || !isVideoReady) return;

    let prefersUnmuted = false;
    try {
      prefersUnmuted =
        window.localStorage.getItem(HERO_AUDIO_PREF_KEY) === "true";
    } catch (e) {
      prefersUnmuted = false;
    }

    if (!prefersUnmuted) return;

    video.muted = false;
    video.volume = 0.85;
    video
      .play()
      .then(() => {
        setIsMuted(false);
      })
      .catch(() => {
        // Browser blocked unmuted playback — stay muted so autoplay keeps working
        video.muted = true;
        setIsMuted(true);
      });
  }, [isVideoReady]);

  const moveAboutSlide = (direction) => {
    setAboutDirection(direction);
    setAboutSlide(
      (current) =>
        (current + direction + ABOUT_SLIDES.length) % ABOUT_SLIDES.length,
    );
  };

  const moveFeatureSlide = (direction) => {
    setFeatureSlide(
      (current) => (current + direction + FEATURES.length) % FEATURES.length,
    );
  };

  return (
    <div className="min-h-screen bg-[#FBF8F3]">
      <section className="relative flex min-h-[calc(100svh-24px)] items-center justify-start overflow-hidden bg-[#0F3D2E] px-5 py-24 sm:px-8 lg:px-12">
        {/* Navbar lives inside the Hero section (which is `position: relative`) so it is
            absolutely positioned relative to the Hero, not the viewport. It scrolls away
            with the Hero naturally — no fixed, no sticky, no scroll listeners. */}
        <motion.div
          initial={intro ? { opacity: 0, y: -8 } : false}
          animate={{
            opacity: intro && !isIntroRevealed ? 0 : 1,
            y: 0,
          }}
          transition={{
            duration: intro ? 1.05 : 0,
            delay: intro && isIntroRevealed ? 0.16 : 0,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Navbar variant="overlay" />
        </motion.div>
        {intro && (
          <button
            type="button"
            onClick={() => onIntroComplete?.()}
            className="absolute right-5 top-24 z-20 rounded-full border border-white/60 bg-[#0F3D2E]/75 px-5 py-2.5 text-sm font-semibold text-white shadow-md backdrop-blur-sm transition hover:bg-[#0F3D2E] focus:outline-none focus:ring-2 focus:ring-[#E8C165] focus:ring-offset-2 focus:ring-offset-[#0F3D2E] sm:right-8"
          >
            Skip intro
          </button>
        )}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="absolute inset-0"
        >
          <motion.video
            ref={heroVideoRef}
            className={`absolute inset-0 h-full w-full object-cover object-[50%_20%] motion-reduce:transition-none ${hasIntroAnimation ? "landing-intro-video" : ""}`}
            src="/media/hero-intro-2.mp4?v=6fd1a86a"
            autoPlay
            muted
            loop
            playsInline
            controls={false}
            onCanPlay={() => setIsVideoReady(true)}
            initial={intro ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
            animate={
              intro
                ? { opacity: isVideoReady ? 1 : 0 }
                : { opacity: isVideoReady ? 1 : 0, scale: 1 }
            }
            transition={{ duration: intro ? 1 : 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
          {!isVideoReady && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#0B2E22] via-[#0F3D2E] to-[#0B2E22]" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0F3D2E]/95 via-[#0F3D2E]/15 to-[#0F3D2E]/10" />
        </motion.div>
        <motion.div
          initial={intro ? { opacity: 0, y: 10 } : "hidden"}
          animate={
            intro
              ? {
                  opacity: isIntroRevealed ? 1 : 0,
                  y: isIntroRevealed ? 0 : 10,
                }
              : "visible"
          }
          transition={
            intro
              ? {
                  duration: 1.05,
                  delay: isIntroRevealed ? 0.16 : 0,
                  ease: [0.22, 1, 0.36, 1],
                }
              : undefined
          }
          variants={heroContent}
          className="relative z-10 mr-auto flex max-w-3xl flex-col items-start text-left text-white"
        >
          <motion.p
            variants={heroItem}
            className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-[#E8C165]"
          >
            Connecting Students. Empowering Opportunities.
          </motion.p>
          <motion.h1
            variants={heroItem}
            className="mb-6 max-w-2xl font-bespoke text-4xl font-bold italic leading-[1.02] sm:text-6xl"
          >
            Your Future Starts With the Right Opportunity.
          </motion.h1>
          <motion.p
            variants={heroItem}
            className="mb-8 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg"
          >
            AsiatechSync connects Asia Technological School of Science and Arts
            students with OJT, internship, and career opportunities from
            industry partners.
          </motion.p>
          <motion.div
            variants={heroItem}
            className="flex flex-col items-start gap-3 sm:flex-row"
          >
            <a
              href="/jobs"
              className="rounded-full bg-[#E8C165] px-7 py-3.5 text-center font-bold text-[#0F3D2E] shadow-sm transition duration-200 hover:-translate-y-1 hover:scale-[1.03] hover:bg-[#DEB24E] hover:shadow-md active:scale-[0.98]"
            >
              Find Opportunities
            </a>
            <button
              type="button"
              onClick={openPartnerSignup}
              className="rounded-full border border-white/50 bg-white/10 px-7 py-3.5 text-center font-bold text-white shadow-sm backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:scale-[1.03] hover:bg-white/20 hover:shadow-md active:scale-[0.98]"
            >
              Partner With Us
            </button>
          </motion.div>
        </motion.div>
        <motion.button
          type="button"
          onClick={toggleSound}
          onPointerDown={() => setIsSoundPressed(true)}
          onPointerUp={() => setIsSoundPressed(false)}
          onPointerLeave={() => setIsSoundPressed(false)}
          aria-label={isMuted ? "Unmute video" : "Mute video"}
          aria-pressed={!isMuted}
          initial={intro ? { opacity: 0 } : false}
          className="absolute bottom-6 right-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-[#0F3D2E] shadow-sm backdrop-blur-sm sm:right-8"
          animate={
            intro
              ? {
                  opacity: isIntroRevealed ? 1 : 0,
                  scale: prefersReducedMotion || !isSoundPressed ? 1 : 0.92,
                }
              : prefersReducedMotion
                ? undefined
                : { scale: isSoundPressed ? 0.92 : 1 }
          }
          transition={
            intro
              ? { opacity: { duration: 1.05 }, scale: { duration: 0.15 } }
              : undefined
          }
        >
          {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </motion.button>
      </section>

      <section
        id="about"
        className="relative z-0 scroll-mt-24 overflow-hidden px-4 py-14 sm:px-8 sm:py-20 md:px-16 lg:px-20"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="mx-auto max-w-6xl"
        >
          <motion.div
            key={aboutSlide}
            initial={
              prefersReducedMotion
                ? false
                : { opacity: 0, x: aboutDirection > 0 ? 80 : -80 }
            }
            animate={{ opacity: 1, x: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 150, damping: 25 }
            }
            className="grid min-w-0 gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center md:gap-10"
          >
            {aboutSlide % 2 === 0 && (
              <div className="min-w-0">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#1E5D46]">
                  About ASIATECHSYNC
                </p>
                <h2 className="mb-4 break-words text-[clamp(1.85rem,8vw,3rem)] font-extrabold leading-tight text-[#1D2939] md:mb-5 md:text-5xl">
                  {ABOUT_SLIDES[aboutSlide].name}
                </h2>
                <p className="mb-2 text-base leading-relaxed text-[#4B5768] sm:text-lg md:mb-7">
                  {ABOUT_SLIDES[aboutSlide].role}
                </p>
              </div>
            )}
            <div className="relative mx-auto grid h-[250px] min-h-0 w-full max-w-[22rem] grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-1 py-3 sm:h-[320px] sm:max-w-none sm:grid-cols-[3rem_minmax(0,1fr)_3rem] sm:gap-3 sm:py-7 md:block">
              <button
                type="button"
                onClick={() => moveAboutSlide(-1)}
                aria-label="Previous AsiatechSync team member"
                className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#0F3D2E] shadow-sm transition hover:bg-white hover:text-[#1E5D46] md:hidden"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="relative h-full min-w-0 overflow-hidden md:absolute md:inset-0">
                <div className="flex h-full items-center justify-center">
                  <img
                    src={ABOUT_SLIDES[aboutSlide].image}
                    alt={ABOUT_SLIDES[aboutSlide].alt}
                    loading="lazy"
                    decoding="async"
                    className={`w-full rounded-2xl object-contain ${
                      aboutSlide === 0
                        ? "h-[220px] max-w-full scale-100 sm:h-72"
                        : aboutSlide === 1 || aboutSlide === 3
                          ? "h-[220px] max-w-full translate-y-0 scale-100 sm:h-72 sm:scale-[1.6] md:translate-y-2 md:scale-[1.7]"
                          : "h-[220px] max-w-full translate-y-0 scale-100 sm:h-72 sm:translate-y-8 sm:scale-[1.45] md:translate-y-10 md:scale-[1.55]"
                    }`}
                  />
                </div>
                <div className="absolute bottom-1 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 sm:bottom-4">
                  {ABOUT_SLIDES.map((slide, index) => (
                    <button
                      key={slide.name}
                      type="button"
                      onClick={() => {
                        setAboutDirection(index >= aboutSlide ? 1 : -1);
                        setAboutSlide(index);
                      }}
                      aria-label={`Show ${slide.name}`}
                      aria-current={aboutSlide === index}
                      className={`h-1.5 rounded-full transition-all ${
                        aboutSlide === index
                          ? "w-6 bg-[#E8C165]"
                          : "w-1.5 bg-[#1E5D46]/30 hover:bg-[#1E5D46]/60"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => moveAboutSlide(1)}
                aria-label="Next AsiatechSync team member"
                className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#0F3D2E] shadow-sm transition hover:bg-white hover:text-[#1E5D46] md:hidden"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            {aboutSlide % 2 === 1 && (
              <div className="min-w-0">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#1E5D46]">
                  About ASIATECHSYNC
                </p>
                <h2 className="mb-4 break-words text-[clamp(1.85rem,8vw,3rem)] font-extrabold leading-tight text-[#1D2939] md:mb-5 md:text-5xl">
                  {ABOUT_SLIDES[aboutSlide].name}
                </h2>
                <p className="mb-2 text-base leading-relaxed text-[#4B5768] sm:text-lg md:mb-7">
                  {ABOUT_SLIDES[aboutSlide].role}
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
        <button
          type="button"
          onClick={() => moveAboutSlide(-1)}
          aria-label="Previous AsiatechSync team member"
          className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#0F3D2E] shadow-md transition hover:bg-white hover:text-[#1E5D46] md:flex lg:left-6"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => moveAboutSlide(1)}
          aria-label="Next AsiatechSync team member"
          className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#0F3D2E] shadow-md transition hover:bg-white hover:text-[#1E5D46] md:flex lg:right-6"
        >
          <ChevronRight size={20} />
        </button>
      </section>

      <section
        id="commitment"
        className="bg-[#0F3D2E] px-5 py-20 text-white sm:px-8 lg:px-12"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-center"
        >
          <div className="overflow-hidden rounded-[28px] border border-white/15 bg-white/10 p-4">
            <img
              src="/system-logo/Asiatech%20Seal.png"
              alt="ASIATECH school seal"
              loading="lazy"
              decoding="async"
              className="mx-auto h-56 w-full object-contain"
            />
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#E8C165]">
              The ASIATECH Commitment
            </p>
            <h2 className="mb-5 text-3xl font-extrabold md:text-5xl">
              A Commitment to Our Students
            </h2>
            <p className="text-lg leading-relaxed text-white/75">
              At Asia Technological School of Science and Arts, we believe that
              education should open doors to meaningful opportunities.
              AsiatechSync extends that commitment beyond the classroom by
              helping our students connect with the industry and prepare for
              their professional journey.
            </p>
          </div>
        </motion.div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="mx-auto max-w-6xl"
        >
          <motion.div variants={fadeUp} className="mb-12">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#1E5D46]">
              How ASIATECHSYNC Works
            </p>
            <h2 className="text-3xl font-extrabold text-[#1D2939] md:text-5xl">
              A simple path to your next step.
            </h2>
          </motion.div>
          <div className="relative mx-auto h-[290px] max-w-sm overflow-hidden md:hidden">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              const offset =
                (index - featureSlide + FEATURES.length) % FEATURES.length;
              const isActive = offset === 0;
              const isNext = offset === 1;
              const translateX = isActive ? 0 : isNext ? 108 : -108;

              return (
                <motion.div
                  key={feature.number}
                  className="absolute inset-x-3 top-2 rounded-2xl border border-[#ECE7DD] bg-white p-7 shadow-[0_14px_30px_-12px_rgba(29,41,57,0.22)]"
                  animate={{
                    x: `${translateX}%`,
                    scale: isActive ? 1 : 0.88,
                    opacity: isActive ? 1 : 0.35,
                  }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 180, damping: 24 }
                  }
                  style={{ zIndex: isActive ? 2 : 1 }}
                  aria-hidden={!isActive}
                >
                  <p className="mb-6 text-sm font-black text-[#E8C165]">
                    {feature.number}
                  </p>
                  <Icon className="mb-5 text-[#1E5D46]" size={30} />
                  <h3 className="mb-3 text-xl font-bold text-[#1D2939]">
                    {feature.title}
                  </h3>
                  <p className="text-[#4B5768]">{feature.description}</p>
                </motion.div>
              );
            })}
            <button
              type="button"
              onClick={() => moveFeatureSlide(-1)}
              aria-label="Previous ASIATECHSYNC feature"
              className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#1E5D46]/20 bg-white text-[#1E5D46] shadow-md"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => moveFeatureSlide(1)}
              aria-label="Next ASIATECHSYNC feature"
              className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#1E5D46]/20 bg-white text-[#1E5D46] shadow-md"
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
              {FEATURES.map((feature, index) => (
                <button
                  key={feature.number}
                  type="button"
                  onClick={() => setFeatureSlide(index)}
                  aria-label={`Show ${feature.title} feature`}
                  aria-current={featureSlide === index}
                  className={`h-1.5 rounded-full transition-all ${
                    featureSlide === index
                      ? "w-6 bg-[#1E5D46]"
                      : "w-1.5 bg-[#1E5D46]/30 hover:bg-[#1E5D46]/60"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="hidden md:grid md:grid-cols-3 md:gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.number}
                  variants={fadeUp}
                  whileHover={prefersReducedMotion ? undefined : { y: -6 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="min-w-[84%] snap-center rounded-2xl border border-[#ECE7DD] bg-white p-7 shadow-[0_4px_20px_-8px_rgba(29,41,57,0.12)] transition-shadow duration-300 hover:shadow-[0_14px_30px_-12px_rgba(29,41,57,0.22)] md:min-w-0"
                >
                  <p className="mb-6 text-sm font-black text-[#E8C165]">
                    {feature.number}
                  </p>
                  <Icon className="mb-5 text-[#1E5D46]" size={30} />
                  <h3 className="mb-3 text-xl font-bold text-[#1D2939]">
                    {feature.title}
                  </h3>
                  <p className="text-[#4B5768]">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      <section className="bg-[#E6EFE6] px-5 py-20 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="mx-auto max-w-6xl"
        >
          <motion.p
            variants={fadeUp}
            className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#1E5D46]"
          >
            Student Experience
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mb-10 text-3xl font-extrabold text-[#1D2939] md:text-5xl"
          >
            Hear From Our Students
          </motion.h2>
          <div className="homepage-mobile-carousel -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0">
            {[
              {
                quote:
                  "Before using AsiatechSync, I wasn't sure where to start looking for internship opportunities. The platform made everything easier by showing opportunities that matched my interests and skills. It helped me discover a company where I gained valuable hands-on experience and built confidence in my career path.",
                attribution: "BS Information Technology Student",
              },
              {
                quote:
                  "What I liked most about AsiatechSync was having everything in one place. I could explore opportunities, review company information, and submit applications without jumping between different websites. The experience helped me prepare for professional work and improved my communication and application skills.",
                attribution: "OJT Student",
              },
              {
                quote:
                  "AsiatechSync gave me access to opportunities I might not have found on my own. Through the platform, I connected with an industry partner that allowed me to apply what I learned in the classroom to real-world projects. It was an important step in building my professional experience and career goals.",
                attribution: "Internship Applicant",
              },
            ].map((testimonial) => (
              <motion.div
                key={testimonial.attribution}
                variants={fadeUp}
                whileHover={
                  prefersReducedMotion ? undefined : { y: -7, scale: 1.02 }
                }
                className="min-w-[84%] snap-center rounded-2xl border border-white/60 bg-white/45 p-7 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/60 md:min-w-0"
              >
                <p className="mb-8 text-[#4B5768]">“{testimonial.quote}”</p>
                <p className="text-sm font-bold text-[#1E5D46]">
                  — {testimonial.attribution}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="opportunities" className="px-5 py-20 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="mx-auto max-w-6xl"
        >
          <motion.div
            variants={fadeUp}
            className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end"
          >
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#1E5D46]">
                Explore Your Path
              </p>
              <h2 className="text-3xl font-extrabold text-[#1D2939] md:text-5xl">
                Opportunities Are Waiting
              </h2>
            </div>
            <a
              href="/jobs"
              className="inline-flex items-center gap-2 font-bold text-[#1E5D46]"
            >
              Explore Opportunities <ArrowRight size={17} />
            </a>
          </motion.div>
          <div className="homepage-mobile-carousel -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
            {OPPORTUNITIES.map((opportunity) => {
              const Icon = opportunity.icon;
              return (
                <motion.div
                  key={opportunity.title}
                  variants={fadeUp}
                  whileHover={
                    prefersReducedMotion ? undefined : { y: -7, scale: 1.02 }
                  }
                  className="min-w-[84%] snap-center rounded-2xl border border-[#ECE7DD] bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md md:min-w-0"
                >
                  <Icon className="mb-6 text-[#1E5D46]" size={32} />
                  <h3 className="mb-2 text-xl font-bold text-[#1D2939]">
                    {opportunity.title}
                  </h3>
                  <p className="text-[#4B5768]">{opportunity.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      <section
        id="partners"
        className="bg-[#0F3D2E] px-5 py-20 text-white sm:px-8 lg:px-12"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="mx-auto max-w-6xl"
        >
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#E8C165]">
              For Our Industry Partners
            </p>
            <h2 className="mb-5 text-3xl font-extrabold md:text-5xl">
              Partner With ASIATECH
            </h2>
            <p className="mb-3 text-xl text-white/90">
              Your company can help shape the next generation of professionals.
            </p>
            <p className="mb-8 text-lg leading-relaxed text-white/70">
              Connect with motivated ASIATECH students and discover potential
              OJT trainees, interns, and future employees through AsiatechSync.
            </p>
            <button
              type="button"
              onClick={openPartnerSignup}
              className="inline-flex items-center gap-2 rounded-full bg-[#E8C165] px-7 py-3.5 font-bold text-[#0F3D2E] transition duration-200 hover:-translate-y-1 hover:scale-[1.03] hover:bg-[#DEB24E] hover:shadow-md active:scale-[0.98]"
            >
              Become a Partner <ArrowRight size={17} />
            </button>
          </div>
        </motion.div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="mx-auto max-w-6xl"
        >
          <motion.div variants={fadeUp} className="mb-10">
            <h2 className="text-3xl font-extrabold text-[#1D2939] md:text-5xl">
              Why Partner With Us?
            </h2>
          </motion.div>
          <div className="homepage-mobile-carousel -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4 md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0">
            {PARTNER_BENEFITS.map(([title, description]) => (
              <motion.div
                variants={fadeUp}
                key={title}
                whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="min-w-[84%] snap-center flex gap-4 rounded-2xl border border-[#ECE7DD] bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md md:min-w-0"
              >
                <CheckCircle
                  className="mt-1 shrink-0 text-[#1E5D46]"
                  size={23}
                />
                <div>
                  <h3 className="mb-2 text-xl font-bold text-[#1D2939]">
                    {title}
                  </h3>
                  <p className="text-[#4B5768]">{description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="school" className="bg-[#E6EFE6] px-5 py-20 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-center"
        >
          <div className="flex justify-center rounded-[28px] bg-white/45 p-8">
            <img
              src="/system-logo/Asiatech%20Seal.png"
              alt="ASIATECH school seal"
              loading="lazy"
              decoding="async"
              className="h-44 w-full object-contain"
            />
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#1E5D46]">
              About ASIATECH
            </p>
            <h2 className="mb-5 text-3xl font-extrabold text-[#1D2939] md:text-5xl">
              About Asia Technological School of Science and Arts
            </h2>
            <p className="mb-6 text-lg leading-relaxed text-[#4B5768]">
              Asia Technological School of Science and Arts is the institution
              behind AsiatechSync, supporting students in their academic journey
              and preparing them for opportunities beyond the classroom.
            </p>
            <div className="space-y-3 text-[#1D2939]">
              <a
                className="flex items-center gap-2 font-bold text-[#1E5D46]"
                href="https://asiatech.edu.ph"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} /> Official ASIATECH Website
              </a>
              <a
                className="flex items-center gap-2 font-bold text-[#1E5D46]"
                href="https://www.facebook.com/ASIATECHOfficial"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} /> ASIATECH Official Facebook
              </a>
              <p className="flex items-start gap-2">
                <MapPin className="mt-1 shrink-0 text-[#1E5D46]" size={17} />
                1506 National Highway, Brgy. Dila, City of Santa Rosa, Laguna,
                Philippines
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="px-5 py-24 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="mx-auto max-w-4xl text-center"
        >
          <h2 className="mb-5 text-3xl font-extrabold text-[#1D2939] md:text-5xl">
            Your Next Opportunity Starts Here.
          </h2>
          <p className="mx-auto mb-9 max-w-2xl text-lg leading-relaxed text-[#4B5768]">
            Whether you're a student looking for your next opportunity or a
            company looking for future talent, AsiatechSync is here to connect
            you.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/jobs"
              className="rounded-full bg-[#E8C165] px-7 py-3.5 font-bold text-[#0F3D2E] transition duration-200 hover:-translate-y-1 hover:scale-[1.03] hover:bg-[#DEB24E] hover:shadow-md active:scale-[0.98]"
            >
              Find Opportunities
            </a>
            <button
              type="button"
              onClick={openPartnerSignup}
              className="rounded-full border-2 border-[#1E5D46] px-7 py-3.5 font-bold text-[#1E5D46] transition duration-200 hover:-translate-y-1 hover:scale-[1.03] hover:bg-[#1E5D46]/5 hover:shadow-md active:scale-[0.98]"
            >
              Become a Partner
            </button>
          </div>
        </motion.div>
      </section>

      <footer
        id="contact"
        className="scroll-mt-24 bg-[#0F3D2E] px-5 py-14 text-white sm:px-8 lg:px-12"
      >
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
          <div>
            <p className="mb-3 text-xl font-black">ASIATECHSYNC</p>
            <p className="text-white/70">
              Connecting Students. Empowering Opportunities. Building Futures.
            </p>
          </div>
          <div>
            <p className="mb-4 font-bold">Quick Links</p>
            <div className="grid grid-cols-2 gap-3 text-sm text-white/70">
              <a href="#about">About Us</a>
              <Link to="/jobs">Opportunities</Link>
              <a href="#opportunities">Student Experiences</a>
              <a href="#partners">For Companies</a>
              <a href="#contact">Contact</a>
            </div>
          </div>
          <div>
            <p className="mb-4 font-bold">Contact Us</p>
            <a
              className="mb-3 block text-sm text-white/70"
              href="mailto:asiatechsync@gmail.com"
            >
              asiatechsync@gmail.com
            </a>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-white">
              Website
            </p>
            <a
              className="mb-4 block text-sm text-white/70"
              href="https://asiatech.edu.ph"
              target="_blank"
              rel="noreferrer"
            >
              Official ASIATECH Website
            </a>
            <a
              className="mb-3 block text-sm text-white/70"
              href="https://www.facebook.com/ASIATECHOfficial"
              target="_blank"
              rel="noreferrer"
            >
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-white">
                Facebook
              </span>
              Official ASIATECH Facebook
            </a>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-white">
              Address
            </p>
            <p className="flex items-start gap-2 text-sm text-white/70">
              <MapPin className="mt-1 shrink-0" size={15} />
              1506 National Highway, Brgy. Dila, City of Santa Rosa, Laguna,
              Philippines
            </p>
          </div>
          <div>
            <p className="mb-2 font-bold">Send a Concern</p>
            <p className="mb-4 text-xs text-white/70">
              Send your concern directly to the admin office.
            </p>
            <form onSubmit={submitConcern} className="space-y-2">
              {user ? (
                <p className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/80">
                  Sending as {user.fullName} ({user.email})
                </p>
              ) : (
                <>
                  <input
                    required
                    type="text"
                    minLength={2}
                    maxLength={160}
                    className="w-full rounded-lg px-3 py-2 text-sm text-navy"
                    placeholder="Your name"
                    value={concern.name}
                    onChange={(event) =>
                      setConcern({ ...concern, name: event.target.value })
                    }
                  />
                  <input
                    required
                    type="email"
                    className="w-full rounded-lg px-3 py-2 text-sm text-navy"
                    placeholder="Your email address"
                    value={concern.email}
                    onChange={(event) =>
                      setConcern({ ...concern, email: event.target.value })
                    }
                  />
                </>
              )}
              <textarea
                required
                minLength={10}
                maxLength={3000}
                className="min-h-24 w-full rounded-lg px-3 py-2 text-sm text-navy"
                placeholder="Your concern"
                value={concern.message}
                onChange={(event) =>
                  setConcern({ ...concern, message: event.target.value })
                }
              />
              <button
                disabled={concernBusy}
                className="w-full rounded-lg bg-[#E8C165] px-3 py-2 text-xs font-bold text-[#0F3D2E]"
              >
                {concernBusy ? "Sending..." : "Send concern"}
              </button>
              <label className="flex items-start gap-2 text-[11px] text-white/70">
                <input
                  type="checkbox"
                  required
                  checked={concernConsent}
                  onChange={(event) => setConcernConsent(event.target.checked)}
                  className="mt-0.5"
                />
                <span>I agree to the site’s privacy and legal terms.</span>
              </label>
              {concernStatus && (
                <p className="text-xs text-white/80">{concernStatus}</p>
              )}
            </form>
          </div>
        </div>
        <p className="mx-auto mt-12 max-w-6xl border-t border-white/15 pt-6 text-sm text-white/65">
          © 2026 ASIATECH SYNC. Connecting talent with opportunity.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
